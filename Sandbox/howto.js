// Usage Vision
// Highly WIP, do not rely on anything i write here

// create Presentation
let pres = new Presentation();
dd = new DeviceDiscoverer("#TODO");

// Create receiver
pres.receiver = new PresentationReceiver("#TODO")


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