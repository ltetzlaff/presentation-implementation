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
  }
}
class Controller extends Entity {
  constructor(name) {
    super();
    this.name = name;
  }
}
// [{Receiver}]
const receivers = [];
// [{Controller}]
const controllers = [];

// ---   ROUTES   ---
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
}

/**
 * connect
 * @param {string} id - receiver
 */
router.post("/join", (req, res) => {
  parseQs(req);
  if (req.receiver) {
    req.receiver.receive("joined", req.query.name);
    controllers.push(new Controller(req.query.name));
  }
  // {id: "Room1", name: "John Doe", url: "123.gg/room1"}
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
 * 
 * the one from the above that was not used:
 * @param {string} from - controller/receiver
 */
router.post("/sendMail", (req, res) => {
  parseQs(req);
  if (req.receiver && req.controller) {
    res.send("Ambigious recipient").end();
    return;
  }
  
  let from = req.query.from;
  let initiator = receivers.find(r => r.id === from) || controllers.find(c => c.name === from);
  let recipient = req.receiver || req.controller;
  if (initiator == null){
    res.status(401).send("No valid client").end();    
    return;
  }
  if (recipient == null) {
    res.status(404).send("Couldn't find recipient").end();
    return;
  }  
  initiator.send(recipient, req.body.type, req.body.msg);
  res.status(200).end();
  
});

/**
 * receive
 * @param {string} id - receiver
 * @param {string} name - controller
 */
router.get("/getMail", (req, res) => {
  parseQs(req);
  let recipient = req.receiver || req.controller;
  if (recipient) {
    // Remove old listener bevor adding new one. Just in case the connection timed out    
    recipient.mailBox.removeAllListeners("message").once("message", msg => res.json(msg)); // Answer after reciving a message, not before   
  } else {
    res.status(404).send("Couldn't find recipient");
  }
  /*
  setTimeout(function () {
    recipient.mailBox.removeListener("message", listenerFun);
    res.status(200).end("Timeout at: " + new Date().toLocaleTimeString());
  }, 5000);*/
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