let demoDisplays = [{displayName: "Display One", url: "http://localhost/demoPage"}, {displayName: "Wireless Display", url: "http://localhost/displays/wireless"}];
let demoRoomName = "Demo Room";
let server = "";
let CLIENT_NAME = "John Doe";

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

        let selectedDisplay = displays.find(d => d.displayName === e.data);
        resolve(selectedDisplay);
      }
    });
    
    // Communication to iframe (send displays to choose from)
    picker.onload = () => {
      let displayNames = [];
      displays.forEach(d => {
        displayNames.push(d.displayName);
      });
      picker.contentWindow.postMessage(displayNames, "*");  
    }
  });
}; 

const solutions = {
  mockup: {
    monitor         :  () => Promise.resolve(demoDisplays),
    selectDisplay   :  (displays) => Promise.resolve(demoDisplays[0]),
    createContext   :  (url) => Promise.reject(),
    connect         :  (id, url) => Promise.resolve(true),
    send            :  (type, data) => Promise.reject(),
    receive         :  () => Promise.reject(),
    close           :  (reason) => Promise.reject(),
    host            :  (id, url, displayName) => Promise.resolve()
  },
  ajax: {
    monitor         :  () => ajax("get", server + "/monitor"),
    selectDisplay   :  (displays) => selectDisplayUI(displays),
    createContext   :  (url) => ajax("post", server + "/prepareRoom", {url: url}),
    connect         :  (id, url) => ajax("post", server + "/join", {sessionId: id, url: url, name: CLIENT_NAME}),
    send            :  (type, data) => Promise.reject(),
    receive         :  (UA) => {
      let fct = function() {
        ajax("get", server + "/getMail").then(mail => {
          UA.dispatchEvent(new Event("data", mail));
        });
        setTimeout(fct, 1000);
      };
    },
    close           :  (reason) => Promise.reject(),
    host            :  (id, url, displayName) => {
      // Register Host on Server
      return ajax("post", server + "/host", {id: id, url: url, displayName: displayName}); 
      // because this implementation only relies on the server there is no need for more than one unique identifier
    }
  },
  socketio: {
    monitor         :  () => Promise.reject(),
    selectDisplay   :  (displays) => Promise.reject(),
    createContext   :  (url) => Promise.reject(),
    connect         :  (id, url) => Promise.reject(),
    send            :  (type, data) => Promise.reject(),
    receive         :  () => Promise.reject(),
    close           :  (reason) => Promise.reject(),
    host            :  (id, url, displayName) => Promise.resolve()
  },
  local: {
    monitor         :  () => Promise.reject(),
    selectDisplay   :  (displays) => Promise.reject(),
    createContext   :  (url) => Promise.reject(),
    connect         :  (id, url) => Promise.reject(),
    send            :  (type, data) => Promise.reject(),
    receive         :  () => Promise.reject(),
    close           :  (reason) => Promise.reject(),
    host            :  (id, url, displayName) => Promise.resolve()
  },
  extension: {
    monitor         :  () => Promise.reject(),
    selectDisplay   :  (displays) => Promise.reject(),
    createContext   :  (url) => Promise.reject(),
    connect         :  (id, url) => Promise.reject(),
    send            :  (type, data) => Promise.reject(),
    receive         :  () => Promise.reject(),
    close           :  (reason) => Promise.reject(),
    host            :  (id, url, displayName) => Promise.resolve()
  }
}

window.navigator.presentation = new Presentator();
let config = new ImplementationConfig("node socketio", {
  monitor         :  solutions.ajax.monitor,
  selectDisplay   :  solutions.ajax.selectDisplay,
  createContext   :  solutions.ajax.createContext,
  connect         :  solutions.ajax.connect,
  send            :  solutions.ajax.send,
  receive         :  solutions.ajax.receive,
  close           :  solutions.ajax.close,
  host            :  solutions.ajax.host
});
window.navigator.presentation.configure(config);