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
    let picker = createIframe("/auxiliary/selectDisplay.html");

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
  host            :  (D, cb) => {
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
  send            :  (id, sessionId, role, type, data) => {
    return ajax("post", server + "/sendMail/" + sessionId + "/" + role, {type, data})
  },
  close: (conn, reason, message) => {
    // #TODO
    return Promise.reject("Not Implemented yet")
  },
  
  
  
};

window.navigator.presentation = new Presentator();
let config = new ImplementationConfig("ajax-based Example", handlers);
window.navigator.presentation.configure(config);