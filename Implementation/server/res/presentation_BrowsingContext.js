// Presentation API Interfaces
class PresentationRequest {
  constructor(urls) {
    implement(this, EventTarget);
    addEventListeners(this, "connectionavailable", uac);

    uac.tellUA({
      command: "constructPresentationRequest", 
      input: {urls}
    });
  }

  start() {
    return uac.tellUA({
      command: "selectPresentationDisplay",
      input: {presentationRequest: this},
      type: ReturnType.Promise
    });
  }

  reconnect(presentationId) {
    return uac.tellUA({
      command: "reconnect",
      input: {presentationId},
      type: ReturnType.Promise
    });
  }

  getAvailability() {
    return uac.tellUA({
      command: "getAvailability",
      type: ReturnType.Promise
    });
  }
}

class PresentationAvailability {}

class PresentationConnectionList {
  constructor() {
    implement(this, EventTarget);
    addReadOnlys(this, ["connections"]);
    addEventListeners(this, ["connectionavailable"], uac);
  }
}

class PresentationConnection {
  constructor() {
    implement(this, EventTarget);
    addEventListeners(this, ["connect", "close", "terminate", "message"], uac);
    addReadOnlys(this, ["id", "url", "state"]);
    this.binaryType = BinaryType.arrayBuffer;
  }

  close() {
    uac.tellUA({
      command: "closePresentationConnection",
      input: {
        presentationConnection: this,
        closeReason: PresentationConnectionClosedReasons.closed,
        closeMessage: ""
      }
    })
  }

  terminate() {
    uac.tellUA({
      command: "terminatePresentationConnection",
      input: {presentationConnection: this}
    })
  }

  send(data) {
    uac.tellUA({
      command: "send",
      input: {
        presentationConnection: this,
        data
      }
    });
  }
}

class PresentationConnectionAvailableEvent extends Event {}
class PresentationConnectionCloseEvent extends Event {} 

/**
 * 6.6
 * https://w3c.github.io/presentation-api/#interface-presentationreceiver
 */
class PresentationReceiver {
  /**
   * 6.6
   * create receiver inside {ReceivingContext}
   */
  constructor() {
    Object.defineProperty(this, "connectionList", {
      get: () => {
        return uac.tellUA({
          command: "getConnectionList",
          type: ReturnType.Promise
        });
      }
    });
  }
}

class PresentationConnectionList {}

const Miscellaneous = {
  // 6.3.3
  startDefaultPresentationRequest: (D) => {
    let defaultReq = window.navigator.presentation.defaultRequest;
    if (defaultReq === null) {
      return;
    }
    uac.tellUA({
      command: "startDefaultPresentationRequest",
      input: {
        W: document, 
        PresentationRequest: defaultReq,
        D: D
      }
    });
  }
}