/**
 * Custom class that opens the API to the user (dev)
 * 6.4.4 Monitor list of available presentation displays
 * https://w3c.github.io/presentation-api/#dfn-monitor-the-list-of-available-presentation-displays
 */
class DeviceDiscoverer {
  // #TODO some class that handles the monitoring
  constructor() {
    this.monitoring = false;
    this.monitorHandler = () => {};
    /**
     * Technically possible because there was a monitorHandler attached
     */
    this.possible = false;
    
    this.implementationReference = null; // .close(reason) must be there
    
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

    if (this.allowed) {
      setInterval(this.monitor(), SCAN_PERIOD)
    }
  }
  
  /**
   * 6.4.4 Monitoring the list of available presentation Displays
   * @return {Promise}
   */
  monitor() {
    this.monitoring = true;
    return new Promise((resolve, reject) => {
      this.availablePresentationDisplays = [];              // 1.
      
      return this.monitorHandler().then((newDisplays) => {  // 2.
        this.availabilityObjects.forEach(aO => {            // 3.
          let previousAvailabilty = aO.A.value;               // 3.1.
          let newAvailability = false;                        // 3.2.
          aO.urls.forEach(availabilityUrl => {    // 3.3.
            newDisplays.forEach(display => {                    // 3.3.1.
              // #TODO somehow check if display is an available presentation display
              let tuple = {availabilityUrl, display};
              if (!(this.availablePresentationDisplay.contains(tuple))) {
                this.availablePresentationDisplays.push(tuple);   // 3.3.1.1.
              }
              newAvailability = true;
            });
          });
          
          if (previousAvailabilty != newAvailability) {
            aO.value = newAvailability;
            aO.dispatchEvent(new Event("change"));
          }
        });
        
        // near-end
        this.monitoring = false;
        if (tuple instanceof Array) {
          // assume its [presentationUrl]
          let value = tuple.length > 0; // 6.4.3  7.2 -> #TODO is this correct? i dont get this paragraph ..
          let A = new PresentationAvailability(value);
          return resolve(A);
        } else {
          // assume its {A, [presentationUrl]}
          // 6.
          return resolve(tuple.A);
        }
      });
    });
  }
    
  
  urlsTest(urls) {
    return this.availablePresentationDisplays.some(apd => urls.contains(apd.availabilityUrl))
  }
  
  /**
   * 6.3.2. 8-10. https://w3c.github.io/presentation-api/#selecting-a-presentation-display
   * @param {Array} presentationUrls
   * @return {Promise}
   */
  letUserSelectDisplay(presentationUrls) {
    return this.getUserPermission()
    .then(v => {
       return this.getUserSelectedDisplay(presentationUrls);
    }).catch(() => {
      // 10.
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
   * That's how the DeviceDiscovery shall work
   * Must alter >this<
   * @param {Promise<{A, [presentationUrl]}> | Promise<[presentationUrl]>} monitorHandler
   */
  set(monitorHandler) {
    if (!(monitorHandler instanceof Promise)) {
      throw new NotSupportedError();
    }
    this.monitorHandler = monitorHandler;
    this.possible = true;
  }
}

const deviceDiscoverer = new DeviceDiscoverer();


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
  
  //#TODO 6.4.1
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
   * @param {DeviceDiscoverer} dd
   * @return {Promise<PresentationConnection>}
   */
  start(dd) {
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
        let dd = deviceDiscoverer;
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

const PresentationConnectionState = {connecting: 0, connected:1, closed:2, terminated:3};
const BinaryType = {blob: 10, arrayBuffer: 11};
/**
 * 6.5
 * https://w3c.github.io/presentation-api/#idl-def-presentationconnection
 * @param {USVString} id
 * @param {USVString} url
 * @param {PresentationConnectionState} state
 */
class PresentationConnection extends EventTarget {
  constructor(id, url) {
    // {presentation identifier}
    readOnly(this, "id", id);
    readOnly(this, "url", url);
    readOnly(this, "state", PresentationConnectionState.connecting);
    this.implementationReference = null; // custom
    
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
   */
  establish(dd) {
    // 1.
    if (this.state !== PresentationConnectionState.connecting) {
      return;
    }
    
    // 2.
    // Request connection of presentationConnection to the receiving browsing context. The presentation identifier of presentationConnection must be sent with this request.
    dd.connect(this.id)
      .then((reference) => {
        // 3.
        this.implementationReference = reference; // custom
        this.state = PresentationConnectionState.connected;
        this.dispatchEvent(new Event("change"));
      })
      .catch(() => {
        // 4.
        this.close(PresentationConnectionClosedReasons.error);
      });
  }
  
  /**
   * 6.5.5
   * @param {PresentationConnection} this
   * @param {PresentationConnectionClosedReasons} closeReason
   * @param {string} closeMessage
   */
  close(closeReason, closeMessage) {
    if (!(this.state == PresentationConnectionState.connecting || this.state == PresentationConnectionState.connected)) {
      return; // 1.
    }
    this.state = PresentationConnectionState.closed;// 2.
    this.implementationReference.close(closeReason); // 3.
    if (!(closeReason == PresentationClosedReasons.wentaway)) {
      
    }
    
    //this.dispatchEvent(new Event("close"));
  }
  
  terminate() {
    //#TODO
  }
  
  /**
   * @param {DOMString, Blob, ArrayBuffer, ArrayBufferView} data
   */
  send(data) {
    //switch (typeof data) {
    switch (data.constructor.name) {
      case "String":
        
        break;
      case "Blob":
        
        break;
      case "ArrayBuffer":
        
        break;
      case "ArrayBufferView":
        
        break;
      default:
        console.error(data.constructor.name, typeof data);
        break;
    }
    //#TODO
  }
}

/**
 *
 */
const PresentationConnectionClosedReasons = {error: 0, closed: 1, wentaway: 2};
class PresentationConnectionCloseEventInit {
  /**
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
 * https://w3c.github.io/presentation-api/#idl-def-presentationconnectioncloseevent
 */
class PresentationConnectionCloseEvent extends Event{
  /**
   * @param {DOMString} type
   */
  constructor(type, eventInitDict) {
    
  }
}

/**
 *
 */
class PresentationReceiver {
  constructor() {
    this.connectionList = new Promise((resolve, reject) => {
      
      return resolve();
    });
  }
}

class PresentationConnectionList extends EventTarget {
  constructor() {
    this.connections = [];
    this.onconnectionavailable = null;
  }
}