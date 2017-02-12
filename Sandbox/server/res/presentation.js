// require util.js

// --- IMPLEMENTATION ---
const Role = {Controller: 0, Receiver: 1};
const PresentationConnectionState = {connecting: 0, connected:1, closed:2, terminated:3};
const PresentationConnectionClosedReasons = {error: 10, closed: 11, wentaway: 12};
const PresentationMessageType = {binary: 20, text: 21};
const BinaryType = {blob: 30, arrayBuffer: 31};

// 6.2
class Presentation {
  constructor() {
    // {PresentationRequest}
    this.defaultRequest = null;
    
    // {PresentationReceiver}
    this.receiver = null;
    
    makeGetter(window.navigator, "presentation", this);
  }
}


/**
 * 6.4 https://w3c.github.io/presentation-api/#interface-presentationavailability
 */
class PresentationAvailability {
  constructor(value) {
    implement(this, EventTarget);
    addEventListeners(this, "change");

    /*
      Spec ambigous again: .value must only be set by https://w3c.github.sio/presentation-api/#interface-presentationavailability but also by monitor()??
    */
    if (value !== undefined) {
      this.value = value;
    } else {
      this.value = false;
    }
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
    
    // #TODO check if implementation is according to spec
    // spec says baseurl should come from https://html.spec.whatwg.org/multipage/webappapis.html#current-settings-object
    this.presentationUrls = []; //3.
    let baseUrl = new RegExp(/^.*\//).exec(window.location.href)[0];
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
    return new Promise((resolve, reject) => {
      if (!Browser.allowedToShowPopup()) {
        return reject(new InvalidAccessError()); // 1.
      }
      
      if (document.startPromise) {
        return reject(new OperationError()); // 2.+3. (somewhat simplified)
      }

      // 4.
      let P = new Promise((resolve, reject) => {
        // 6.
        if (!window.navigator.presentation.monitoring) {
          window.navigator.presentation.monitor(this);
        }
        
        window.navigator.presentation.letUserSelectDisplay(this.presentationUrls) // 7-9.
        .then(D => {
          // 11. - 12.
          window.navigator.presentation.startPresentationConnection(this, D, resolve);
        });
      });
      return P; // 5.
    });
  }
  
  /**
   * 6.3.3 https://w3c.github.io/presentation-api/#starting-a-presentation-from-a-default-presentation-request
   * @param {document} W
   * @param {PresentationRequest} presentationRequest
   * @param {PresentationDisplay} D
   */
  static startDefault(W, presentationRequest, D) {
    let presentationUrls = presentationRequest.presentationUrls; // 1.
    if (Browser.isSandboxedPresentation(W)) {
      return;
    }
  }
  
  /**
   * 6.3.5
   * https://w3c.github.io/presentation-api/#dom-presentationrequest-reconnect
   * @param {}
   * @return {Promise<PresentationConnection>}
   */
  reconnect() {
    // 1. - 2.
    
      return window.navigator.presentation.reconnect(this, id);
  
   
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
      if (window.navigator.presentation.allowed < DiscoveryAllowance.continous) { // 4.
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
      window.navigator.presentation.availabilityObjects.push({A: A, urls: this.presentationUrls}); // 7.
      return window.navigator.presentation.monitor(this).then(() => { // 8.
        this.getAvailabilityPending = null;
        return resolve(A);                                     // 9.
      });
    });
    
    this.getAvailabilityPending = P;
    return P;                                                  // 3.
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
    readOnly(this, "connection", eventInitDict.connection);
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
    readOnly(this, "id", id);
    readOnly(this, "url", url);
    //readOnly(this, "state", PresentationConnectionState.connecting); // #ambigous the spec says this shall be readonly but it shall also be altered quite often o_O
    this.state = PresentationConnectionState.connecting;
        
    this.binaryType = BinaryType.arrayBuffer;
  }
  

