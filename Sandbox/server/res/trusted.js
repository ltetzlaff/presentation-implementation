// ---  DEV API  ---
// window.navigator.presentation = new Presentator();

/**
 * Custom class that opens the API to the user (dev)
 * 6.4.4 Monitor list of available presentation displays
 * https://w3c.github.io/presentation-api/#dfn-monitor-the-list-of-available-presentation-displays
 */
class Presentator extends Presentation {
  constructor() {
    super();
    this.monitoring = false;
    
    // These shall be set by ._set() during configure(), auto-reject if they are mandatory
    this.monitorHandler = () => Promise.reject();
    this.connectHandler = () => Promise.reject();
    this.sendHandler    = () => Promise.reject();
    this.receiveHandler = () => Promise.reject();
    this.hostHandler    = () => Promise.resolve();
    
    // https://w3c.github.io/presentation-api/#dfn-set-of-controlled-presentations
    this.controlledPresentations = [];
    
    /**
     * Allowed by user
     */
    this.allowed = Browser.getDiscoveryAllowance();
    this.SCAN_PERIOD = 10e3;
    
    /**
     * 6.4.1
     * https://w3c.github.io/presentation-api/#dfn-set-of-availability-objects
     * [{A: {AvailabilityObject}, urls: [url]}]
     */
    this.availabilityObjects = [];
      
      
    /**
     * 6.4.2
     * [{availabilityUrl, display}]
     */
    this.availablePresentationDisplays = [];

    // Continous Monitoring
    if (this.allowed == DiscoveryAllowance.continous) {
      setInterval(this.monitor(this.defaultRequest), this.SCAN_PERIOD);
    }
    
    /**
     * Technically possible because there wer a monitorHandler attached
     */
    this.possible = false;
  }
  
  /**
   * 6.4.4 Monitoring the list of available presentation Displays
   * theres been a major Rework in https://github.com/w3c/presentation-api/commit/0c800c5c5bee2573735e4b75b117bca77937a0d9
   * @param {PresentationRequest} pr
   * @return {Promise}
   */
  monitor(pr) {
    this.monitoring = true;
    let availabilitySet = this.availabilityObjects || [];// 1.
    
    if (this.pendingSelection && pr.presentationDisplayAvailability === null) { // 2.
      let A = new PresentationAvailability();                                // 2.1
      availabilitySet.push({A: A, urls: pr.presentationUrls});        // 2.2
    }
    
    let newDisplays = [];                                 // 3.
    if (this.possible && this.allowed) {                  // 4.
      this.monitorHandler().then((displays) => {          // 5.
        newDisplays = displays;
//        console.log("displays:", displays);
        /*console.log("availabilitySet:", availabilitySet);
        console.log("availabilityObj:", this.availabilityObjects);*/
        this.availablePresentationDisplays = [];          // 6.
//        console.log(availabilitySet);
        availabilitySet.forEach(availability => {         // 7.
          let previousAvailability = availability.A.value;  // 7.1
          let newAvailability = false;                      // 7.2
//          console.log(availability);
          availability.urls.forEach(availabilityUrl => {    // 7.3.
            newDisplays.forEach(display => {                  // 7.3.1.
              // #TODO somehow check if display is an available presentation display
              // For each display in newDisplays, if display is an available presentation display for availabilityUrl, then run the following steps
              let tuple = {availabilityUrl, display};
              if (!includes(this.availablePresentationDisplays, tuple)) {
                this.availablePresentationDisplays.push(tuple); // 7.3.1.1.
                console.log("new display detected: ", tuple);
              }
              this.monitoring = false;
              newAvailability = true;                           // 7.3.1.2

              // #TODO 7.4 and 7.5
              // https://w3c.github.io/presentation-api/#monitoring-the-list-of-available-presentation-displays

            });
          });
        });
      });
    } else {
      this.monitoring = false;
    }
  }
  
  urlsTest(urls) {
    //return this.availablePresentationDisplays.some(apd => includes(urls, apd.availabilityUrl));
    return this.availablePresentationDisplays.some(apd => {
      // for at least 1 availablePresentationDisplay out of the given urls at least 1 matches
      return urls.some(url => url.href === apd.availabilityUrl.href);
    });
  }
  
  /**
   * 6.5.2.4
   * Using an implementation specific mechanism, transmit the contents of messageOrData as the presentation message data and messageType as the presentation message type to the destination browsing context.
   * @param {PresentationMessageType} presentationMessageType
   * @param {string|binary} presentationMessageData
   */
  send(presentationMessageType, presentationMessageData) {
    // example: {string: 'Hello, world!', lang: 'en-US'}") from https://w3c.github.io/presentation-api/#passing-locale-information-with-a-message
    return this.sendHandler(presentationMessageType, presentationMessageData);
  }
  
  /**
   * 6.3.2. 8-10. https://w3c.github.io/presentation-api/#selecting-a-presentation-display
   * @param {Array} presentationUrls
   * @return {Promise}
   */
  letUserSelectDisplay(presentationUrls) {
    this.pendingSelection = true;
    return this.getUserPermission()
    .catch(() => {
      // 10.
      this.pendingSelection = true;
      throw new DOMException(DOMException.NOT_ALLOWED_ERROR);
    })
    .then(v => {
       return this.getUserSelectedDisplay(presentationUrls);
    });
  }
  
