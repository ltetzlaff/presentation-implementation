const ReturnType = {
  Promise: "Promise",
  Event: "Event",
  void: "void",
  Sync: "Sync"
};
const PromiseState = {
  fulfilled: "fulfilled",
  rejected: "rejected",
  pending: "pending"
};
const Role = {
  Controller: 0,
  Receiver: 1
};
const PresentationConnectionState = {
  connecting: "connecting",
  connected: "connected",
  closed: "closed",
  terminated: "terminated"
};
const PresentationConnectionClosedReasons = {
  error: "error",
  closed: "closed",
  wentaway: "wentaway"
};
const PresentationMessageType = {
  binary: "binary",
  text: "text"
};
const BinaryType = {
  blob: "blob",
  arrayBuffer: "arrayBuffer"
};
const DiscoveryAllowance = {
  none: 0,      // must not discover
  manual: 1,    // may discover if initiated manually (powersave)
  continous: 2  // do what Bam Margera will do next
};

// 6.2
class Presentation {
  constructor() {
    // {PresentationRequest}
    this.defaultRequest = null;
    
    // {PresentationReceiver}
    this.receiver = null;
    
    Object.defineProperty(window.navigator, "presentation", {value: this})
  }
}

class PresentationConnectionList {
  constructor() {
    implement(this, EventTarget);
    addEventListeners(this, "connectionavailable");

    this.connections = [];
  }
}

/**
 * 6.4.5
 * https://w3c.github.io/presentation-api/#idl-def-presentationconnectionavailableevent
 */
class PresentationConnectionAvailableEvent extends Event {
  /**
   * @param {DOMString} type
   * @param {PresentationConnectionAvailableEventInit} eventInitDict - see https://w3c.github.io/presentation-api/#idl-def-presentationconnectionavailableeventinit {connection: {PresentationConnect}}
   */
  constructor(type, eventInitDict) {
    super(type);
    this.connection = eventInitDict.connection;
  }
}

/**
 * 6.5.4
 * https://w3c.github.io/presentation-api/#idl-def-presentationconnectioncloseevent
 */
class PresentationConnectionCloseEvent extends Event{
  /**
   * @param {DOMString} type
   * @param {PresentationConnectionCloseEventInit} init
   *  @param {String} init.reason
   *  @param {DOMString} init.message
   */
  constructor(type, init) {
    if (!init.reason || !Object.keys(PresentationConnectionClosedReasons).some(pccr => pccr === init.reason)) {
      throw new Error("Illegal close reason");
    }
  
    super(type);
    this.reason = init.reason;
    this.message = init.message;
  }
}

/**
 * 6.4 https://w3c.github.io/presentation-api/#interface-presentationavailability
 */
class PresentationAvailability {
  constructor(value) {
    implement(this, EventTarget);
    addEventListeners(this, "change");
    
    if (value !== undefined) {
      this.value = value;
    } else {
      this.value = false;
    }
  }
}

class PresentationConnection {
  /**
   * 6.5
   * https://w3c.github.io/presentation-api/#idl-def-presentationconnection
   * @param {String} id - presentation id
   * @param {String} url - presentation url
   * @param {Role} role
   * @param {String} sessionId - identifier for the 1-1 relation of controller and receiver
   * @param {PresentationConnectionState} state
   */
  constructor(id, url, role, sessionId) {
    implement(this, EventTarget);
    addEventListeners(this, ["connect", "close", "terminate", "message"]);

    // which role of the presentation connection are we on right now
    this.role = role;

    // to seperate the different connections
    this.sessionId = sessionId;

    // {presentation identifier}
    this.id = id;
    this.url = url;
    this.state = PresentationConnectionState.connecting;
        
    this.binaryType = BinaryType.arrayBuffer;
  }
  

  /**
   * 6.5.1
   * connect
   * @param {PresentationConnection} this
   * @return {Promise}
   */
  establish() {
    // 1.
    if (this.state !== PresentationConnectionState.connecting) {
      return Promise.reject("Establishing but not connecting, aborting..");
    }
    
    // 2.
    // Request connection of presentationConnection to the receiving browsing context. The presentation identifier of presentationConnection must be sent with this request.
    this.closing = false;
    return ua.connectHandler(this.id, this.sessionId, this.role)
    .catch(() => this.close(PresentationConnectionClosedReasons.error)) // 4.
    .then(() => {
      queueTask(() => {
        this.state = PresentationConnectionState.connected;   // 3.
        ua.messageIncomingHandler(this.sessionId, this.role,
          message => {
            this.receive(PresentationMessageType.text, message)
          });
        fire(new Event("connect"), this);
      });
    });
  }
  
