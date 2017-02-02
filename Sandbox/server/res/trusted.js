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
    ImplementationConfig.Handlers().forEach(h => {
      let handler = h + "Handler";
      switch (h) {
        case "host":
          this[handler] = () => Promise.resolve();
          break;
        default:
          this[handler] = () => Promise.reject();
          break;
      }
    });
    
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

    /**
     * Technically possible because there was a monitorHandler attached
     */
    this.possible = false;
    this.refreshContinousMonitoring();
  }

  refreshContinousMonitoring() {
    // Continous Monitoring
    if (this.continousMonitoring) {
      clearInterval(this.continousMonitoring);
    }
    if (this.allowed == DiscoveryAllowance.continous) {
      this.continousMonitoring = setInterval(() => {this.monitor(this.defaultRequest)}, this.SCAN_PERIOD);
    }
  }
  
  /**
   * 6.4.4 Monitoring the list of available presentation Displays
   * theres been a major Rework in https://github.com/w3c/presentation-api/commit/0c800c5c5bee2573735e4b75b117bca77937a0d9
   * @param {PresentationRequest} pr
   * @return {Promise}
   */
  monitor(pr) {
    console.log("monitoring");
    this.monitoring = true;
    let availabilitySet = this.availabilityObjects || [];// 1.
    
    if (this.pendingSelection && pr && pr.presentationDisplayAvailability === null) { // 2.
      let A = new PresentationAvailability();                                // 2.1
      availabilitySet.push({A: A, urls: pr.presentationUrls});        // 2.2
    }
    
    let newDisplays = [];                                 // 3.
    if (this.possible && this.allowed) {                  // 4.
      return this.monitorHandler().then((displays) => {          // 5.
        newDisplays = displays;
        this.availablePresentationDisplays = [];          // 6.
        availabilitySet.forEach(availability => {         // 7.
          let previousAvailability = availability.A.value;  // 7.1
          let newAvailability = false;                      // 7.2
          // console.log(availability);
          availability.urls.forEach(availabilityUrl => {    // 7.3.
            newDisplays.forEach(display => {                  // 7.3.1.
              // #TODO somehow check if display is an available presentation display
              // For each display in newDisplays, if display is an available presentation display for availabilityUrl, then run the following steps
              let tuple = {availabilityUrl, display};
              //console.log(this.availablePresentationDisplays, tuple);
              if (!includes(this.availablePresentationDisplays, tuple)) {
                this.availablePresentationDisplays.push(tuple); // 7.3.1.1.
                //console.log("display detected: ", tuple);
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
      return Promise.reject();
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
      throw domEx("NOT_ALLOWED_ERROR");
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
      //console.log(empty, !couldConnectToAnUrl);
      if (empty || !couldConnectToAnUrl) {
        reject(domEx("NOT_FOUND_ERROR"));
      } else {
        // Ask user which display shall be taken
        let displays = this.availablePresentationDisplays.map(apd => apd.display);
        let D = this.selectDisplayHandler(displays);
        this.pendingSelection = false;
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
    let I = D.id;
    let presentationUrls = presentationRequest.presentationUrls; // 4.
    let pUrl = "";

    // 5.
    presentationUrls.some(presentationUrl => {
      if (this.availablePresentationDisplays.find(apd => apd.availabilityUrl === presentationUrl)) {
        pUrl = presentationUrl.toString();
        return true;
      }
    });

    let S = new PresentationConnection(I, pUrl); // 2., 3., 6.
    this.controlledPresentations.push(S); // 7.
    
    // 8. (see comment below)
    //P.resolve(S); // this syntax is not supported so i wrapped the call to this function in a resolve and just return something to resolve to at the end of this
    

    // 9. #TODO trusted event
    // Queue a task to fire a trusted event with the name connectionavailable, that uses the PresentationConnectionAvailableEvent interface, with the connection attribute initialized to S, at presentationRequest. The event must not bubble, must not be cancelable, and has no default action.

    // 10.+ 12.
    this.createContextHandler(pUrl)
    .catch(() => S.close(PresentationConnectionClosedReasons.error, "Creation of receiving context failed.")) /* 11. */
    .then (() => S.establish()); /* 13. */
    
    // 8.
    if (P) {
      return S;
    } else {
      return false;
    }
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
    ImplementationConfig.Handlers().forEach(h => {
      let handler = h + "Handler";
      this._set(handler, ic[handler]);
    });
  }
  
  /**
   * That's how the DeviceDiscovery shall work
   * @param {Function<Promise>} handlerFct
   */
  _set(handlerName, handlerFct) {
    this[handlerName] = handlerFct;
    if (handlerName === "connectHandler") {
      this.possible = true;
      this.refreshContinousMonitoring();
    }
  }
}

class ImplementationConfig {
  /**
   * @param {String}  name          - human readable name of the implementation setup
   * @param {Promise} monitor       - how do you seek out for new displays,
   * @param {Promise} selectDisplay - select them,
   * @param {Promise} createContext - connect to them,
   * @param {Promise} connect       - connect to them,
   * @param {Promise} send          - send messages to them,
   * @param {Promise} receive       - receive messages
   * @param {Promise} close         - notify them to close connection
   *
   * @param {Promise} host          - optional, what happens if you instantiate a new receiver (tell some server maybe?)
   */
  constructor(name, handlers) {
    this.name                 = name;
    ImplementationConfig.Handlers().forEach(h => {
      let handler = h + "Handler";
      this[handler] = handlers[h];
    });
  }

  static Handlers() {
    return ["monitor", "selectDisplay", "createContext", "connect", "send", "receive", "close", "host"];
  }
}