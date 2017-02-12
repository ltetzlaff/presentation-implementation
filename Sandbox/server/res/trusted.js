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
    this.closing = false;

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
              let tuple = {availabilityUrl, display};
              //console.log(this.availablePresentationDisplays, tuple);
              if (!includes(this.availablePresentationDisplays, tuple)) {
                this.availablePresentationDisplays.push(tuple); // 7.3.1.1.
                //console.log("display detected: ", tuple);
              }
              this.monitoring = false;
              newAvailability = true;                           // 7.3.1.2
            });
          });

          if (!availability.A.value) {
            availability.A.value = newAvailability;         // 7.4
          }

          if (previousAvailability !== newAvailability) {
            queueTask(() => {                               // 7.5
              availability.A.value = newAvailability;
              fire(new Event("change"), availability.A);
            });
          }
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
   * @param {string} id
   * @param {Role} role
   */
  send(id, sessionId, role, presentationMessageType, presentationMessageData) {
    // example: {string: 'Hello, world!', lang: 'en-US'}") from https://w3c.github.io/presentation-api/#passing-locale-information-with-a-message
    return this.sendHandler(id, sessionId, role, presentationMessageType, presentationMessageData);
  }
  
  /**
   * 6.3.2.8-9. https://w3c.github.io/presentation-api/#selecting-a-presentation-display
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
   * 6.3.2.9
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
        reject(domEx("NOT_FOUND_ERROR", "no available Presentation Displays"));
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
   * @param {Function} P - resolve-function of Promise, gets resolved with new PresentationConnection
   */
  startPresentationConnection(presentationRequest, D, P) {
    console.log("starting Connection to: ", D);
    let I = guid();
    let presentationUrls = presentationRequest.presentationUrls; // 4.
    let pUrl = "";

    // 5.
    presentationUrls.some(presentationUrl => {
      if (this.availablePresentationDisplays.find(apd => apd.availabilityUrl === presentationUrl)) {
        pUrl = presentationUrl.toString();
        return true;
      }
    });

    let S = new PresentationConnection(I, pUrl, Role.Controller, guid()); // 2., 3., 6.
    this.controlledPresentations.push(S); // 7.
    
    // 8.
    P(S);

    // 9.
    queueTask(() => {
      let event = new PresentationConnectionAvailableEvent("connectionavailable", {connection: S});
      fire(event, presentationRequest);
    })

    // 10.+ 12.
    this.createContextHandler(D, pUrl, I, S.sessionId)
    .catch(() => S.close(PresentationConnectionClosedReasons.error, "Creation of receiving context failed.")) /* 11. */
    .then (() => S.establish()); /* 13. */
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
  connect(id, sessionId, role) {
    this.closing = false;
    return this.connectHandler(id, sessionId, role);
  }
  
  /**
   * Reconnect to presentation
   * https://w3c.github.io/presentation-api/#reconnecting-to-a-presentation
   * @param {PresentationConnection} presentationConnection
   * @param {PresentationConnectionClosedReasons} closeReason
   * @param {string} closeMessage
   */
  reconnect(presentationRequest, I) {
    return new Promise((resolve, reject) => {
      // 3.
      let existingConnection = this.controlledPresentations.find((connection) => {
                                // TODO: Its controlling browsing context is the current browsing context
                                connection.state != PresentationConnectionState.terminated &&
                                presentationRequest.presentationUrls.find(url => connection.url == url.toString()) !== undefined &&
                                connection === I
                              });
      // 4. -> 1.
      if(existingConnection !== undefined){
        resolve(existingConnection);  // 2.
        // 3.
        if(existingConnection.state == PresentationConnectionState.connecting || PresentationConnectionState.connected){
          return;
        }
        // 4.
        existingConnection.state = PresentationConnectionState.connecting;
        PresentationConnectionState.establish();
        return;
      }

      existingConnection = this.controlledPresentations.find((connection) => {
                                // TODO: Its controlling browsing context is not the current browsing context
                                connection.state != PresentationConnectionState.terminated &&
                                presentationRequest.presentationUrls.find(url => connection.url == url.toString()) !== undefined &&
                                connection === id
                              });
      if(existingConnection !== undefined){
        let newConnection = new PresentationConnection(I, existingConnection.url, Role.Controller, guid()); // 2. 3., 4.  
        newConnection.state = state = PresentationConnectionState.connecting; // 5.
        this.controlledPresentations.push(S); // 6.
        resolve(newConnection); // 7.
        // 8.
        queueTask(() => {
          let event = new PresentationConnectionAvailableEvent("connectionavailable", {connection: newConnection});
          fire(event, presentationRequest);
        });
        newConnection.establish();  // 9.
        return;
      }
      reject(new NotFoundError());  // 7.
    }); 
  }
  
  /**
   * Notify other party to close the connection
   * https://w3c.github.io/presentation-api/#dfn-close-a-presentation-connection
   * @param {PresentationConnection} presentationConnection
   * @param {PresentationConnectionClosedReasons} closeReason
   * @param {string} closeMessage
   */
  close(presentationConnection, closeReason, closeMessage) {
    if (this.closing) {
      return; // 1.
    }
    queueTask(() => { // 2.
      this.closing = true;
      let states = [
        PresentationConnectionState.closed,
        PresentationConnectionState.connecting,
        PresentationConnectionState.connected
      ];
      if (!(includes(states, presentationConnection.state))) {
        return; // 2.1.
      }
      if (presentationConnection.state !== PresentationConnectionState.closed) {
        presentationConnection.state = PresentationConnectionState.closed; // 2.2.
      }
      let event = new PresentationConnectionCloseEvent("close", new PresentationConnectionCloseEventInit(closeReason, closeMessage));
      fire(event, presentationConnection);
    });
    return this.closeHandler(presentationConnection, closeReason, closeMessage);
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
      this[handler] = ic[handler];
    });

    this.possible = true;
    this.refreshContinousMonitoring();
  }
}

class ImplementationConfig {
  /**
   * @param {String}  name                      - human readable name of the implementation setup
   * @param {Function<Promise>} monitor         - how do you seek out for new displays,
   * @param {Function<Promise>} selectDisplay   - [C] select them,
   * @param {Function<Promise>} createContext   - [C] connect to them,
   * @param {Function<Promise>} connect         - connect to them,
   * @param {Function<Promise>} send            - send messages to them,
   * @param {Function<Promise>} close           - notify them to close connection
   * @param {Function<Promise>} monitorIncoming - [R] what to set up to be able to handle incoming connections
   * @param {Function<Promise>} messageIncoming - what to set up to be able to handle incoming messages
   *
   * @param {Function<Promise>} host            - [R] optional, what happens if you instantiate a new receiver (tell some server maybe?)
   */
  constructor(name, handlers) {
    this.name                 = name;
    ImplementationConfig.Handlers().forEach(h => {
      let handler = h + "Handler";
      this[handler] = handlers[h];
    });
  }

  static Handlers() {
    return ["monitor", "selectDisplay", "createContext", "connect", "send", "close", "host", "monitorIncoming", "messageIncoming"];
  }
}