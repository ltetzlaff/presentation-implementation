# AWT Presentation API

## Questions

### Which Version is targeted?

Draft vs last cr (06/16) ?? #TODO

### Should we do testing?

There is another topic on testing, so ..?



## Topics

### Controller

HTML+JS
`any webcontent` + cast button which initiates discovery of devices

### Receiver

HTML+JS

### Technologies we could make an example on
- any device accessing a certain website with certain parameters
- chrome extension that acts as another display
- chromecast-a-like etc

Mutual for all of those:
- no common local storage
- no common session
- no common origin (CORS)

### Use Cases we might incorporate
- Presentation (Slides, maybe even questions from the audience via live image or something)
- Video sharing (home theater example or sth)
- Chat room
- Some cool game
- Some fancy WebGL

### Backend Options

#### Node.JS as mitm-like service on $serverUrl$

- receiver registering on server as idle by sending `xhr($serverUrl$/host&room=123)` at some point in time
- controller: `xhr($serverUrl$/join&room=123)`
- server returns reference to selected room thus establishing handshake
- Data Transmission?
  - socket.io, maybe WebSockets/WebRTC _(actually not)_

#### P2P $serverUrl$ is $receiverUrl$

- receiver listening
- controller gets $serverUrl$ by local discovery


### Discovery

has to be encapsulated from `any webcontent` because they shall not be allowed to know about the device options the controller has,
thus: evaluate encapsulation method to occult list of cast devices from api users

#### keep it in the browser context

##### use some browser magic

- stuff that works for file api etc
- filechooser doesnt return absolute urls *example*
- _but what if we need it now and not in the next 20 versions of Chrome someday?_

##### use light js magic

- closures
  - *example*
  - _your stuff might get overridden so meh_
- obfuscation
  - make non enumerable properties https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
  - random indices in objects *example*
  - _yeah .._
- es6 symbols + custom wrapper class in between (== famiums `multiscreen.js`)
  - es6 has true private members (symbols)
  - add some custom class e.g. `DeviceChooser` which does the availability checking, keeps it private and returns some anonymized reference to the chosen device
  - ensuring that this is done correctly could be done similarly to file api classes (only allow calls to something being instanceof `DeviceChooser`)
  - user (dev) should be able to call one function in the end

#### move to another context
- iframe
  - https://www.html5rocks.com/en/tutorials/security/sandboxed-iframes/
  - http://webagility.com/posts/web-components-vs-iframes
- shadow dom / html imports
  - http://stackoverflow.com/a/28518932
- chrome extension