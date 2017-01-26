// require util.js

// --- IMPLEMENTATION ---
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
    if (value !== undefined) {
      this.value = value; // <-- must only be set by, https://w3c.github.io/presentation-api/#interface-presentationavailability #TODO
    } else {
      this.value = false;
    }
     
    this.onchange = null;
    
    implement(this, EventTarget);
  }
  
  attachOnchange(handler) {
    this.onchange = handler;
    this.addEventListener('change', this.onchange);
  }
}


// https://w3c.github.io/presentation-api/#idl-def-presentationrequest
class PresentationRequest {
  // 6.3.1
  constructor(urls) {
    if (!urls) {
      throw new DOMException(DOMException.NOT_SUPPORTED_ERROR); // 1.
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
    
    this.onconnectionavailable = null;
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
      if (Browser.isMixedContentMismatch(this.presentationUrls) || Browser.isSandboxedPresentation()) { // 2. - 4.
        return reject(new SecurityError());
      }
      
      // 5.
      let P = new Promise((resolve, reject) => {
        // 7.
        if (!window.navigator.presentation.monitoring) {
          window.navigator.presentation.monitor(this);
        }
        
        // 8.
        window.navigator.presentation.letUserSelectDisplay(this.presentationUrls)
        .then(D => {
          console.log("here?", D);
          // 11. - 12.
          window.navigator.presentation.startPresentationConnection(this, D, P);
          // #TODO does giving P work here? otherwise we would have to use function(resolve, reject) and return something like (self, D, this)
        });
      });
      return P; // 6.
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
    return new Promise((resolve, reject) => {
      // #TODO
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
      if (window.navigator.presentation.allowed < DiscoveryAllowance.continous) { // 4.
        console.warn("Not possible to monitor available presentation displays.");
        this.getAvailabilityPending = null;
        return reject(new DOMException(DOMException.NOT_SUPPORTED_ERROR));
      }
      
      if (this.presentationDisplayAvailability !== null) {
        this.getAvailabilityPending = null;
        return resolve(this.presentationDisplayAvailability);  // 5.
      }
      
      this.presentationDisplayAvailability = new PresentationAvailability();
      let A = this.presentationDisplayAvailability;            // 6.
      window.navigator.presentation.availabilityObjects.push({A: A, urls: this.presentationUrls}); // 7.
      window.navigator.presentation.monitor(this);                                                     // 8.
      
      this.getAvailabilityPending = null;
      return resolve(A);                                       // 9.
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
    super();
    readOnly(this, "connection", eventInitDict.connection);
  }
}

class PresentationConnection {
  /**
   * 6.5
   * https://w3c.github.io/presentation-api/#idl-def-presentationconnection
   * @param {String} id
   * @param {String} url
   * @param {PresentationConnectionState} state
   */
  constructor(id, url) {
    implement(this, EventTarget);
    
    // {presentation identifier}
    readOnly(this, "id", id);
    readOnly(this, "url", url);
    readOnly(this, "state", PresentationConnectionState.connecting);
    
    // Control
    this.onconnect = null;
    this.onclose = null;
    this.onterminate = null;
    
    // Communication
    this.onmessage = null;
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
      return;
    }
    
    // 2.
    // Request connection of presentationConnection to the receiving browsing context. The presentation identifier of presentationConnection must be sent with this request.
    return window.navigator.presentation.connect(this.id, this.url)
      .then((reference) => {
        // 3.
        //this.implementationReference = reference; // custom
        this.state = PresentationConnectionState.connected;
        this.dispatchEvent(new Event("change"));
        return true;
      })
      .catch(() => {
        // 4.
        this.close(PresentationConnectionClosedReasons.error);
        return false;
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
      throw new DOMException(DOMException.INVALID_STATE_ERROR); // 1.
    }
    
    // 2. TODO
    // If the closing procedure of presentationConnection has started, then abort these steps.
    
    // 3.
    let messageType = null;
    if (["ArrayBuffer", "ArrayBufferView", "Blob"].includes(messageOrData.constructor.name)) {
      messageType = PresentationMessageType.binary;
    }
    if (messageOrData.constructor.name === "String") {
      messageType = PresentationMessageType.text;
    }
    if (!messageType) {
      throw new Error("Unsupported message Type in PresentationRequest.send()");
    }
    
    window.navigator.presentation.send(messageType, messageOrData).catch(err => { // 4.
      this.close(PresentationConnectionClosedReasons.error, err); // 5.
    });
  }
  
  /**
   * 6.5.3
   * receive message
   * @param {PresentationConnection} this
   * @param {PresentationMessageType} presentationMessageType
   * @param {string|binary} presentationMessageData
   */
  receive(presentationMessageType, presentationMessageData) {
    if (this.state !== PresentationConnectionState.connected) {
      return; // 1.
    }
    
    // 2.-4.
    // #TODO https://w3c.github.io/presentation-api/#receiving-a-message-through-presentationconnection
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
    //this.implementationReference.close(closeReason);  // 3.
    window.navigator.presentation.close(closeReason);
    if (closeReason != PresentationClosedReasons.wentaway) {
      // #TODO
      // https://w3c.github.io/presentation-api/#dfn-close-a-presentation-connection
    }
    
    //this.dispatchEvent(new Event("close"));
  }
  
  /**
   * 6.5.6
   * terminate controlling
   */
  terminate() {
    if (this.state != PresentationConnectionState.connected) {
      return; // 1.
    }
    
    window.navigator.presentation.controlledPresentations.forEach(knownConnection => { // 2.
      if (this.id === knownConnection.id && knownConnection.state == PresentationConnectionState.connected) { // 2.1
        // #TODO queue a task to run the following steps
        knownConnection.state = PresentationConnectionState.terminated; // 2.1.1
        knownConnection.dispatchEvent(new Event("terminate"));// 2.1.2
      }
    });
    
    // 3.
    // #TODO
    // Send a termination request for the presentation to its receiving user agent using an implementation specific mechanism.
  }
  
  /**
   * 6.5.7
   * terminate receiving
   * https://w3c.github.io/presentation-api/#terminating-a-presentation-in-a-receiving-browsing-context
   */
  //#TODO
   
   /**
   * 6.5.8
   * terminate receiving -> handle in controlling
   * https://w3c.github.io/presentation-api/#handling-a-termination-confirmation-in-a-controlling-user-agent
   */
  //#TODO
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
    super();
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
      // #TODO throw something, this is required and must be in array
    }
  }
}

/**
 * 6.6
 * https://w3c.github.io/presentation-api/#interface-presentationreceiver
 */
class PresentationReceiver {
  /**
   * 6.6 + 6.6.1
   * create receiver
   * https://w3c.github.io/presentation-api/#creating-a-receiving-browsing-context
   * @param {PresentationDisplay} D
   * @param {String} presentationUrl - the presentation request url
   * @param {String} presentationId - the presentation identifier
   */
  constructor(D, presentationUrl, presentationId) {
    this.presentationId = presentationId;
    
    // 6.6
    // Contains the presentation connections created by a receiving browsing context for the receiving user agent.
    // All presentation connections in this set share the same presentation URL and presentation identifier.
    this.presentationControllers = []; // {[PresentationConnection]}
    
    // exposes the current set of presentation controllers to the receiving application.
    this.controllersMonitor = null; // {PresentationConnectionList}
    
    // provides the presentation controllers monitor once the initial presentation connection is established.
    this.controllersPromise = null; // {Promise<PresentationConnectionList>}
    
    this.connectionList = new Promise((resolve, reject) => {
      if (this.controllersPromise !== null) {
        // 1.
        return this.controllersPromise;
      } else {
        // 2.
        this.controllersPromise = new Promise((resolve, reject) => {
          // #TODO: once the initial presentation connection is established
          // 4.
          if (this.controllersMonitor !== null) {
            resolve(this.controllersMonitor);
          }
        });
        
        // 3.
        return this.controllersPromise;
      }
    });
    
    // 6.6.1
    // #TODO i dont want to implement https://w3c.github.io/presentation-api/#creating-a-receiving-browsing-context :)
    let C = createContext(presentationUrl);
    if (window.navigator.presentation.hostHandler) {
      window.navigator.presentation.hostHandler(this.presentationId, presentationUrl);
    }
  }
  
  /**
   * 6.7.1
   * https://w3c.github.io/presentation-api/#monitoring-incoming-presentation-connections
   * @param {String} I - the presentation identifier passed by the controlling browsing context with the incoming connection request
   * @param {String} this.presentationId - the presentation identifier
   * @param {String} presentationUrl - the presentation request url
   */
  handleClient(I, presentationUrl) {
    if (I !== this.presentationId) {
      return false;                                                 // 1.
    }
    let S = new PresentationConnection(I, presentationUrl);         // 2. - 4.
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
        // #TODO
        // Queue a task to fire a trusted event with the name connectionavailable, that uses the PresentationConnectionAvailableEvent interface, with the connection attribute initialized to S, at the presentation controllers monitor. The event must not bubble, must not be cancelable, and has no default action.
      }
    });
  }
}

class PresentationConnectionList {
  constructor() {
    implement(this, EventTarget);
    
    this.connections = [];
    this.onconnectionavailable = null;
  }
}