  /**
   * 6.5.1
   * connect
   * @param {PresentationConnection} this
   * @return {Promise<boolean>}
   */
  establish() {
    // 1.
    if (this.state !== PresentationConnectionState.connecting) {
      console.warn("Establishing but not connecting, aborting..");
      return;
    }
    
    // 2.
    // Request connection of presentationConnection to the receiving browsing context. The presentation identifier of presentationConnection must be sent with this request.
    let p = window.navigator.presentation;
    return p.connect(this.id, this.sessionId, this.role)
      .catch(() => {
        this.close(PresentationConnectionClosedReasons.error); // 4.
        return false;
      })
      .then((reference) => {
        queueTask(() => {
          this.state = PresentationConnectionState.connected;   // 3.
          p.messageIncomingHandler(this.sessionId, this.role,
            (message) => this.receive(PresentationMessageType.text, message));
          fire(new Event("connect"), this);
        });
        return true;
      });
  }
  
  /**
   * 6.5.2
   * send message
   * @param {PresentationConnection} this
   * @param {payload data} messageOrData
   */
  send(messageOrData) {
    if (this.state !== PresentationConnectionState.connected) {
      throw domEx("INVALID_STATE_ERROR"); // 1.
    }
    
    // 2.
    if (this.state == PresentationConnectionState.closed) {
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
    
    window.navigator.presentation.send(this.id, this.sessionId, this.role, messageType, messageOrData).catch(err => { // 4.
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
   * @param {PresentationConnection} this
   * @param {PresentationConnectionClosedReasons} closeReason
   * @param {string} closeMessage
   */
  close(closeReason, closeMessage) {
    if (!(this.state == PresentationConnectionState.connecting || this.state == PresentationConnectionState.connected)) {
      return;                                         // 1.
    }
    this.state = PresentationConnectionState.closed;  // 2.
    this.send({category: "control", command: "close", detail: "closeReason"}); // 3.
    if (closeReason != PresentationConnectionClosedReasons.wentaway) {
      window.navigator.presentation.close(this, closeReason, closeMessage); // 4.
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
    
    window.navigator.presentation.controlledPresentations.forEach(knownConnection => { // 2.
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
        })
      }
    });
  }
}

/**
 * 6.5.4a
 * https://w3c.github.io/presentation-api/#idl-def-presentationconnectioncloseevent
 */
class PresentationConnectionCloseEvent extends Event{
  /**
   * @param {DOMString} type
   */
  constructor(type, eventInitDict) {
    super(type);
  }
}

class PresentationConnectionCloseEventInit {
  /**
   * 6.5.4b
   * @param {String} reason
   * @param {DOMString} message
   */
  constructor(reason, message) {
    if (!reason || PresentationConnectionClosedReasons.some(pccr => pccr === reason)) {
      throw new Error("Illegal close reason");
    }
    this.reason = reason;
    this.message = message;
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
   * @param {Display} D - has a human-readable name
   */
  constructor(D) {
    // Contains the presentation connections created by a receiving browsing context for the receiving user agent.
    // All presentation connections in this set share the same presentation URL and presentation identifier.
    this.presentationControllers = []; // {[PresentationConnection]}
    
    // exposes the current set of presentation controllers to the receiving application.
    this.controllersMonitor = null; // {PresentationConnectionList}
    
    // provides the presentation controllers monitor once the initial presentation connection is established.
    this.controllersPromise = null; // {Promise<PresentationConnectionList>}
    
    Object.defineProperty(this, "connectionList", {
      get: function() {
        console.log(new Date().toTimeString(), this.controllersPromise)
        if (this.controllersPromise !== null) {
          // 1.
          return this.controllersPromise;
        } else {
          // 2.
          let temp = null;
          this.controllersPromise = new Promise((resolve, reject) => {
            temp = resolve;
          });
          this.controllersPromise.resolve = temp;

          // 4.
          if (this.controllersMonitor !== null) {
            this.controllersPromise.resolve(this.controllersMonitor);
          }

          // 3.
          return this.controllersPromise;
        }
      }
    }); 

    window.navigator.presentation.hostHandler(D)
    .then(c => this.createReceivingContext(c.display, c.url, c.presentationId, c.sessionId)); // c is the contextCreationInfo
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
    this.window = C.contentWindow;
    
    // 12.
    window.navigator.presentation.monitorIncomingHandler(presentationId, presentationUrl, (I) => {
      this.handleClient(I, presentationId, presentationUrl, sessionId);
    });
    
    // Connect initiating controlling context
    this.handleClient(presentationId, presentationId, presentationUrl, sessionId);
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
}

class PresentationConnectionList {
  constructor() {
    implement(this, EventTarget);
    addEventListeners(this, "connectionavailable");

    this.connections = [];
  }
}