  /**
   * 6.5.2
   * send message
   * @param {PresentationConnection} this
   * @param {payload data} messageOrData
   */
  send(messageOrData) {
    console.log("send:", messageOrData);
    if (this.state !== PresentationConnectionState.connected) {
      throw domEx("INVALID_STATE_ERROR"); // 1.
    }
    
    // 2.
    if (this.closing) {
      return;
    }
    
    // 3.
    let messageType = null;
    if (["ArrayBuffer", "ArrayBufferView", "Blob"].includes(messageOrData.constructor.name)) {
      messageType = PresentationMessageType.binary;
    } else if (messageOrData.constructor.name === "String") {
      messageType = PresentationMessageType.text;
    } else if (messageOrData.constructor.name === "Object") {
      messageType = PresentationMessageType.text;
      messageOrData = JSON.stringify(messageOrData);
    }
    if (!messageType) {
      throw new Error("Unsupported message Type in PresentationRequest.send");
    }
    
    ua.sendHandler(this.sessionId, this.role, messageType, messageOrData).catch(err => { // 4.
      this.close(PresentationConnectionClosedReasons.error, err); // 5.
    });
  }
  
  /**
   * 6.5.3
   * receive message
   * @param {PresentationConnection} this
   * @param {PresentationMessageType} messageType
   * @param {string|binary} messageData
   */
  receive(messageType, messageData) {
    console.log("received message: ", messageData);
    if (this.state !== PresentationConnectionState.connected) {
      return; // 1.
    }
  
    // 2.+3.
    let msgEventInit = {};
    //implement(msgEventInit, MessageEventInit); // this is not defined?
    switch (messageType) {
      case PresentationMessageType.text:
        msgEventInit.data = messageData;
        break;
      case PresentationMessageType.binary:
        if (this.binaryType == BinaryType.blob) {
          msgEventInit.data = new Blob(messageData);
        } else if (this.binaryType == BinaryType.arrayBuffer) {
          msgEventInit.data = new ArrayBuffer(messageData);
        } else {
          console.error("Malformed presentationConnection.binaryType");
        }
        break;
      default:
        console.error("Malformed messageType at presentationConnection.receive()");
        break;
    }
    
    let event = new MessageEvent("message", msgEventInit);
    queueTask(() => fire(event, this)); // 4.
  }
    
  /**
   * 6.5.5
   * https://w3c.github.io/presentation-api/#dfn-close-a-presentation-connection
   * @param {PresentationConnection} this
   * @param {PresentationConnectionClosedReasons} closeReason
   * @param {string} closeMessage
   */
  close(closeReason = PresentationConnectionClosedReasons.closed, closeMessage) {
    if (!(this.state == PresentationConnectionState.connecting ||
          this.state == PresentationConnectionState.connected)) {
      return;                                         // 1.
    }
    // Inverted following two because send relies on state being unclosed
    ua.closeHandler(this.sessionId, this.role, closeReason, closeMessage); // 3.
    this.state = PresentationConnectionState.closed;  // 2.
    if (closeReason != PresentationConnectionClosedReasons.wentaway) {
      // 4.
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
        if (!(includes(states, this.state))) {
          return; // 2.1.
        }
        if (this.state !== PresentationConnectionState.closed) {
          this.state = PresentationConnectionState.closed; // 2.2.
        }
        let event = new PresentationConnectionCloseEvent("close", {reason: closeReason, message: closeMessage});
        fire(event, this);
      });
    }
  }

  /**
   * 6.5.6
   * terminate controlling
   */
  terminateAsController() {
    if (this.state != PresentationConnectionState.connected) {
      return; // 1.
    }
    
    ua.controlledPresentations.forEach(knownConnection => { // 2.
      if (this.id === knownConnection.id && knownConnection.state == PresentationConnectionState.connected) { // 2.1
        queueTask(() => {
          knownConnection.state = PresentationConnectionState.terminated; // 2.1.1
          fire(new Event("terminate"), knownConnection);                  // 2.1.2
        })
        
      }
    });
    
    // 3.
    this.send({terminate: true});
  }
  
  /**
   * 6.5.7
   * terminate receiving
   * https://w3c.github.io/presentation-api/#terminating-a-presentation-in-a-receiving-browsing-context
   */
  terminateAsReceiver() {
    // #TODO
  }
   
   /**
   * 6.5.8
   * terminate receiving -> handle in controlling
   * https://w3c.github.io/presentation-api/#handling-a-termination-confirmation-in-a-controlling-user-agent
   * @param {PresentationConnection} this
   */
  handleTerminationConfirmationAsController(S) {
    this.controlledPresentations.forEach(P => {
      if (P == S) { // 1.
        queueTask(() => {
          if (P.state !== PresentationConnectionState.connected) {
            return;   // 1.1
          }

          P.state = PresentationConnectionState.terminated; // 1.2
          fire(new Event("terminate"), P); // 1.3
        });
      }
    });
  }
}