  /**
   * If starting display connection is allowed
   * @return {Promise}
   */
  getUserPermission() {
    return new Promise((resolve, reject) => {
      if (this.allowed) {
        resolve(this.allowed);
      } else {
        console.warn("Asking for User Permission not allowed")
        reject();
      }
    });
  }
  
  /**
   * 6.3.2 9.
   * Let user select display and return it
   * @param {Array} presentationUrls
   * @return {Promise}
   */
  getUserSelectedDisplay(presentationUrls) {
    return new Promise((resolve, reject) => {
      let empty = this.availablePresentationDisplays.length === 0; // #TODO add check if currently monitoring etc => "stays empty"
      let couldConnectToAnUrl = this.urlsTest(presentationUrls);
//      console.log(this.availablePresentationDisplays, presentationUrls);
      if (empty || !couldConnectToAnUrl) {
        reject(new DOMException(DOMException.NOT_FOUND_ERROR));
      } else {
        // Ask user which display shall be taken
        let D = this.selectDisplayHandler(this.availablePresentationDisplays);
        this.pendingSelection = false;
        console.log(D);
        resolve(D);
      }
    });
  }
  
  /**
   * 6.3.4 https://w3c.github.io/presentation-api/#dfn-start-a-presentation-connection
   * @param {PresentationRequest} presentationRequest
   * @param {PresentationDisplay} D
   * @param {Promise} P - gets resolved with new PresentationConnection
   */
  startPresentationConnection(presentationRequest, D, P) {
    console.log("starting Connection to: ", D);
    let I = guid(); // 1. #TODO check for collision if this goes into production
    let presentationUrls = presentationRequest.presentationUrls; // 4.
    let pUrl = "";

    // 5.
    presentationUrls.some(presentationUrl => {
      if (this.availablePresentationDisplays.find(apd => apd.presentationUrl === presentationUrl)) {
        pUrl = presentationUrl.toString(); // #TODO check if toString is appropriate
        return true;
      }
    });
    
    let S = new PresentationConnection(I, pUrl); // 2., 3., 6.
    this.controlledPresentations.push(pc); // 7.
    if (P) {
      P.resolve(S); // 8.
    }

    // 9. #TODO trusted event
    // Queue a task to fire a trusted event with the name connectionavailable, that uses the PresentationConnectionAvailableEvent interface, with the connection attribute initialized to S, at presentationRequest. The event must not bubble, must not be cancelable, and has no default action.

    // 10.

    S.establish(); // 13.
  }
  
  /**
   * #TODO i dont get how to implement this as js uses reference-count garbage collection which cant be overridden or hooked into
   * @param {PresentationAvailability} A
   */
  gc(A) {
    this.availabilityObjects = this.availabilityObjects.filter(aO => aO === A);
    if (this.availabilityObjects.length === 0) {
      // #TODO cancel any pending task to monitor the list of available presentation displays for power saving purposes, and set the list of available presentation displays to the empty list.
      // somehow resolve the monitor() promise
      this.availablePresentationDisplays = [];
    }
  }
  
  /**
   * 6.5.1
   * The mechanism that is used to present on the remote display and connect the controlling browsing context with the presented document is an implementation choice of the user agent. The connection must provide a two-way messaging abstraction capable of carrying DOMString payloads in a reliable and in-order fashion.
   */
  connect(id, url) {
    return this.connectHandler(id, url)/*.then(success => {
      if (this.receiver !== null) {
        this.receiver.handleClient(id, url);
      }
      return true;
    })*/;
  }
  
  /**
   * Notify other party to close the connection
   * @param {PresentationConnectionClosedReasons} reason
   */
  close(reason) {
    return this.closeHandler(reason);
  }
  
  /**
   * Configure API
   * "Implementation-specific" part in spec
   * @param {ImplementationConfig} ic
   */
  configure(ic) {
    console.log("loaded Implementation: " + ic.name);
    // #HACK faster than looking up proper reflection, ES6 assign doesnt take over methods ¯\_(ツ)_/¯
    ["monitor", "selectDisplay", "connect", "send", "receive", "close", "host"].forEach(h => {
      let handler = h + "Handler";
      this._set(handler, ic[handler]);
    });
  }
  
  /**
   * That's how the DeviceDiscovery shall work
   * @param {Function<Promise>} handlerFct
   */
  _set(handlerName, handlerFct) {
    /*if (!(handlerFct && handlerFct.then)) {
      console.log(handlerName, handlerFct, handlerFct.then)
      throw new DOMException(DOMException.TYPE_ERROR);
    }*/
    this[handlerName] = handlerFct;
    if (handlerName === "connectHandler") {
      this.possible = true;
    }
  }
}

class ImplementationConfig {
  /**
   * @param {String}  name          - human readable name
   * @param {Promise} monitor       - how do you seek out for new displays,
   * @param {Promise} selectDisplay - select them,
   * @param {Promise} connect       - connect to them,
   * @param {Promise} send          - send messages to them,
   * @param {Promise} receive       - receive messages
   * @param {Promise} close         - notify them to close connection
   *
   * @param {Promise} host          - optional, what happens if you instantiate a new receiver (tell some server maybe?)
   */
  constructor(name, handlers) {
    this.name                 = name;
    this.monitorHandler       = handlers.monitor;
    this.selectDisplayHandler = handlers.selectDisplay;
    this.connectHandler       = handlers.connect;
    this.sendHandler          = handlers.send;
    this.receiveHandler       = handlers.receive;
    this.closeHandler         = handlers.close;
    this.hostHandler          = handlers.host;
  }
}