let server = "";
let CLIENT_NAME = "John Doe";
let socket = undefined;

const handlers = {
  host            :  (D) => {
    // This resolves to the contextCreationInfo provided by the controller via createContextHandler below
    return new Promise((resolve, reject) => {
      if(socket === undefined){
        socket = io('/host', { query: D });
        socket.on('connect', function(){
          console.log('connected');               
          socket.once('prepared', data => {
            console.log('prepared');
            resolve(data);       
          });   
        });
        
      }
    });
  
  },
  monitor         :  () => ajax("get", server + "/monitor"),
  selectDisplay   :  (displays) => selectDisplayUI(displays),
  createContext   :  (display, url, presentationId, sessionId) => {
    return ajax("post", server + "/prepareMyRoom/" + display.displayId, {url, presentationId, sessionId})
  },
  monitorIncoming : (id, url, cb) => {
    ajaxLong(server + "/didSomebodyJoinMe/" + id, null,
      (newCtrls) => newCtrls && newCtrls.length && newCtrls.forEach(c => cb(c.presentationId))
    );
  },
  connect         :  (id, sessionId, role) => {
    return ajax("post", server + "/join/" + id + "/" + role, {sessionId, controllerName: CLIENT_NAME})
  },
  messageIncoming : (sessionId, role, cb) => {
    ajaxLong(server + "/getMail/" + sessionId + "/" + role, null, (message) => cb(message));
  },
  send            :  (sessionId, role, type, data) => {
    return ajax("post", server + "/sendMail/" + sessionId + "/" + role, {type, data})
  },
  close: (sessionId, role, reason, message) => {
    return ajax("post", server + "/close/" + sessionId + "/" + role, {command: "close", reason, message});
  }
};

let config = new ImplementationConfig("socket-based Example", handlers);

// Global scope of the user agent
let ua = new PresentationUserAgent(config);