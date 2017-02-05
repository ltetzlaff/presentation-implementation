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

const handlers = {
  monitor         :  () => ajax("get", server + "/monitor"),
  selectDisplay   :  (displays) => selectDisplayUI(displays),
  createContext   :  (url) => ajax("post", server + "/prepareRoom", {url: url}),
  connect         :  (id, url) => ajax("post", server + "/join", {sessionId: id, url: url, name: CLIENT_NAME}),
  send            :  (type, data) => Promise.reject(),
  receive: (UA) => {
    // #TODO
    /*let fct = function() {
      ajax("get", server + "/getMail").then(mail => {
        UA.dispatchEvent(new Event("data", mail));
      });
      setTimeout(fct, 1000);
    };*/
  },
  close: (conn, reason, message) => {
    // #TODO
    return Promise.reject()
  },
  host: (id, url, displayName) => {
    // Register Host on Server
    return ajax("post", server + "/host", {id: id, url: url, displayName: displayName}); 
  },
  monitorIncoming : (id, url, presentationReceiver) => {
    ajaxLong(server + "/didSomebodyJoinMe",
            {id: id, url: url},
            (message) => message.forEach(joinedController => presentationReceiver.handleClient(joinedController.id))
    ); 
  },
  messageIncoming : (id, url, presentationConnection) => {
    ajaxLong(server + "/getMail",
            {id: id, url: url},
            (message) => presentationConnection.receive(PresentationMessageType.text, message.data)
    ); 
  }
};

window.navigator.presentation = new Presentator();
let config = new ImplementationConfig("ajax-based Example", handlers);
window.navigator.presentation.configure(config);