// https://w3c.github.io/presentation-api/#idl-def-presentationrequest
class PresentationRequest {
  // 6.3.1
  constructor(urls) {
    implement(this, EventTarget);
    addEventListeners(this, "connectionavailable");

    if (!urls) {
      throw domEx("NOT_SUPPORTED_ERROR"); // 1.
    }
    
    if (!(urls instanceof Array)) {
      urls = [urls]; //2.
    }
    
    this.presentationUrls = []; //3.
    let baseUrl = getBaseUrl();
    urls.forEach(url => {
      // url resolving like in nodejs (https://nodejs.org/api/url.html) is experimental: https://developer.mozilla.org/en-US/docs/Web/API/URL/URL
      this.presentationUrls.push(new URL(url, baseUrl)); // 4., throws SyntaxError correctly
    });
    
    this.presentationAvailabilityPromise = null;
    this.presentationDisplayAvailability = null;
    this.getAvailabilityPending = null;
  }
  
  /**
   * 6.3.2 https://w3c.github.io/presentation-api/#dom-presentationrequest-start
   * @param {PresentationRequest} this
   * @return {Promise<PresentationConnection>}
   */
  start() {
    if (!Browser.allowedToShowPopup()) {
      return Promise.reject(new InvalidAccessError()); // 1.
    }
    
    if (document.startPromise) {
      return Promise.reject(new OperationError()); // 2.+3. (somewhat simplified)
    }

    // 4.
    let P = new Promise((resolve, reject) => {
      // 6.
      if (!ua.monitoring) {
        this.monitor();
      }
      
      ua.letUserSelectDisplay(this.presentationUrls) // 7-9.
      .then(D => {
        // 11. - 12.
        this.startPresentationConnection(D, resolve);
      });
    });
    return P; // 5.
  }
  
  /**
   * 6.3.3 https://w3c.github.io/presentation-api/#starting-a-presentation-from-a-default-presentation-request
   * @param {document} W
   * @param {PresentationDisplay} D
   */
  static startDefault(W, D) {
    let defaultReq = window.navigator.presentation.defaultRequest;
    if (defaultReq === null) {
      return;
    }
    
    let presentationUrls = defaultReq.presentationUrls; // 1.
    if (Browser.isSandboxedPresentation(W)) {
      return;
    }
    // #TODO
  }
  
  /**
   * 6.3.4 https://w3c.github.io/presentation-api/#dfn-start-a-presentation-connection
   * @param {PresentationRequest} this
   * @param {PresentationDisplay} D
   * @param {Function} P - resolve-function of Promise, gets resolved with new PresentationConnection
   */
  startPresentationConnection(D, P) {
    console.log("starting Connection to: ", D);
    let I = guid();
    let presentationUrls = this.presentationUrls; // 4.
    let pUrl = "";

    // 5.
    presentationUrls.some(presentationUrl => {
      if (ua.availablePresentationDisplays.find(apd => apd.availabilityUrl === presentationUrl)) {
        pUrl = presentationUrl.toString();
        return true;
      }
    });

    let S = new PresentationConnection(I, pUrl, Role.Controller, guid()); // 2., 3., 6.
    ua.controlledPresentations.push(S); // 7.
    
    // 8.
    P(S);

    // 9.
    queueTask(() => {
      let event = new PresentationConnectionAvailableEvent("connectionavailable", {connection: S});
      fire(event, this);
    })

    // 10.+ 12. 
    // "tell U to create receiving browsing context" -> fire and forget
    ua.createContextHandler(D, pUrl, I, S.sessionId)
    .catch(() => S.close(PresentationConnectionClosedReasons.error, "Creation of receiving context failed.")) /* 11. */
    .then (() => S.establish()); /* 13. */
  }

