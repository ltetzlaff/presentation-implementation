let demoDisplays = [{id: "Display One", technology: "HDMI"}, {id: "Wireless Display", technology: "Chromecast"}];
let demoRoomName = "Demo Room";

// server-"guided" handshake + data exchange
let monitor = () => {
  return Promise.resolve(demoDisplays);
};

/*
 The details of implementing the permission request and display selection are left to the user agent;
 for example it may show the user a dialog and allow the user to select an available display (granting permission),
 or cancel the selection (denying permission).
 
 Implementers are encouraged to show the user whether an available display is currently in use,
 to facilitate presentations that can make use of multiple displays.
*/
let displaySelect = () => {
  return Promise.resolve(demoDisplays[0]);
}
let connect = () => {
  // #TODO
  return Promise.resolve(true);
  //ajax(server + "/join")
};
let send = (type, data) => {
  console.log("send: " + type + " | " + data);
};
let receive = (type, data) => {
  // #TODO
  return Promise.reject();
};
let close = reason => {
  console.log("close: " + reason);
};
// Register Host on Server
let host = () => {
  // because this implementation only relies on the server there is no need for more than one unique identifier
  return ajax("post", "/host", {id: demoRoomName, url: "not necessary"});
};


let config = new ImplementationConfig("node socketio", {
  monitor, displaySelect, connect, send, receive, close, host
});
window.navigator.presentation = new Presentator();
window.navigator.presentation.configure(config);