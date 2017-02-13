// Global scope of the user agent
const ua = new UserAgent();
window.addEventListener("message", ua.receiveMessage, false);


class BrowsingContextConnector {
  constructor() {
    this.childBrowsingContexts = [];
  }

  receiveMessage(event) {
    if (!includes(this.childBrowsingContexts, event.source.uac.contextId)) {
      return; // i dont know this child
      // #TODO test if this works
    }

    let data = event.data;
    let command = data.command;
    let input = data.input;
    for (let subobj of input) {
      deserializeClass(input[subobj]);
    }
    let output = null;

    switch (data.command) {
      case "registerMe":
        // save the identification reference to the child browsing context
        this.childBrowsingContexts.push(input.contextId);
        break;
      case "constructPresentationRequest":
        // 6.3.1
        output = new PresentationRequest(input.urls);
        break;
      case "selectPresentationDisplay":
        // 6.3.2
        output = input.presentationRequest.start();
        break;
      case "startDefaultPresentationRequest":
        // 6.3.3
        PresentationRequest.startDefault(input.W, input.presentationRequest, input.D);
        break;
      case "reconnect":
        // 6.3.5
        output = input.presentationRequest.reconnect(input.presentationId);
        break;
      // #TODO more
    }

    // Answer with output
    e.source.postMessage({output: serialize(output), key: data.key});
  }
}

class UserAgent extends BrowsingContextConnector {
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
   * Utility
   * @returns true if there's for at least 1 apd out of the given urls at least 1 match
   */
  urlsTest(urls) {
    return this.availablePresentationDisplays.some(apd => {
      return urls.some(url => url.href === apd.availabilityUrl.href);
    });
  }

  /**
   * 6.3.2.7-9. https://w3c.github.io/presentation-api/#selecting-a-presentation-display
   * @param {Array} presentationUrls
   * @return {Promise}
   */
  letUserSelectDisplay(presentationUrls) {
    this.pendingSelection = true;
    return new Promise((resolve, reject) => {
      if (this.allowed) {
        resolve(this.allowed);
      } else {
        console.warn("Asking for User Permission not allowed")
        reject();
      }
    })
    .catch(() => { // 10.
      this.pendingSelection = true;
      throw domEx("NOT_ALLOWED_ERROR");
    })
    .then(v => {
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

/**
   * Configure API
   * "Implementation-specific" part in spec
   * @param {ImplementationConfig} ic
   */
  configure(ic) {
    console.log("loaded Implementation: " + ic.name);
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