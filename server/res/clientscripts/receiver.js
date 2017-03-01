// .receiver can be accessed to retrieve reference to the 'receiving browsing context'
let D = {displayName: "Display One", displayId: guid()};

let p = window.navigator.presentation;
p.receiver = new PresentationReceiver(D);

// Example code
/*var addConnection = connection => {
  connection.onmessage = messageEvent => {
    console.log(messageEvent);
    connection.send("message pingpong: " + messageEvent.data);
  }
};

p.receiver.connectionList.then(list => {
  list.connections.map(addConnection);
  list.onconnectionavailable = evt => addConnection(evt.connection);
});*/

ready(() => {
  //$("#displayDescription").innerHTML = D.displayName + "<p class='sub'>" + D.displayId + "</p>";
});

/* window.top.connection.onmessage = function (message) {
  onReceive(message.data.type, message.data.msg);
};*/