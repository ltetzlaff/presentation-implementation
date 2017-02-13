// ---  DEV API  ---
// window.navigator.presentation = new Presentator();

/**
 * Custom class that opens the API to the user (dev)
 */
class Presentator extends Presentation { 
  /**
   * 6.5.2.4
   * Using an implementation specific mechanism, transmit the contents of messageOrData as the presentation message data and messageType as the presentation message type to the destination browsing context.
   * @param {PresentationMessageType} presentationMessageType
   * @param {string|binary} presentationMessageData
   * @param {string} id
   * @param {Role} role
   */
  send(id, sessionId, role, presentationMessageType, presentationMessageData) {
    // example: {string: 'Hello, world!', lang: 'en-US'}") from https://w3c.github.io/presentation-api/#passing-locale-information-with-a-message
    return this.sendHandler(id, sessionId, role, presentationMessageType, presentationMessageData);
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
  connect(id, sessionId, role) {
    this.closing = false;
    return this.connectHandler(id, sessionId, role);
  }
  
  /**
   * Notify other party to close the connection
   * https://w3c.github.io/presentation-api/#dfn-close-a-presentation-connection
   * @param {PresentationConnection} presentationConnection
   * @param {PresentationConnectionClosedReasons} closeReason
   * @param {string} closeMessage
   */
  close(presentationConnection, closeReason, closeMessage) {
    if (this.closing) {
      return; // 1.
    }
    queueTask(() => { // 2.
      this.closing = true;
      let states = [
        PresentationConnectionState.closed,
        PresentationConnectionState.connecting,
        PresentationConnectionState.connected
      ];
      if (!(includes(states, presentationConnection.state))) {
        return; // 2.1.
      }
      if (presentationConnection.state !== PresentationConnectionState.closed) {
        presentationConnection.state = PresentationConnectionState.closed; // 2.2.
      }
      let event = new PresentationConnectionCloseEvent("close", new PresentationConnectionCloseEventInit(closeReason, closeMessage));
      fire(event, presentationConnection);
    });
    return this.closeHandler(presentationConnection, closeReason, closeMessage);
  }
}