let demoDisplays = [{id: "Display One", technology: "HDMI"}, {id: "Wireless Display", technology: "Chromecast"}];
let demoRoomName = "Demo Room";

// server-"guided" handshake + data exchange
let monitorHandler = () => {
  return Promise.resolve(demoDisplays);
};
let connectHandler = () => {
  // #TODO
  return Promise.resolve(true);
  //ajax(server + "/join")
};
let sendHandler = (type, data) => {
  console.log("send: " + type + " | " + data);
};
let receiveHandler = (type, data) => {
  // #TODO
  return Promise.reject();
};
let closeHandler = reason => {
  console.log("close: " + reason);
};
// Register Host on Server
let hostHandler = () => {
  // because this implementation only relies on the server there is no need for more than one unique identifier
  return ajax("post", "/host", {id: demoRoomName, url: "not necessary"});
};
let config = new ImplementationConfig("node socketio", monitorHandler, connectHandler, sendHandler, receiveHandler, closeHandler, hostHandler);

dd = new DeviceDiscoverer();
dd.configure(config);