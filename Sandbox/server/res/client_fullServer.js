let demoDisplays = [{id: "Display One", technology: "HDMI"}, {id: "Wireless Display", technology: "Chromecast"}];
let demoRoomName = "Demo Room";

/*
 The details of implementing the permission request and display selection are left to the user agent;
 for example it may show the user a dialog and allow the user to select an available display (granting permission),
 or cancel the selection (denying permission).
 
 Implementers are encouraged to show the user whether an available display is currently in use,
 to facilitate presentations that can make use of multiple displays.
*/
let displaySelectUI = () => Promise.reject(); // #TODO

const solutions = {
  mockup: {
    monitor         :  () => Promise.resolve(demoDisplays),
    selectDisplay   :  () => Promise.resolve(demoDisplays[0]),
    connect         :  () => Promise.resolve(true),
    send            :  () => Promise.reject(),
    receive         :  (type, data) => Promise.reject(),
    close           :  (reason) => Promise.reject(),
    host            :  (receiverId, receiverUrl) => Promise.resolve()
  },
  ajax: {
    monitor         :  () => ajax("get", server + "/monitor"),
    selectDisplay   :  () => Promise.reject(),
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
    selectDisplay   :  () => Promise.reject(),
    connect         :  () => Promise.reject(),
    send            :  () => Promise.reject(),
    receive         :  (type, data) => Promise.reject(),
    close           :  (reason) => Promise.reject(),
    host            :  (receiverId, receiverUrl) => Promise.resolve()
  },
  local: {
    monitor         :  () => Promise.reject(),
    selectDisplay   :  () => Promise.reject(),
    connect         :  () => Promise.reject(),
    send            :  () => Promise.reject(),
    receive         :  (type, data) => Promise.reject(),
    close           :  (reason) => Promise.reject(),
    host            :  (receiverId, receiverUrl) => Promise.resolve()
  },
  extension: {
    monitor         :  () => Promise.reject(),
    selectDisplay   :  () => Promise.reject(),
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