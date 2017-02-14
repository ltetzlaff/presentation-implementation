let pr = null;

class BrowsingContextConnector {
  constructor() {
    this.childBrowsingContexts = [];
  }


  tellContext(data, context) {
    context.contentWindow.postMessage(data, location.origin)
  }

  receiveMessage(event) {
    if (!this.childBrowsingContexts.some(cbc => cbc.contentWindow === event.source)) {
      return; // i dont know this child
    }
      // #TODO test if this works
    
    let data = event.data;
    let input = data.input;

    // Input Objects have to be serialized
    /*for (let subobj in input) {
      deserializeClass(input[subobj]);
    }*/

    for (let subobj in input) {
      /*let objectId = input[subobj].objectId;
      if (objectId) {
        input[subobj] = ua.objects[objectId];
      }*/
    }
    
    let output = null;
    switch (data.command) {
      case "constructPresentationRequest":
        // 6.3.1
        pr = new PresentationRequest(input.urls);
        //ua.objects[input.objectId] = pr;
        output = pr;
        break;
      case "selectPresentationDisplay":
        // 6.3.2
        //output = input.presentationRequest.start();
        output = pr.start();
        break;
      case "startDefaultPresentationRequest":
        // 6.3.3
        PresentationRequest.startDefault(input.W, input.presentationRequest, input.D);
        break;
      case "getAvailability":
        // 6.4.3
        //output = input.presentationRequest.getAvailability();
        output = pr.getAvailability();
        break;
      case "reconnect":
        // 6.3.5
        output = pr.reconnect(input.presentationId);
        break;
      case "send":
        // 6.5.2
        input.presentationConnection.send(input.data);
        break;
      case "closePresentationConnection":
        // 6.5.5
        input.presentationConnection.close(input.closeReason, input.closeMessage);
        break;
      case "terminatePresentationConnection":
        // 6.5.6
        input.presentationConnection.terminate();
        break;
      case "getConnectionList":
        // 6.6 accessor connectionList
        output = ua.getConnectionList();
        break;
      
      // #TODO more
    }

    switch (data.type) {
      case ReturnType.Promise:
        // Promises should later be         
        output
        .catch(reason => {
          event.source.postMessage({
            type: data.type,
            key: data.key,
            output: {
              deserializeTo: "Promise",
              state: PromiseState.rejected,
              value: reason
            }
          }, "*");
        })
        .then(value => {
          event.source.postMessage({
            type: data.type,
            key: data.key,
            output: {
              deserializeTo: "Promise",
              state: PromiseState.fulfilled,
              value: JSON.parse(JSON.stringify(value))
            }
          }, "*");
        });
        break;
    }
  }
}

class UserAgent extends BrowsingContextConnector {
  /**
   * @param {ImplementationConfig} ic
   */
  constructor(ic) {
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
    
    /**
     * These are needed if this user-agent shall be used as a R-UA
     */
    this.presentationControllers = []; // {[PresentationConnection]}
    this.controllersMonitor = null; // {PresentationConnectionList}
    this.controllersPromise = null; // {Promise<PresentationConnectionList>}

    /**
     * Apply ImplementationConfig
     */
    if (ic) {
      ic.configure(this);
    }
  }

  createControllingContext(controllerUrl) {
    let C = createContext(controllerUrl);
    C.onload = () => {
      C.contentWindow.postMessage("hi", "*");
    };
    
    this.childBrowsingContexts.push(C);
  }

  /**
   * 6.6.1 
   * actually there's a lot more #todo but i dont want to implement these steps by hand so lets use an iframe
   * https://w3c.github.io/presentation-api/#creating-a-receiving-browsing-context
   * @param {PresentationDisplay} D
   * @param {String} presentationUrl - the presentation request url (should be in D)
   * @param {String} presentationId - the presentation identifier (gets generated on creation)
   * @param {String} sessionId - identifier for the 1-1 relation of controller and receiver
   */
  createReceivingContext(D, presentationUrl, presentationId, sessionId) {
    // 1. - 11.
    let C = createContext(presentationUrl);
    C.addEventListener("message", ua.receiveMessage, false);
    this.childBrowsingContexts.push(C);
    
    // 12.
    this.monitorIncomingHandler(presentationId, presentationUrl, (I) => {
      this.handleClient(I, presentationId, presentationUrl, sessionId);
    });
    
    // Connect initiating controlling context
    this.handleClient(presentationId, presentationId, presentationUrl, sessionId);
  }

  getConnectionList() {
    if (this.controllersPromise !== null) {
      return this.controllersPromise;                                 // 1.
    } else {
      let temp = null;
      this.controllersPromise = new Promise((res, rej) => temp = res);// 2.
      this.controllersPromise.resolve = temp;

      if (this.controllersMonitor !== null) {
        this.controllersPromise.resolve(this.controllersMonitor);     // 4.
      }
      return this.controllersPromise;                                 // 3.
    }
  }

  /**
   * 6.7.1
   * https://w3c.github.io/presentation-api/#monitoring-incoming-presentation-connections
   * @param {String} I - the presentation identifier passed by the controlling browsing context with the incoming connection request
   * @param {String} this.presentationId - the presentation identifier used on context creation
   * @param {String} this.presentationUrl - the presentation request url used on context creation
   * @param {String} sessionId - identifier for the 1-1 relation of controller and receiver
   */
  handleClient(I, presentationId, presentationUrl, sessionId) {
    if (I !== presentationId) {
      return false;                                                 // 1.
    }
    let S = new PresentationConnection(I, presentationUrl, Role.Receiver, sessionId); // 2. - 4.
    S.establish().then(success => {                                 // 5. - 6.
      this.presentationControllers.push(S);                         // 7.
      if (this.controllersMonitor === null) {                       // 8.
        this.controllersMonitor = new PresentationConnectionList();   // 8.1
        this.controllersMonitor.connections = this.controllersMonitor.connections.concat(this.presentationControllers); // 8.2
        if (this.controllersPromise !== null) {
          this.controllersPromise.resolve(this.controllersMonitor);
        }
        return;
      } else {                                                      // 9.
        this.controllersMonitor.connections = this.controllersMonitor.connections.concat(this.presentationControllers); // 9.1
        queueTask(() => {
          let event = new PresentationConnectionAvailableEvent("connectionavailable", {connection: S});
          fire(event, this.controllersMonitor);
        });
      }
    });
  }

  refreshContinousMonitoring() {
    // Continous Monitoring
    if (this.continousMonitoring) {
      clearInterval(this.continousMonitoring);
    }
    if (this.allowed == DiscoveryAllowance.continous) {
      this.continousMonitoring = setInterval(() => {
        this.defaultRequest && this.defaultRequest.monitor()
      }, this.SCAN_PERIOD);
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
   * #TODO i dont get how to implement this as js uses reference-count garbage collection which cant be overridden or hooked into
   * @param {PresentationAvailability} A
   */
  /*gc(A) {
    this.availabilityObjects = this.availabilityObjects.filter(aO => aO === A);
    if (this.availabilityObjects.length === 0) {
      // #TODO cancel any pending task to monitor the list of available presentation displays for power saving purposes, and set the list of available presentation displays to the empty list.
      // somehow resolve the monitor() promise
      this.availablePresentationDisplays = [];
    }
  }*/
}