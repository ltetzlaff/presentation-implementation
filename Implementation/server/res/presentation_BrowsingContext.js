// Presentation API Interfaces
class PresentationRequest {
  constructor(urls) {
    implement(this, EventTarget);
    addEventListeners(this, "connectionavailable");

    uac.tellParent({command: "constructPresentationRequest", input: {urls}});
  }

  start() {
    return uac.tellParent({command: "selectPresentationDisplay"}, ReturnType.Promise);
  }

  reconnect(presentationId) {
    return uac.tellParent({command: "reconnect", input: {presentationId}}, ReturnType.Promise);
  }

  getAvailability() {
    return uac.tellParent({command: "getAvailability"}, ReturnType.Promise);
  }
}


class PresentationAvailability {
  constructor() {
    implement(this, EventTarget);
    addEventListeners(this, ["change"]);
    addReadOnlys(this, ["value"]);    
  }
}


class PresentationReceiver {
  constructor() {    
    addReadOnlys(this, ["connectionList"]);
  }
}

class PresentationConnectionList {
  constructor() {
    implement(this, EventTarget);
    addReadOnlys(this, ["connections"]);
    addEventListeners(this, ["connectionavailable"]);
  }
}



class PresentationConnection {
  constructor() {
    implement(this, EventTarget);
    addEventListeners(this, ["connect", "close", "terminate", "message"]);
    addReadOnlys(this, ["id", "url", "state"]);
    this.binaryType = BinaryType.arrayBuffer;
  }

  close() {
    uac.tellParent({command: "close"})
  }

  terminate() {
    uac.tellParent({command: "terminate"})
  }

  send(data) {
    uac.tellParent({command: "send", input: {data}});
  }
}



const Miscellaneous = {
  // 6.3.3
  startDefaultPresentationRequest: (D) => {
    let defaultReq = window.navigator.presentation.defaultRequest;
    if (defaultReq === null) {
      return;
    }
    uac.tellParent({
      command: "startDefaultPresentationRequest",
      input: {
        W: document, 
        PresentationRequest: defaultReq,
        D: D
      }
    });
  }
}