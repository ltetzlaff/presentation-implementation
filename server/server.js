"use strict";
const express = require('express');
const e = express();
const path = require('path');
const http = require('http');
//const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const EventEmitter = require("events").EventEmitter;


//Socket.IO
var io = require('socket.io')(http);

// ---   SETUP    ---
e.set('port', process.env.PORT || 8080); //http #yolo

// view engine setup
e.set('views', path.join(__dirname, 'html'));
e.set('view engine', 'pug');
//e.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// Enable CORS
e.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.sendStatus(200);
    }
    else {
      next();
    }
});

//don't show the log when it is test
if(e.get('env') !== 'test') {
    //use morgan to log at command line
    e.use(logger('dev'));
}
e.use(bodyParser.json());
e.use(bodyParser.urlencoded({ extended: false }));
e.use(cookieParser());
e.use(express.static(path.join(__dirname, 'res')));




// ---   LOGIC    ---
function makeHiddenProp(obj, propName, value) {
  Object.defineProperty(obj, propName, {value: value, writable: true, enumerable: false});
}

class Entity {
  constructor(connectionObject) {
    // Socket.io
    if (connectionObject && connectionObject.constructor.name === "Socket"){
      makeHiddenProp(this, "conObj", connectionObject); 
    }
    makeHiddenProp(this, "mailBox", new EventEmitter());
  }

  drain(type, cb) {
    return this.mailBox.removeAllListeners(type).once(type, cb);
  }
  send(type, msg) {
    if(this.mailBox.listenerCount(type) > 0){
      this.mailBox.emit(type, msg);
    }
    if(this.conObj !== undefined){
      this.conObj.emit(type, msg);
    }
      
  }  
}

class Controller extends Entity {
  constructor(sessionId, controllerName) {
    super();
    this.sessionId = sessionId;
    this.controllerName = controllerName;
  }
}

class Display extends Entity {
  constructor(displayName, displayId, connectionObject) {
    super(connectionObject);
    this.displayName = displayName;
    this.displayId = displayId;
    this.presentationId = null;
    // this assumes that there's only one presentation per display because this will be the usual case
    
    // Keep track of controlling sessions
    makeHiddenProp(this, "sessions", []); // [{sessionId: GUID, controllerName: ""}]
  }

  removeSession(sessionId) {
    let i = this.sessions.indexOf(s => s.sessionId === sessionId)
    if (i >= 0) {
      this.sessions.splice(i, 1);
    }
  }

  getSession(sessionId) {
    return this.sessions.find(s => s.sessionId === sessionId);
  }
}

function addDisplay(requestBody, socket) {
  let display = displays.find(d => d.displayId === requestBody.displayId);
  if (display) {
    display.displayName = requestBody.displayName; // name has changed apparently
  } else {
    displays.push(new Display(requestBody.displayName, requestBody.displayId, socket));
  }
}

const displays = []; // [{Display}]

// ---   ROUTES   ---
const Role = {Controller: 0, Receiver: 1};
const router = express.Router();

// List all participants etc

router.get("/", (req, res) => res.render("overview", {title: "Overview"}));

["receiver", "demoPage", "controller", "demo_video_controller", "demo_video_receiver"].forEach(page => {
  router.get("/" + page, (req, res) => res.render(page, {title: page}));
});

router.param("displayId", (req, res, next, displayId) => {
  req.display = displays.find(d => d.displayId === displayId);
  next();
});
router.param("presentationId", (req, res, next, presentationId) => {
  req.display = req.display || displays.find(d => d.presentationId === presentationId);
  next();
});
router.param("sessionId", (req, res, next, sessionId) => {
  req.display = req.display || displays.find(d => d.getSession(sessionId));
  next();
});
router.param("role", (req, res, next, role) => {
  req.role = Number.parseInt(role);
  next();
})

/**
 * Receiver marks himself as host here
 * req.body: {displayName: "", displayId: ""}
 */
router.post("/host", (req, res) => {
  let b = req.body;
  addDisplay(b);
  res.status(200).end()
});

router.get("/didSomebodyPrepareMe/:displayId", (req, res) => {
  req.display.drain("prepared", c => res.send(c)); // c = context creation info
});

router.get("/monitor", (req, res) => {
  console.log(displays);
  res.send(displays.map(el => {
    return {
      'displayId': el.displayId,
      'displayName': el.displayName
    }
  }));
});

/**
 * req.body: {url: "", id: GUID}
 */
router.post("/prepareMyRoom/:displayId", (req, res) => {
  let b = req.body;
  req.display.presentationId = b.presentationId;
  req.display.send("prepared", {
      display: req.display,
      url: b.url,
      presentationId: b.presentationId,
      sessionId: b.sessionId
    });
  setTimeout(() => res.status(200).end(), 500);
});

router.get("/didSomebodyJoinMe/:presentationId", (req, res) => {
  let d = req.display;
  if (d) {
    d.drain("joined", (joinedCtrl) => {
      res.send(joinedCtrl);
    });
  } else {
    res.status(401).end();
  }
});

/**
 * req.body: {sessionId: GUID, controllerName: ""}
 */
