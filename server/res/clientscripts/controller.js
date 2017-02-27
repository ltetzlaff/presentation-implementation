let p = window.navigator.presentation;

function remember(key) {
  return localStorage[key];
}

function learn(key, value) {
  localStorage[key] = value;
}

function forget(key) {
  //localStorage[key] = null;
  delete localStorage[key];
}

forget("presentationId");

let playing = false;
let activeConnection;

ready(() => {
  $("#discoveryAllowance").addEventListener("change", function() {
    p.allowed = Number.parseInt(this.options[this.selectedIndex].value);
    p.refreshContinousMonitoring();
  });

  let presBtn = $("#present");
  
  function handleAvailability(value) {
    console.log("handleAvailability", value);
    if (value) {
      presBtn.classList.add("available");
    } else {
      presBtn.classList.remove("available");
    }
  }

  let receiverPage = getBaseUrl() + "demo_video_receiver";
  let request = new PresentationRequest(receiverPage);
  p.defaultRequest = request;
  request.getAvailability()
  .then(availability => {
    handleAvailability(availability.value);
    availability.onchange = function() { handleAvailability(this.value);};
  })
  .catch(() => handleAvailability(false));
  
  let setConnection = conn => {
    learn("presentationId", conn.id);
    activeConnection = conn;
    activeConnection.onconnect = () => {
      presBtn.classList.add("connected");
      
      activeConnection.onmessage = msg => {
        console.log(activeConnection.id + " | message: ", msg);
      }

      // Lets notice how it loads delayed
      setTimeout(() => {
        activeConnection.send({command: "load", url: $("#video").getAttribute("src")})
      }, 2000);
      
    };
    
    activeConnection.onclose = () => {
      activeConnection = null;
      presBtn.classList.remove("connected");
      presBtn.classList.add("closed");
    };
    
    activeConnection.onterminate = () => {
      forget("presentationId");
      activeConnection = null;
      presBtn.classList.remove("connected", "closed");
      presBtn.classList.add("terminated");
    };
  };

  presBtn.onclick = () => {
    if (activeConnection) {
      console.log("closing");
      activeConnection.close();
    } else if (remember("presentationId")) {
      console.log("reconnecting");
      request.reconnect(remember("presentationId")).then(setConnection);
    } else {    
      request.start().then(setConnection);
    }
  };

  $("#playpause").onclick = function() {
    activeConnection.send({command: playing ? "pause" : "play"});
    if (playing) {
      this.classList.remove("playing");
    } else {
      this.classList.add("playing");
    }
    
    playing ^= true;
  };
});