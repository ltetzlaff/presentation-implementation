# Usage Vision

More implementation Notes, therefore highly WIP, do not rely on anything i write here :)

## Setup

```js
// create Presentation instance
dd = new DeviceDiscoverer();

// apply custom implementation flavor
let ic = new ImplementationConfig(~);
dd.configure(ic);
```

The Parameters for the `ImplementationConfig` are now what matters, there are multiple possibilities here in the 2-UA domain, e.g but not limited to:
- *(full p2p)* p2p handshake + data exchange
- *(server handshake)* server-"guided" handshake, p2p data exchange
- *(full server)* server-"guided" handshake + data exchange

1-UA could be done by being both a controller and a receiver and shipping the rendered result to any destination in a hook function.
Testing against a somewhat binary identity of a browser context (for 1-UA as mentioned before) should be done later.

## Usage

### Receiver

```js
// Create receiver
dd.receiver = new PresentationReceiver("#TODO")
```

### Controller

```js
// Create controller
let url = "";
let req = new PresentationRequest(url);
```