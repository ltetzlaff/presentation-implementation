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
        if(selectedDisplay == undefined){
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

/**
 * 0. HOST:             Display tells server that it is a potential display (R-UA) (and shows backdrop or sth)
 *                      Promise shall be resolved with the result of 3. later
 * 1. MONITOR:          Monitoring to know which displays are accessible
 * 2. SELECTDISPLAY:    pick a suitable display (frontend)
 * 3. CREATECONTEXT:    tell the display it shall create a context
 * 4. MONITORINCOMING:  how shall the display monitor incoming connections
 * 5. CONNECT:          connect to the bidirectional communication channel
 * 6. MESSAGEINCOMING:  how shall the two UAs receive their messages
 * 7. SEND:             how shall the two UAs send their messages
 * 8. CLOSE:            #TODO
 * 
 */
    

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
      (newCtrls) => newCtrls.forEach(c => cb(c.presentationId))
    );
  },
  connect         :  (id, sessionId, role) => {
    return ajax("post", server + "/join/" + id + "/" + role, {sessionId, controllerName: CLIENT_NAME})
  },
  messageIncoming : (sessionId, role, cb) => {
    ajaxLong(server + "/getMail/" + sessionId + "/" + role, null, (message) => cb(message));
  },
  send            :  (id, sessionId, role, type, data) => {
    return ajax("post", server + "/sendMail/" + sessionId + "/" + role, {type, data})
  },
  close: (conn, reason, message) => {
    // #TODO
    return Promise.reject("Not Implemented yet")
  },
  
  
  
};

class ImplementationConfig {
  /**
   * @param {String}  name                      - human readable name of the implementation setup
   * @param {Function<Promise>} monitor         - how do you seek out for new displays,
   * @param {Function<Promise>} selectDisplay   - [C] select them,
   * @param {Function<Promise>} createContext   - [C] connect to them,
   * @param {Function<Promise>} connect         - connect to them,
   * @param {Function<Promise>} send            - send messages to them,
   * @param {Function<Promise>} close           - notify them to close connection
   * @param {Function<Promise>} monitorIncoming - [R] what to set up to be able to handle incoming connections
   * @param {Function<Promise>} messageIncoming - what to set up to be able to handle incoming messages
   *
   * @param {Function<Promise>} host            - [R] optional, what happens if you instantiate a new receiver (tell some server maybe?)
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
new Presentation();
const ua = new UserAgent(config);
window.addEventListener("message", (e) => ua.receiveMessage(e), false);