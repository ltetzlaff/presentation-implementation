let demoDisplays = [{id: "Display One", technology: "HDMI"}, {id: "Wireless Display", technology: "Chromecast"}];
let demoRoomName = "Demo Room";
let server = "";

/*
 #TODO cancel the selection (denying permission).
 #TODO show the user whether an available display is currently in use,
 to facilitate presentations that can make use of multiple displays.
*/
let selectDisplayUI = (displays) => {
  return new Promise((resolve, reject) => {
    // Load + Reference iframe
    let picker = createContext("/selectDisplay.html");
    
    // Communication from iframe (get selected display)
    window.addEventListener("message", function (e) {
      if (e.source === picker.contentWindow) {
        window.removeEventListener("message", this);
        picker.remove();

        let selectedId = e.data;
        let selectedDisplay = displays.find(d => d.display.id === selectedId);
        resolve(selectedDisplay);
      }
    });
    
    // Communication to iframe (send displays to choose from)
    picker.onload = () => {
      let displayIds = [];
      displays.forEach(apd => {
        displayIds.push(apd.display.id);
      });
      picker.contentWindow.postMessage(displayIds, "*");  
    }
  });
}; 

const solutions = {
  mockup: {
    monitor         :  () => Promise.resolve(demoDisplays),
    selectDisplay   :  (displays) => Promise.resolve(demoDisplays[0]),
    connect         :  () => Promise.resolve(true),
    send            :  () => Promise.reject(),
    receive         :  (type, data) => Promise.reject(),
    close           :  (reason) => Promise.reject(),
    host            :  (receiverId, receiverUrl) => Promise.resolve()
  },
  ajax: {
    monitor         :  () => ajax("get", server + "/monitor"),
    selectDisplay   :  (displays) => selectDisplayUI(displays),
    connect         :  () => ajax(server + "/join"), // #TODO
    send            :  () => Promise.reject(),
    receive         :  (type, data) => Promise.reject(),
    close           :  (reason) => Promise.reject(),
    host            :  (receiverId, receiverUrl) => {
      // Register Host on Server
      return ajax("post", "/host", {id: receiverId, url: ""}); 
      // because this implementation only relies on the server there is no need for more than one unique identifier
    }
  },
  socketio: {
    monitor         :  () => Promise.reject(),
    selectDisplay   :  (displays) => Promise.reject(),
    connect         :  () => Promise.reject(),
    send            :  () => Promise.reject(),
    receive         :  (type, data) => Promise.reject(),
    close           :  (reason) => Promise.reject(),
    host            :  (receiverId, receiverUrl) => Promise.resolve()
  },
  local: {
    monitor         :  () => Promise.reject(),
    selectDisplay   :  (displays) => Promise.reject(),
    connect         :  () => Promise.reject(),
    send            :  () => Promise.reject(),
    receive         :  (type, data) => Promise.reject(),
    close           :  (reason) => Promise.reject(),
    host            :  (receiverId, receiverUrl) => Promise.resolve()
  },
  extension: {
    monitor         :  () => Promise.reject(),
    selectDisplay   :  (displays) => Promise.reject(),
    connect         :  () => Promise.reject(),
    send            :  () => Promise.reject(),
    receive         :  (type, data) => Promise.reject(),
    close           :  (reason) => Promise.reject(),
    host            :  (receiverId, receiverUrl) => Promise.resolve()
  }
}

window.navigator.presentation = new Presentator();
let config = new ImplementationConfig("node socketio", {
  monitor         :  solutions.ajax.monitor,
  selectDisplay   :  solutions.ajax.selectDisplay,
  connect         :  solutions.ajax.connect,
  send            :  solutions.ajax.send,
  receive         :  solutions.ajax.receive,
  close           :  solutions.ajax.close,
  host            :  solutions.ajax.host
});
window.navigator.presentation.configure(config);