const ReturnType = {Promise: 100, Event: 101, void: 102};

// Gatekeeper between parent (= UA) and this context (= browsing context)
class UserAgentConnector {
  constructor() {
    implement(this, EventTarget);

    this.source = null;
    this.origin = null;

    this.memory = {}; // this is a cache for promise-functions

    this.contextId = guid(); // Every child browsing context has this class and must be differentiated by the parent, therefore every child generates it's own unique id

    this.tellParent({command: "registerMe", input: {contextId: this.contextId}})
  }

  /**
   * @param {Object} data
   * @param {ReturnType} type
   */
  tellParent (data, type = ReturnType.void) {
    if (this.source === undefined) { return; }

    data.contextId = this.contextId;

    let returnValue = null;
    console.log("# Telling Parent: ", data);
    
    // Only Promises are relevant here
    switch(type) {
      case ReturnType.Promise:
        let key = guid();
        console.log("  Remembering Promise-functions at memory-key: ", key);
        data.key = key;
        returnValue = new Promise((res, rej) => this.memory[key] = {resolve: res, reject: rej});
        break;
    }

    this.source.postMessage(serializeClass(data), this.origin);
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
    
    switch(type) {
      case ReturnType.Promise:
        this.memory[data.key].resolve(output);
        delete this.memory[data.key];
        break;
      case ReturnType.Event:
        let output = event.data.output;
        this.dispatchEvent(new Event(this.memory[output.recipient], output.eventData));
        break;
    }
  }
}

const uac = new UserAgentConnector();
window.addEventListener("message", uac.receiveMessage, false);
