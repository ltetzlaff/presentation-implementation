
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
        if (!ua.monitoring) {
          ua.monitor(this);
        }
        
        ua.letUserSelectDisplay(this.presentationUrls) // 7-9.
        .then(D => {
          // 11. - 12.
          ua.startPresentationConnection(this, D, resolve);
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
   * Reconnect to presentation
   * https://w3c.github.io/presentation-api/#reconnecting-to-a-presentation
   * @param {PresentationRequest} this
   * @param {String} presentationId
   */
  reconnect(presentationId) {
    return new Promise((resolve, reject) => {
      // 3.
      let existingConnection = this.controlledPresentations.find((connection) => {
                                // #TODO: Its controlling browsing context is the current browsing context
                                connection.state != PresentationConnectionState.terminated &&
                                this.presentationUrls.find(url => connection.url == url.toString()) !== undefined &&
                                connection === presentationId
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
                                this.presentationUrls.find(url => connection.url == url.toString()) !== undefined &&
                                connection === id
                              });
      if(existingConnection !== undefined){
        let newConnection = new PresentationConnection(presentationId, existingConnection.url, Role.Controller, guid()); // 2. 3., 4.  
        newConnection.state = state = PresentationConnectionState.connecting; // 5.
        this.controlledPresentations.push(S); // 6.
        resolve(newConnection); // 7.
        // 8.
        queueTask(() => {
          let event = new PresentationConnectionAvailableEvent("connectionavailable", {connection: newConnection});
          fire(event, this);
        });
        newConnection.establish();  // 9.
        return;
      }
      reject(new NotFoundError());  // 7.
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
      return ua.monitor(this).then(() => { // 8.
        this.getAvailabilityPending = null;
        return resolve(A);                                     // 9.
      });
    });
    
    this.getAvailabilityPending = P;
    return P;                                                  // 3.
  }
}