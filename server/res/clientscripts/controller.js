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

/*
 #TODO show the user whether an available display is currently in use,
 to facilitate presentations that can make use of multiple displays.
*/
let selectDisplayUI = (displays) => {
  return new Promise((resolve, reject) => {
    // Load + Reference iframe
    let picker = createContext("/auxiliary/selectDisplay.html");

    picker.setAttribute("frameBorder", "0");
    //picker.className = "selectDisplay";
    picker.style.width = "300px";
    picker.style.height = "350px";
    picker.style.position = "fixed";
    picker.style.right = "0%";
    picker.style.top = "100px";
    picker.style.zIndex = "10";

    
    // Communication from iframe (get selected display)
    window.addEventListener("message", function (e) {
      if (e.source === picker.contentWindow) {
        window.removeEventListener("message", this);
        picker.remove();

        let selectedDisplay = displays.find(d => d.displayId === e.data);
        if(selectedDisplay === undefined){
          reject("dismissed");
          return;
        }
        resolve(selectedDisplay);
      }
    });
    
    // Communication to iframe (send displays to choose from)
    picker.onload = () => {
      picker.contentWindow.postMessage(displays, "*");
    }
  });
};

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