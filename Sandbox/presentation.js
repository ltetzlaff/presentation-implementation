/**
 * Custom class that opens the API to the user (dev)
 * 6.4.4 Monitor list of available presentation displays
 * https://w3c.github.io/presentation-api/#dfn-monitor-the-list-of-available-presentation-displays
 */
class DeviceDiscoverer {
  // #TODO some class that handles the monitoring
  constructor() {
    this.monitorHandler = () => {};
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

    if (this.allowed) {
      setInterval(this.monitor(), SCAN_PERIOD)
    }
  }
  
  /**
   * 6.4.4 Monitoring the list of available presentation Displays
   * @return {Promise}
   */
  monitor() {
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
  
  
  /*
  #TODO
  When a PresentationAvailability object is no longer alive (i.e., is eligible for garbage collection), the user agent should run the following steps:
    - Find and remove any entry (A, availabilityUrl) in the set of availability objects for the newly deceased A.
    - If the set of availability objects is now empty and there is no pending request to select a presentation display, cancel any pending task to monitor the list of available presentation displays for power saving purposes, and set the list of available presentation displays to the empty list.
  */
  
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
  // #TODO
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
 */
function getSandboxingFlag() {
  // i have no idea
  return false;
}

function isSandboxedPresentation() {
  return getSandboxingFlag();
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
      if (isMixedContentMismatch(this.presentationUrls) || isSandboxedPresentation()) { // 2. - 5.
        return reject(new SecurityError());
      }
      
      // #TODO 6.
      // this.presentationUrls
      // #TODO 7-14 https://w3c.github.io/presentation-api/#dom-presentationrequest-start
      return resolve();
    });
  }
  
  
  /**
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
        let value = dd.availablePresentationDisplays.some(apd => {
          return presentationUrls.includes(apd.presentationUrl);
        });
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

const PresentationConnectionState = ["connecting", "connected", "closed", "terminated"];
const BinaryType = ["blob", "arraybuffer"];
/**
 * 6.5
 * https://w3c.github.io/presentation-api/#idl-def-presentationconnection
 * @param {USVString} id
 * @param {USVString} url
 * @param {PresentationConnectionState} state
 */
class PresentationConnection extends EventTarget {
  constructor() {
    readOnly(this, "id", id);
    readOnly(this, "url", url);
    readOnly(this, "state", PresentationConnectionState[0]);
    
    this.onconnect = null;
    this.onclose = null;
    this.onterminate = null;
    
    // Communication
    this.onmessage = null;
    this.binaryType = BinaryType[1];
  }
  
  close() {
    //#TODO
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
const PresentationConnectionClosedReasons = ["error", "closed", "wentaway"];
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