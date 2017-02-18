// Whoever has this script loaded is a Receiving UA.
ready(() => {
  let D = {displayName: $("#displayName").value, displayId: guid()};
  
  ua.hostHandler(D)
  .then(c => ua.createReceivingContext(c.display, c.url, c.presentationId, c.sessionId)); // c is the contextCreationInfo;  
});

