let UI = {
  disabledColor: "#999",
  enabledColor: "#000",
  connect: () => {
    $("#connect").style.color = UI.disabledColor;
    $("#disconnect").style.color = UI.enabledColor;
  },
  disconnect: () => {
    $("#connect").style.color = UI.enabledColor;
    $("#disconnect").style.color = UI.disabledColor;
  }
}

ready(() => {
  $("#stop").addEventListener("click", () => {
    window.activeConnection.terminate();
  });

  $("#send").onchange = function() {
    window.activeConnection.send(this.value);
  };

  $("#disconnect").addEventListener("click", () => {
    window.activeConnection.close();
  });

  $("#connect").addEventListener("click", () => {
    let p = window.navigator.presentation;
    p.defaultRequest = new PresentationRequest($("#url").value);
    p.defaultRequest.onconnectionavailable = e => {
      // Disconnect prior connections
      // #TODO https://w3c.github.io/presentation-api/#monitor-connection-s-state-and-exchange-data-example

      window.activeConnection = e.connection;
      let conn = window.activeConnection;
      
      conn.onconnect = () => {
        UI.connect();

        conn.onmessage = messageEvent => {
          console.log("received message:", messageEvent.data);
          //conn.send("Message Pingpong");
        }
      }
      conn.onclose = () => {
        UI.disconnect();
      }
    }

    // Go
    p.defaultRequest.getAvailability().then(a => {
      console.log("availability: ", a);
      p.defaultRequest.start().catch(e => console.log(e));
    });
  });
});