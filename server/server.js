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
  constructor(connectionObject = undefined) {
    // Socket.io
    if (connectionObject !== undefined && connectionObject.constructor.name == 'Socket'){
      makeHiddenProp(this, "conObj",connectionObject); 
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
  constructor(displayName, displayId, connectionObject = undefined) {
    super(connectionObject);
    this.displayName = displayName;
    this.displayId = displayId;
    this.presentationId = null;
    // this assumes that there's only one presentation per display because this will be the usual case

    
    // Keep track of controlling sessions
    makeHiddenProp(this, "sessions", []); // [{sessionId: GUID, controllerName: ""}]
    makeHiddenProp(this, "freshSessions", []);
  }

  removeSession(sessionId) {
    let i = -1;
    i = this.sessions.indexOf(s => s.sessionId === sessionId)
    if (i >= 0) {
      this.sessions.splice(i, 1);
    }
    i = this.freshSessions.indexOf(s => s.sessionId === sessionId);
    if (i >= 0) {
      this.freshSessions.splice(i, 1);
    }
  }

  getSession(sessionId) {
    return this.sessions.find(s => s.sessionId === sessionId) ||
      this.freshSessions.find(s => s.sessionId === sessionId);
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
  let display = displays.find(d => d.displayId === b.displayId);
  if (display) {
    display.displayName = b.displayName; // name has changed apparently
  } else {
    displays.push(new Display(b.displayName, b.displayId));
  }
  res.status(200).end()
});

router.get("/didSomebodyPrepareMe/:displayId", (req, res) => {
  req.display.drain("prepared", c => res.send(c)); // c = context creation info
});

router.get("/monitor", (req, res) => {
  res.send(displays.map(el => {
    return {
      'displayId': el.displayId,
      'displayName': el.displayName
        }
    }
    ));
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
  res.status(200).end();
});

router.get("/didSomebodyJoinMe/:presentationId", (req, res) => {
  let d = req.display;
  if (d) {
    d.drain("joined", () => {
      let returnedList = [].concat(d.freshSessions);
      d.sessions = d.sessions.concat(d.freshSessions);
      d.freshSessions = [];
      res.send(returnedList);
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
    let newSession = new Controller(b.sessionId, b.controllerName);
    req.display.freshSessions.push(newSession);
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
// Everything for the Monitor/Receiver
let monitorIO = io.of('/monitor');

  
// ON connection is going to be equivaletn to /host
monitorIO.on('connection', function(socket){
    console.log('a monior connected');
    let b = socket.handshake.query;
    let display = displays.find(d => d.displayId === b.displayId);
    if (display) {
      display.displayName = b.displayName; // name has changed apparently
      display.conObj = socket;
    } else {
      displays.push(new Display(b.displayName, b.displayId, socket));
    }
    /*
    controllerIO.emit('chat message', monitors.map((el) => {
            return el.getJSONInfo;
        }));
    */

    socket.on('test', function(){
        //monitor.splice(monitor.indexOf(el => el.connectionId == socket.id),1);
        console.log('just for test');
        socket.emit("prepared", "test")
    });

    socket.on('disconnect', function(){
        //monitor.splice(monitor.indexOf(el => el.connectionId == socket.id),1);
        console.log('monitor disconnected');
    });

    // Here goes everything display communication related
    socket.on('prepareMyRoom', function(msg){
      let b = req.body;
      req.display.presentationId = b.presentationId;
      req.display.send("prepared", {
          display: req.display,
          url: b.url,
          presentationId: b.presentationId,
          sessionId: b.sessionId
        });
      // TODO
        console.log('message: ' + msg.msg);
        console.log('id: ' + socket.id);
    });
});
// Everything for the Controller
let controllerIO = io.of('/controller');
// Everything for Socket.io

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

// ---   SOCKET   ---
/*const io = require('socket.io').listen(server); //attached to webserver

io.sockets.on('connection', function(socket) {
	console.log("connected");
  
  // disconnect
  socket.on('disconnect', function(socket) {
    console.log("disconnected");
  });
});*/


module.exports = e;