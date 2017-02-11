let p = window.navigator.presentation;
ready(() => {
  $("#host").addEventListener("click", () => {
    let select = $("#displaySelector");
    let display = JSON.parse(select.options[select.selectedIndex].value);
    p.allowed = DiscoveryAllowance.none;
    p.refreshContinousMonitoring();
    p.receiver = new PresentationReceiver(display);
    
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
  });
});