  /**
   * 6.3.5
   * Reconnect to presentation
   * https://w3c.github.io/presentation-api/#reconnecting-to-a-presentation
   * @param {PresentationRequest} this
   * @param {String} presentationId
   */
  reconnect(presentationId) {
    return new Promise((resolve, reject) => { // 1., 2.
      // 3.
      let existingConnection = ua.controlledPresentations.find(connection => {
        return true /* #TODO: Its controlling BC is the current BC */
          && connection.state != PresentationConnectionState.terminated 
          && this.presentationUrls.some(url => url.toString() === connection.url)
          && presentationId === connection.id;
      });

      // 4.
      if(existingConnection){           // 4.1
        resolve(existingConnection);    // 4.2
        if (existingConnection.state === PresentationConnectionState.connecting ||
            existingConnection.state === PresentationConnectionState.connected) {
          return;                       // 4.3
        }

        existingConnection.state = PresentationConnectionState.connecting; // 4.4
        existingConnection.establish(); // 4.5
        return;                         // 4.6
      }
      
      // THIS CODE IS CURRENTLY NOT REACHABLE
      // 5.
      existingConnection = ua.controlledPresentations.find(connection => {
        return true /* #TODO: Its controlling BC is not the current BC */
          && connection.state != PresentationConnectionState.terminated 
          && this.presentationUrls.some(url => url.toString() === connection.url)
          && presentationId === connection.id;
      });

      // 6.
      if (existingConnection) {                                       // 6.1
        let newConnection = new PresentationConnection(presentationId, existingConnection.url, Role.Controller, guid());             // 6.2-4
        newConnection.state = PresentationConnectionState.connecting; // 6.5
        ua.controlledPresentations.push(S);                           // 6.6
        resolve(newConnection);                                       // 6.7
        queueTask(() => {
          let event = new PresentationConnectionAvailableEvent("connectionavailable", {connection: newConnection});
          fire(event, this);
        });
        newConnection.establish();                                    // 6.9
        return;
      }

      // 7.
      reject(new NotFoundError());
    });
  }
  
  /**
   * 6.4.3
   * https://w3c.github.io/presentation-api/#dom-presentationrequest-getavailability
   * @param {PresentationRequest} this
   * @return {Promise<PresentationAvailability>}
   */
  getAvailability() {
    if (this.getAvailabilityPending !== null) {
      return this.getAvailabilityPending;                      // 1.
    }
    
    let P = new Promise((resolve, reject) => {                 // 2.
      if (ua.allowed < DiscoveryAllowance.continous) { // 4.
        console.warn("Not possible to monitor available presentation displays.");
        this.getAvailabilityPending = null;
        return reject(domEx("NOT_SUPPORTED_ERROR"));
      }
      
      if (this.presentationDisplayAvailability !== null) {
        this.getAvailabilityPending = null;
        return resolve(this.presentationDisplayAvailability);  // 5.
      }
      
      this.presentationDisplayAvailability = new PresentationAvailability();
      let A = this.presentationDisplayAvailability;            // 6.
      ua.availabilityObjects.push({A: A, urls: this.presentationUrls}); // 7.
      return this.monitor().then(() => { // 8.
        this.getAvailabilityPending = null;
        return resolve(A);                                     // 9.
      });
    });
    
    this.getAvailabilityPending = P;
    return P;                                                  // 3.
  }

   /**
   * 6.4.4 Monitoring the list of available presentation Displays
   * theres been a major Rework in https://github.com/w3c/presentation-api/commit/0c800c5c5bee2573735e4b75b117bca77937a0d9
   * @param {PresentationRequest} this
   * @return {Promise}
   */
  monitor() {
    console.log("monitoring");
    this.monitoring = true;
    let availabilitySet = ua.availabilityObjects || [];// 1.
    
    if (ua.pendingSelection && this && this.presentationDisplayAvailability === null) { // 2.
      let A = new PresentationAvailability();                                // 2.1
      availabilitySet.push({A: A, urls: this.presentationUrls});        // 2.2
    }
    
    let newDisplays = [];                                 // 3.
    if (ua.possible && ua.allowed) {                  // 4.
      return ua.monitorHandler().then((displays) => {          // 5.
        newDisplays = displays;
        ua.availablePresentationDisplays = [];          // 6.
        availabilitySet.forEach(availability => {         // 7.
          let previousAvailability = availability.A.value;  // 7.1
          let newAvailability = false;                      // 7.2
          // console.log(availability);
          availability.urls.forEach(availabilityUrl => {    // 7.3.
            newDisplays.forEach(display => {                  // 7.3.1.
              let tuple = {availabilityUrl, display};
              //console.log(this.availablePresentationDisplays, tuple);
              if (!includes(ua.availablePresentationDisplays, tuple)) {
                ua.availablePresentationDisplays.push(tuple); // 7.3.1.1.
                //console.log("display detected: ", tuple);
              }
              ua.monitoring = false;
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
      ua.monitoring = false;
      return Promise.reject();
    }
  }
}

/**
 * 6.6
 * https://w3c.github.io/presentation-api/#interface-presentationreceiver
 */
class PresentationReceiver {
  /**
   * 6.6
   * create receiver inside {ReceivingContext}
   */
  constructor(D) {
    Object.defineProperty(this, "connectionList", {
      get: () => ua.getConnectionList()
    });

    ua.hostHandler(D)
    .then(c => ua.createReceivingContext(c.display, c.url, c.presentationId, c.sessionId)); // c is the contextCreationInfo;
  }
}