router.post("/join/:presentationId/:role", (req, res) => {
  let b = req.body;
  if (req.display && req.role === Role.Controller) {
    req.display.sessions.push(new Controller(b.sessionId, b.controllerName));
    req.display.send("joined",
      {presentationId: req.params.presentationId, controllerName: b.controllerName});
  }
  res.status(200).end();
});

router.get("/getMail/:sessionId/:role", (req, res) => {
  let recipient;
  switch (req.role) {
    case Role.Controller:
      recipient = req.display.getSession(req.params.sessionId); // get ctrl
      break;
    case Role.Receiver:
      recipient = req.display; // get receiver
      break;
    default:
      res.status(401).send("Unknown Role " + req.role).end();
      return;
  }
  recipient.drain("message", msg => res.send(msg));
});

router.post("/sendMail/:sessionId/:role", (req, res) => {
  let recipient;
  switch (req.role) {
    case Role.Controller:
      recipient = req.display; // get receiver
      break;
    case Role.Receiver:
      recipient = req.display.getSession(req.params.sessionId); // get ctrl
      break;
    default:
      res.status(401).send("Unknown Role " + req.role).end();
      return;
  }
  
  recipient.send("message", req.body.data)
  res.status(200).end();
});

/**
 * req.body: {reason: PresentationConnectionClosedReasons, message: ""}
 */
router.post("/close/:sessionId/:role", (req, res) => {
  let recipient;
  switch (req.role) {
    case Role.Controller:
      recipient = req.display; // get receiver
      break;
    case Role.Receiver:
      recipient = req.display.getSession(req.params.sessionId); // get ctrl
      break;
    default:
      res.status(401).send("Unknown Role " + req.role).end();
      return;
  }

  recipient.send("message", req.body)
  req.display.removeSession(req.params.sessionId);
  res.status(200).end();
});

e.use('/', router);


// --- SOCKET.IO ---
// Everything for the Receiver
let displayIO = io.of('/host');
  
// ON connection is going to be equivaletn to /host
displayIO.on('connection', socket => {
    console.log('a display connected');
    let b = socket.handshake.query;
    addDisplay(b, socket);
    /*
    controllerIO.emit('chat message', monitors.map((el) => {
            return el.getJSONInfo;
        }));
    */

    socket.on('sendMail', (data, cb) =>{
      let c = displays.find(d => d.getSession(data.sessionId)).getSession(data.sessionId);
      c.send("message",data.data);
      cb(true);    
    });

    socket.on('close', (data, cb) => {
        let d = displays.find(d => d.getSession(data.sessionId));
        let c = d.getSession(data.sessionId);
        
        console.log('just for test');
        c.send("message", data);
        d.removeSession(data.sessionId);
        cb(true);    
    });

    socket.on('disconnect', () => {
        //monitor.splice(monitor.indexOf(el => el.connectionId == socket.id),1);
        console.log('monitor disconnected');
    });

    socket.on('joinPresentation', (data, cb) =>{
      // TODO make some check before returning true
      cb(true);

    });
});
// Everything for the Controller
let controllerIO = io.of('/controller');
// Everything for Socket.io

controllerIO.on('connection', socket => {
    console.log('a potential controller connected');
    //let b = socket.handshake.query;
    
    /*
    controllerIO.emit('chat message', monitors.map((el) => {
            return el.getJSONInfo;
        }));
    */

    // Here goes everything display communication related
    socket.on('prepareMyRoom', (data, cb) => {
      let display = displays.find(d => d.displayId === data.displayId);      
      display.presentationId = data.presentationId;
      display.send("prepared", {
          display: display,
          url: data.url,
          presentationId: data.presentationId,
          sessionId: data.sessionId
        });   
      setTimeout(() => cb(true), 200);
    });

    socket.on('sendMail', (data, cb) =>{
      let d = displays.find(d => d.getSession(data.sessionId));
      d.send("message",data.data);
      cb(true);    
    });

    socket.on('monitor', (data, cb) =>{
      cb(displays.map(el => {
        return {
          'displayId': el.displayId,
          'displayName': el.displayName
            }
        }));    
    });

    socket.on('close', (data, cb) => {
        let d = displays.find(d => d.getSession(data.sessionId));
                
        console.log('just for test');
        d.send("message", data);
        d.removeSession(data.sessionId);
        cb(true);    
    });

    // use joinPresentation, because join is already beeing used by socket.io
    socket.on('joinPresentation', (data, cb) =>{
      let display = displays.find(d => d.presentationId === data.presentationId);
      if(display){
        let newSession = new Controller(data.sessionId, data.controllerName);
        display.sessions.push(newSession);
        display.send("didSomebodyJoinMe", {
          presentationId: data.presentationId, controllerName: data.controllerName,
        });
      }
      setTimeout(() => cb(true), 10);

    });
});

// --- End Socket.io ---

// ---   ERRORS   ---
// catch 404 and forward to error handler
e.use((req, res, next) => {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// development error handler
// will print stacktrace
if (e.get('env') === 'development') {
  e.use((err, req, res) => {
    console.log(req.body);
    console.log(err);
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
e.use((err, req, res) => {
  console.log(req.body);
  console.log(err);
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

// ---  SERVER  ---
const server = http.createServer(e);
server.listen(e.get('port'), () => {
	console.log("http server up on port "+ e.get('port'));
});
io.listen(server);

module.exports = e;