let p = window.navigator.presentation;
p.allowed = DiscoveryAllowance.none;
p.refreshContinousMonitoring();

// Whoever has this script loaded is a Presentation.
// .receiver can be accessed to retrieve reference to the 'receiving browsing context'
let D = {displayName: "Display One", displayId: guid()};
p.receiver = new PresentationReceiver(D);
    
// Example code
var addConnection = connection => {
  window.connection = connection;
  /*connection.onmessage = messageEvent => {
    console.log(messageEvent);
    //connection.send("message pingpong: " + messageEvent.data);
  }*/
};

p.receiver.connectionList.then(list => {
  list.connections.map(addConnection);
  list.onconnectionavailable = evt => addConnection(evt.connection);
});


ready(() => {
  $("#displayDescription").innerHTML = D.displayName;
});  