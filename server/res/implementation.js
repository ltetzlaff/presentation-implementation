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
   

const handlers = {
  host            :  (D) => {
    // This resolves to the contextCreationInfo provided by the controller via createContextHandler below
    return ajax("post", server + "/host", D).then(() => {
      let resolvesIfTruthy = null;
      return ajaxLong(server + "/didSomebodyPrepareMe/" + D.displayId, null,
        (contextCreationInfo) => resolvesIfTruthy = contextCreationInfo,
        () => resolvesIfTruthy
      );
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

class ImplementationConfig {
  /**   
   * @param {String}  name                      - human readable name of the implementation setup
   * @param {Function<Promise>} host            - [R] optional, what happens if you instantiate a new receiver (tell some server maybe?)
   * @param {Function<Promise>} monitor         - how do you seek out for new displays,
   * @param {Function<Promise>} selectDisplay   - [C] select them,
   * @param {Function<Promise>} createContext   - [C] connect to them,
   * @param {Function<Promise>} monitorIncoming - [R] what to set up to be able to handle incoming connections
   * @param {Function<Promise>} connect         - connect to them,
   * @param {Function<Promise>} messageIncoming - what to set up to be able to handle incoming messages
   * @param {Function<Promise>} send            - send messages to them,
   * @param {Function<Promise>} close           - notify them to close connection
   */
  constructor(name, handlers) {
    this.name                 = name;
    ImplementationConfig.Handlers().forEach(h => {
      let handler = h + "Handler";
      this[handler] = handlers[h];
    });
  }

  static Handlers() {
    return ["monitor", "selectDisplay", "createContext", "connect", "send", "close", "host", "monitorIncoming", "messageIncoming"];
  }

  /**
   * Configure API
   * "Implementation-specific" part in spec
   * @param {ImplementationConfig} this
   * @param {Object} obj
   */
  configure(obj) {
    console.log("loaded Implementation: " + this.name);
    ImplementationConfig.Handlers().forEach(h => {
      let handler = h + "Handler";
      obj[handler] = this[handler];
    });

    obj.possible = true;
    obj.refreshContinousMonitoring();
  }
}
let config = new ImplementationConfig("ajax-based Example", handlers);

// Global scope of the user agent
let ua = new PresentationUserAgent(config);