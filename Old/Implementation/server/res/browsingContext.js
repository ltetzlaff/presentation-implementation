// Gatekeeper between parent (= UA) and this context (= browsing context)
class UserAgentConnector {
  constructor() {
    implement(this, EventTarget);

    this.source = null;
    this.origin = null;

    this.promises = {}; // this is a cache for promise-functions
  }

  /**
   * @param {Object} data
   *  @param {ReturnType} data.type
   *  @param {Object} data.input
   * @returns whatever is requested in data.type
   */
  tellUA (data) {
    if (this.source === undefined) { return; }
    
    console.log("# Telling Parent: ", data);

    // Input Objects have to be serialized
    let input = data.input;
    for (let subobj in input) {
      serializeClass(input[subobj]);
    }
    /*if (input.objectId) {
      this.syncedObjects[objectId] = input.objectToSync;
    }*/

    // If Promises are expected a promise should be returned
    let returnValue = null;
    switch(data.type) {
      case ReturnType.Promise:
        data.key = guid();
        console.log("  Remembering Promise-functions at memory-key: ", data.key);
        returnValue = new Promise((res, rej) => this.promises[data.key] = {resolve: res, reject: rej});
        break;
    }
    this.source.postMessage(JSON.parse(JSON.stringify(data)), this.origin);
    return returnValue;
  }

  /**
   * @param {Event} event - message-event emitted from parent
   */
  receiveMessage(event) {
    if (!this.source || !this.origin){
      this.source = event.source;
      this.origin = event.origin;
    }

    /* Do we trust the sender of this message?
    if (event.origin !== "http://localhost"){
      return;
    }
    */
    let data = event.data;
    
    switch(data.type) {
      case ReturnType.Promise:
        switch (data.output.state) {
          case PromiseState.fulfilled:
            this.promises[data.key].resolve(data.output.value);
            break;
          case PromiseState.rejected:
            this.promises[data.key].reject(data.output.value);
            break;
          default:
            console.warn("Unknown PromiseState", data.output);
            break;
        }
        delete this.promises[data.key];
        break;
      case ReturnType.Event:
        let output = event.data.output;
        this.promises[output.recipient].dispatchEvent(new Event(output.eventType, output.eventData));
        break;
      case ReturnType.Sync:
        break;
    }
  }
}

const uac = new UserAgentConnector();
window.addEventListener("message", (e) => uac.receiveMessage(e), false);
let p = new Presentation();