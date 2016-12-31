let dd = null;

// ---   UTIL  ---
function copy(dest, source, isDeep) {
  if (isDeep) {
    throw new NotImplementedException();
  } else {
    // http://www.2ality.com/2014/01/object-assign.html
    dest = Object.assign({}, source);
  }
}

/**
 * @param {Object} to - receiving object
 * @param {String} propName
 * @param {any} propValue - reference to value of the getter
 */
function makeGetter(to, propName, propValue) {
  Object.defineProperty(to, propName, {get: () => propValue});
}

/**
 * @param {Object} to - receiving object
 * @param {String} propName
 * @param {any} propValue - once written then twice shy
 */
function readOnly(to, propName, propValue) {
  Object.defineProperty(to, propName, {value: propValue, writable: false});
}

/**
 * @param {String} url
 * @return {DOMElement}
 */
function createContext(url) {
  let ifrm = document.createElement("iframe");
  // scrolling="no" marginwidth="0" marginheight="0" frameborder="0" vspace="0" hspace="0">
  ifrm.setAttribute("src", url);
  ifrm.style.width = "100%";
  ifrm.style.height = "100%";
  document.body.appendChild(ifrm);
  return ifrm;
}

// --- CONTEXT ---
/**
 * #TODO
 * https://w3c.github.io/webappsec-mixed-content/#categorize-settings-object
 * @return {boolean}
 */
function prohibitsMixedSecurityContents() {
  // window.isSecureContext ?
  return true;
}

function isMixedContentMismatch(presentationUrls) {
  let mixedSecButUnauth = prohibitsMixedSecurityContents() && presentationUrls.some(u => isAPrioriUnauthenticatedURL(u)); // 2.-4.
  if (mixedSecButUnauth || isSandboxedPresentation()) {
    return true;
  }
}

/**
 * #TODO
 * https://w3c.github.io/presentation-api/#dfn-a-priori-unauthenticated-url
 * @return {boolean}
 */
function isAPrioriUnauthenticatedURL(url) {
  return false;
}

/**
 * #TODO
 * https://www.w3.org/TR/html5/browsers.html#sandboxing-flag-set
 * https://w3c.github.io/presentation-api/#sandboxed-presentation-browsing-context-flag
 * @param {document} doc
 */
function getSandboxingFlag(doc) {
  // i have no idea yet
  return false;
}

/**
 * @param {document} doc - optional
 */
function isSandboxedPresentation(doc) {
  doc = doc || document;
  return getSandboxingFlag(doc);
}

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
class PresentationAvailability extends EventTarget {
  constructor(value) {
    this.value = value; // <-- must only be set by https://w3c.github.io/presentation-api/#interface-presentationavailability #TODO
    this.onchange = null;
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
      throw new NotSupportedError(); // 1.
    }
    
    if (!(urls instanceof Array)) {
      urls = [urls]; //2.
    }
    
    // #TODO check if implementation is according to spec
    // spec says baseurl should come from https://html.spec.whatwg.org/multipage/webappapis.html#current-settings-object
    this.presentationUrls = []; //3.
    let baseurl = new RegExp(/^.*\//).exec(window.location.href);
    urls.forEach(url => {
      // url resolving like in nodejs (https://nodejs.org/api/url.html) is experimental: https://developer.mozilla.org/en-US/docs/Web/API/URL/URL
      this.presentationUrls.push(new URL(url, baseUrl)) // 4., throws SyntaxError correctly
    });
    
    this.onconnectionavailable = null;
    this.presentationAvailabilityPromise = null;
    this.presentationDisplayAvailability = null;
  }
  
