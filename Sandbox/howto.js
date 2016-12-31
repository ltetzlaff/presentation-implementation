// Usage Vision
// Highly WIP, do not rely on anything i write here

// create Presentation instance
dd = new DeviceDiscoverer();

// apply custom implementation flavor
let ic = new ImplementationConfig("#TODO");
dd.configure(ic);

/*
there are multiple possibilities here in the 2-UA domain, e.g but not limited to:
- p2p handshake + data exchange
- server-"guided" handshake, p2p data exchange
- server-"guided" handshake + data exchange

1-UA could be done by being both a controller and a receiver and shipping the rendered result to any destination in a hook function
*/

// -------

// Create receiver
dd.receiver = new PresentationReceiver("#TODO")

// - OR -

// Create controller
dd.set("monitorHandler", () => {
  return new Promise((resolve, reject) => {
    "#TODO";
  });
});
dd.set("connectHandler", (id, url) => {
  return new Promise((resolve, reject) => {
    "#TODO";
  });
});
dd.set("sendHandler", (presMsgType, presMsgData) => {
  return new Promise((resolve, reject) => {
    "#TODO";
  });
});