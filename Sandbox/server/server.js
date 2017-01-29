"use strict";
const express = require('express');
const e = express();
const path = require('path');
const http = require('http');
//const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');


// ---   SETUP    ---
e.set('port', process.env.PORT || 80); //http #yolo

// view engine setup
e.set('views', path.join(__dirname, 'html'));
e.set('view engine', 'pug');
//e.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
e.use(logger('dev'));
e.use(bodyParser.json());
e.use(bodyParser.urlencoded({ extended: false }));
e.use(cookieParser());
e.use(express.static(path.join(__dirname, 'res')));

// ---   LOGIC    ---
class Receiver {
  constructor(id, url) {
    this.id = id;
    this.url = url;
  }

  notify(type, msg) {
    // #TODO handle via sth like socketio
  }
}
class Controller {
  
}
// {[Receiver]}
const receivers = [];
// {[Controller]}
const controllers = [];

// ---   ROUTES   ---
const router = express.Router();

// List all participants etc
router.get("/", (req, res) => {
  res.render("overview", {title: "Overview"});
});

let simpleRoutes = ["receiver", "demoPage", "controller"].forEach(page => {
  router.get("/" + page, (req, res) => {
    res.render(page, {title: page})
  });
})

router.post("/join", (req, res) => {
  let form = req.body; // {id: "Room1", name: "John Doe", url: "123.gg/room1"}
  receivers.find(r => r.id === form.id).notify("joined", form.name);
  console.log("controller:", form);
  res.send("OK");
})

router.post("/host", (req, res) => {
  let form = req.body;
  receivers.push(new Receiver(form.id, form.url));
  console.log("receiver:", form);
  res.send("OK");
});

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
const io = require('socket.io').listen(server); //attached to webserver

/*io.sockets.on('connection', function(socket) {
	console.log("connected");
  
  // disconnect
  socket.on('disconnect', function(socket) {
    console.log("disconnected");
  });
});*/


module.exports = e;