  /**
   * 6.3.2 https://w3c.github.io/presentation-api/#dom-presentationrequest-start
   * @param {PresentationRequest} this
   * @return {Promise<PresentationConnection>}
   */
  start() {
    return new Promise((resolve, reject) => {
      if (!allowedToShowPopup()) {
        return reject(new InvalidAccessError()); // 1.
      }
      if (isMixedContentMismatch(this.presentationUrls) || isSandboxedPresentation()) { // 2. - 4.
        return reject(new SecurityError());
      }
      
      // 5.
      let P = new Promise((resolve, reject) => {
        // 7.
        if (!dd.monitoring) {
          dd.monitor();
        }
        
        // 8.
        dd.letUserSelectDisplay(this.presentationUrls)
        .then(D => {
          // 11. - 12.
          dd.startPresentationConnection(this, D, P);
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
    if (isSandboxedPresentation(W)) {
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
   * @param {Array} presentationUrls - #TODO
   * @return {Promise<PresentationAvailability>}
   */
  getAvailability(presentationUrls) {
    return new Promise((resolve, reject) => {
      if (isMixedContentMismatch(presentationUrls) || isSandboxedPresentation()) { // 1.
        return reject(new SecurityError());
      }
      
      return new Promise((resolve, reject) => { // 2., 3.
        // 4.
        if (!dd.allowed) {
          console.warn("Not allowed to monitor available presentation displays.");
          return resolve(new PresentationAvailability(false));
        }
        
        // 5.
        if (!dd.possible) {
          console.warn("Not possible to monitor available presentation displays.");
          return reject(new NotSupportedError());
        }
        
        // 6.
        dd.availabilityObjects.forEach(aO => {
          if (aO.presentationUrls == presentationUrls) {
            return resolve(ao.A);
          }
        });
          
        // 7.
        let value = dd.urlsTest(presentationUrls);
        let A = new PresentationAvailability(value);
        
        // 8.
        dd.availabilityObjects.push({A: A, urls: presentationUrls});
        
        // 9.
        dd.monitor();
        
        // 10.
        return resolve(A);
      });
    });
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
    readOnly(this, "connection", eventInitDict.connection);
  }
}

/**
 * 6.5
 * https://w3c.github.io/presentation-api/#idl-def-presentationconnection
 * @param {String} id
 * @param {String} url
 * @param {PresentationConnectionState} state
 */
class PresentationConnection extends EventTarget {
  constructor(id, url) {
    // {presentation identifier}
    readOnly(this, "id", id);
    readOnly(this, "url", url);
    readOnly(this, "state", PresentationConnectionState.connecting);
    //this.implementationReference = null; // custom
    
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
    return dd.connect(this.id, this.url)
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
      throw new InvalidStateError(); // 1.
    }
    
    // 2. TODO
    // If the closing procedure of presentationConnection has started, then abort these steps.
    
    // 3.
    let messageType = null;
    if (["ArrayBuffer", "ArrayBufferView", "Blob"].contains(messageOrData.constructor.name)) {
      messageType = PresentationMessageType.binary;
    }
    if (messageOrData.constructor.name === "String") {
      messageType = PresentationMessageType.text;
    }
    if (!messageType) {
      throw new Error("Unsupported message Type in PresentationRequest.send()");
    }
    
    dd.send(messageType, messageOrData).catch(err => { // 4.
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
    dd.close(closeReason);
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
    
    dd.controlledPresentations.forEach(knownConnection => { // 2.
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
   * @param {PresentationDisplay} D - chosen by user
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
          } else {
            reject("presentation controllers monitor empty")
          }
        });
        
        // 3.
        return this.controllersPromise;
      }
      return resolve();
    });
    
    // 6.6.1
    // #TODO i dont want to implement https://w3c.github.io/presentation-api/#creating-a-receiving-browsing-context :)
    let C = createContext(presentationUrl);
    if (dd.hostHandler) {
      dd.hostHandler();
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

class PresentationConnectionList extends EventTarget {
  constructor() {
    this.connections = [];
    this.onconnectionavailable = null;
  }
}

// ---  DEV API  ---
// dd = new DeviceDiscoverer();

/**
 * Custom class that opens the API to the user (dev)
 * 6.4.4 Monitor list of available presentation displays
 * https://w3c.github.io/presentation-api/#dfn-monitor-the-list-of-available-presentation-displays
 */
class DeviceDiscoverer extends Presentation {
  constructor() {
    super();
    this.monitoring = false;
    
    // These shall be set by ._set() during configure(), auto-reject if they are mandatory
    this.monitorHandler = () => new Promise((res, rej) => rej());
    this.connectHandler = () => new Promise((res, rej) => rej());
    this.sendHandler    = () => new Promise((res, rej) => rej());
    this.receiveHandler = () => new Promise((res, rej) => rej());
    this.hostHandler    = () => new Promise((res, rej) => res());
    
    // https://w3c.github.io/presentation-api/#dfn-set-of-controlled-presentations
    this.controlledPresentations = [];
    
    /**
     * Technically possible because there was a monitorHandler attached
     */
    this.possible = false;
    
    /**
     * Allowed by user
     */
    this.allowed = false; // #TODO based on user agent
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

    // "Singleton"
    dd = this;
  
    // Continous Monitoring
    if (this.allowed) {
      setInterval(this.monitor(), SCAN_PERIOD)
    }
  }
  
  /**
   * 6.4.4 Monitoring the list of available presentation Displays
   * theres been a major Rework in https://github.com/w3c/presentation-api/commit/0c800c5c5bee2573735e4b75b117bca77937a0d9
   * @param {PresentationRequest} pr - #TODO where to get that from
   * @return {Promise}
   */
  monitor(pr) {
    this.monitoring = true;
    let availabilitySet = {};
    copy(availabilitySet, this.availabilityObjects, false);// 1.
    
    if (this.pendingSelection && pr.presentationDisplayAvailability === null) { // 2.
      let A = new PresentationAvailability(value);                                // 2.1
      availabilitySet.push({A: A, presentationUrls: pr.presentationUrls});        // 2.2
    }
    
    let newDisplays = [];                                 // 3.
    if (possible && allowed) {                            // 4.
      this.monitorHandler().then((displays) => {          // 5.
        newDisplays = displays;
        
        this.availablePresentationDisplays = [];          // 6.
        availabilitySet.forEach(availability => {         // 7.
          let previousAvailability = availability.A.value;  // 7.1
          let newAvailability = true;                       // 7.2
          availability.urls.forEach(availabilityUrl => {    // 7.3.
            newDisplays.forEach(display => {                  // 7.3.1.
              // #TODO somehow check if display is an available presentation display
              // For each display in newDisplays, if display is an available presentation display for availabilityUrl, then run the following steps
              let tuple = {availabilityUrl, display};
              if (!(this.availablePresentationDisplay.contains(tuple))) {
                this.availablePresentationDisplays.push(tuple); // 7.3.1.1.
                console.log("new display detected: " + tuple);
              }
              newAvailability = true;                           // 7.3.1.2
            });
          });
        });
      });
    }
  }
  
  urlsTest(urls) {
    return this.availablePresentationDisplays.some(apd => urls.contains(apd.availabilityUrl))
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
    .then(v => {
       return this.getUserSelectedDisplay(presentationUrls);
    }).catch(() => {
      // 10.
      this.pendingSelection = true;
      return new NotAllowedError();
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
    // #TODO own implementation
    return new Promise((resolve, reject) => {
      let empty = this.availablePresentationDisplays.length === 0; // #TODO add check if currently monitoring etc => "stays empty"
      let couldConnectToAnUrl = this.urlsTest(presentationUrls);
      if (empty || !couldConnectToAnUrl) {
        reject(new NotFoundError());
      } else {
        // Ask user which display shall be taken
        let D = null; // #TODO
        /*
        The details of implementing the permission request and display selection are left to the user agent; for example it may show the user a dialog and allow the user to select an available display (granting permission), or cancel the selection (denying permission). Implementers are encouraged to show the user whether an available display is currently in use, to facilitate presentations that can make use of multiple displays.
        */
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
    // #TODO
    let pc = new PresentationConnection();
    this.controlledPresentations.push(pc);
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
      if (dd.receiver !== null) {
        dd.receiver.handleClient(id, url);
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
    // #HACK faster than looking up proper reflection, ES6 assign doesnt take over methods ¯\_(ツ)_/¯
    console.log("loaded Implementation: " + ic.name);
    ["monitor", "connect", "send", "receive", "close", "host"].forEach(h => {
      let handler = h + "Handler";
      this._set(handler, ic[handler]);
    });
  }
  
  /**
   * That's how the DeviceDiscovery shall work
   * @param {Promise} handlerFct
   */
  _set(handlerName, handlerFct) {
    if (!(handlerFct instanceof Promise)) {
      throw new NotSupportedError();
    }
    this[handlerName] = handlerFct;
    if (handlerName === "connectHandler") {
      this.possible = true;
    }
  }
}

class ImplementationConfig {
  /**
   * @param {String }           name - human readable name
   * @param {Promise} monitorHandler - how do you seek out for new displays,
   * @param {Promise} connectHandler - connect to them,
   * @param {Promise}    sendHandler - send messages to them,
   * @param {Promise} receiveHandler - receive messages
   * @param {Promise}   closeHandler - notify them to close connection
   *
   * @param {Promise}    hostHandler - optional, what happens if you instantiate a new receiver (tell some server maybe?)
   *
   */
  constructor(name, monitorHandler, connectHandler, sendHandler, receiveHandler, closeHandler, hostHandler) {
    this.name           = name;
    this.monitorHandler = monitorHandler;
    this.connectHandler = connectHandler;
    this.sendHandler    =    sendHandler;
    this.receiveHandler = receiveHandler;
    this.closeHandler   =   closeHandler;
    this.hostHandler    =    hostHandler;
  }
}