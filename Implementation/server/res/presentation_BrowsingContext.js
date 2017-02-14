// Presentation API Interfaces
class Presentation {
  constructor() {
    // {PresentationRequest}
    this.defaultRequest = null;
    
    // {PresentationReceiver}
    this.receiver = null;
    
    Object.defineProperty(window.navigator, "presentation", {value: this})
  }
}


class PresentationAvailability {}
class PresentationConnectionList {}
class PresentationConnectionAvailableEvent extends Event {}
class PresentationConnectionCloseEvent extends Event {} 

class PresentationRequest {
  constructor(urls) {
    implement(this, EventTarget);
    addEventListeners(this, "connectionavailable", uac);

    this.objectId = guid();

    uac.tellUA({
      command: "constructPresentationRequest", 
      input: {
        urls
        //objectId: this.objectId,
        //objectToSync: this
      }
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
      input: {presentationRequest: this},
      type: ReturnType.Promise
    });
  }
}

class PresentationConnection {
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