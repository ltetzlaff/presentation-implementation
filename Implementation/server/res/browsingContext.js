// Gatekeeper between parent (= UA) and this context (= browsing context)
class UserAgentConnector {
  constructor() {
    implement(this, EventTarget);

    this.source = null;
    this.origin = null;

    this.memory = {}; // this is a cache for promise-functions
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
    for (let subobj of input) {
      serializeClass(input[subobj]);
    }
    this.source.postMessage(data, this.origin);

    // If Promises are expected a promise should be returned
    let returnValue = null;
    switch(data.type) {
      case ReturnType.Promise:
        data.key = guid();
        console.log("  Remembering Promise-functions at memory-key: ", data.key);
        returnValue = new Promise((res, rej) => this.memory[data.key] = {resolve: res, reject: rej});
        break;
    }
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
    let output = data.output;
    
    switch(data.type) {
      case ReturnType.Promise:
        switch (output.state) {
          case PromiseState.fulfilled:
            this.memory[data.key].resolve(output.value);
            break;
          case PromiseState.rejected:
            this.memory[data.key].reject(output.value);
            break;
          default:
            console.warn("Unknown PromiseState", output);
            break;
        }
        delete this.memory[data.key];
        break;
      case ReturnType.Event:
        let output = event.data.output;
        this.memory[output.recipient].dispatchEvent(new Event(output.eventType, output.eventData));
        break;
    }
  }
}

const uac = new UserAgentConnector();
window.addEventListener("message", uac.receiveMessage, false);
