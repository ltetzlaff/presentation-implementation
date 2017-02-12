let p = window.navigator.presentation;
p.allowed = DiscoveryAllowance.none;
p.refreshContinousMonitoring();

// Whoever has this script loaded is a Presentation.
// .receiver can be accessed to retrieve reference to the 'receiving browsing context'
let D = {displayName: "Display One", displayId: guid()};
p.receiver = new PresentationReceiver(D);

ready(() => {
  $("#displayDescription").innerHTML = D.displayName;
});  

// #TODO send me to "http://localhost/demoPage"

    /*
    // Example code
    var addConnection = function(connection) {
      this.onmessage = function (message) {
        if (message.data == "say hello")
          this.send("hello");
      };
    };
  
    p.receiver.connectionList.then(function (list) {
      list.connections.map(function (connection) {
        addConnection(connection);
      });
      list.onconnectionavailable = function (evt) {
        addConnection(evt.connection);
      };
    });
  });*/
