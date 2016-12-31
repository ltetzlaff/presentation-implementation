let monitorHandler = () => {
  return Promise.resolve([{id: "Display One", technology: "HDMI"}, {id: "Wireless Display", technology: "Chromecast"}]);
};
let connectHandler = () => {
  // #TODO
};
let config = new ImplementationConfig("node socketio", monitorHandler, connectHandler, sendHandler, receiveHandler, closeHandler, hostHandler);