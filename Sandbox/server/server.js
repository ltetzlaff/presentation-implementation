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

// ---   SETUP    ---
e.set('port', process.env.PORT || 80); //http #yolo

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
class Entity {
  constructor() {
    Object.defineProperty(this, "mailBox", {value: new EventEmitter(), enumerable: false});
  }

  receive(type, data) {
    this.mailBox.emit(type, JSON.stringify(data));
  }

  send(receiver, type, msg) {
    if (!(receiver instanceof Entity)) {
      console.warn("Tried to send message to " + receiver + ", typeof " + typeof receiver);
      return;
    }
    receiver.receive(type, msg);
  }
}

class Receiver extends Entity {
  constructor(id, url, displayName) {
    super();
    this.id = id;
    this.url = url;
    this.displayName = displayName;
    
    // Keep track of controllers
    this.freshControllers = [];
    // [{Controller}]
    this.controllers = [];
  }
}
class Controller extends Entity {
  constructor(name) {
    super();
    this.name = name;
  }
}

const Role = {Controller: 0, Receiver: 1};

// [{Receiver}]
const receivers = [];
// [{Controller}]
const controllers = [];

// ---   ROUTES   ---
// {id: "Room1", name: "John Doe", url: "123.gg/room1"}
const router = express.Router();

// List all participants etc
router.get("/", (req, res) => {
  res.render("overview", {title: "Overview"});
});

["receiver", "demoPage", "controller"].forEach(page => {
  router.get("/" + page, (req, res) => {
    res.render(page, {title: page})
  });
})


// Receiver
function parseQs(req) {
  req.receiver   =   receivers.find(r => r.id   === req.query.id) ||
                     receivers.find(r => r.url  === req.query.url) /*||
                     receivers.find(r => r.displayName === req.query.displayName)*/;
  req.controller = controllers.find(c => c.name === req.query.name);
  req.role = req.query.role !== undefined ? Number.parseInt(req.query.role) : undefined;
}

/**
 * connect
 * @param {string} id - receiver
 */
router.post("/join", (req, res) => {
  parseQs(req);
  if (req.receiver) {
    let newController = new Controller(req.query.name);
    req.receiver.freshControllers.push(newController);
    controllers.push(newController);
    req.receiver.receive("joined", req.query.name);
  } else {
    console.warn("Trying to connect to non-existent Presentation, query:", req.query);
  }
  res.send({});
});

/**
 * createContext
 * @param {string} url - receiver
 */
router.post("/prepareRoom", (req, res) => {
  parseQs(req);
  req.receiver.receive("createContext");
  res.send({});
});

/**
 * send
 * either of these as a recipient:
 * @param {string} id - receiver
 * @param {string} name - controller
 * @param {Role} role - which of the above two sends it
 */
router.post("/sendMail", (req, res) => {
  parseQs(req);
  console.log(req.query)
  let recipients = [], initiator = null;
  switch (req.role) {
    case Role.Controller:
      // Direct message to receiver
      initiator = req.controller;
      recipients = [req.receiver];
      break;
    case Role.Receiver:
      // Broadcast to all controllers
      initiator = req.receiver;
      recipients = req.receiver.controllers;
      break;
    default:
      res.status(401).send("Unknown Role " + req.role).end();
      return;
  }
  
  if (!initiator){
    res.status(401).send("No valid client").end();
    return;
  }
  if (!recipients.length) {
    res.status(404).send("Couldn't find recipient").end();
    return;
  }
  recipients.forEach(recipient => initiator.send(recipient, 'message', req.body.msg));
  res.status(200).end();
  
});

/**
 * receive
 * @param {string} id - receiver
 * @param {string} name - controller
 *
 * @param {Role} role
 */
router.get("/getMail", (req, res) => {
  parseQs(req);
  let recipient = req.receiver || req.controller;
  if (recipient) {
    // Remove old listener bevor adding new one. Just in case the connection timed out
    recipient.mailBox.removeAllListeners("message").once("message", msg => res.send(msg)); // Answer after receiving a message, not before
  } else {
    res.status(404).send("Couldn't find recipient");
  }
});


/**
 * Receivers monitors incoming presentation connections
 * @param {string} id - receiver
 */
router.get("/didSomebodyJoinMe", (req, res) => {
  parseQs(req);
  let r = req.receiver;
  r.mailBox.removeAllListeners("joined").once("joined", () => {
    let returnedList = [];
    r.freshControllers.forEach(freshController => {
      returnedList.push({id: r.id, name: freshController.name});
    });
    r.controllers = r.controllers.concat(r.freshControllers);
    r.freshControllers = [];

    res.send(returnedList);
  })
  
  
});

/**
 * host
 * Receiver marks himself as host here
 * @param {string} id - receiver
 * @param {string} url - controller
 */
router.post("/host", (req, res) => {
  receivers.push(new Receiver(req.query.id, req.query.url, req.query.displayName));
  res.status(200).end()
});

// Controller retrieves displays (receivers that are currently hosting)
router.get("/monitor", (req, res) => {
  res.send(receivers);
});

e.use('/', router);

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