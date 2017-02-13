// .receiver can be accessed to retrieve reference to the 'receiving browsing context'
p.receiver = new PresentationReceiver(D);
    
// Example code
var addConnection = connection => {
  connection.onmessage = messageEvent => {
    console.log(messageEvent);
    connection.send("message pingpong: " + messageEvent.data);
  }
};

p.receiver.connectionList.then(list => {
  list.connections.map(addConnection);
  list.onconnectionavailable = evt => addConnection(evt.connection);
});


ready(() => {
  $("#displayDescription").innerHTML = D.displayName;
});  