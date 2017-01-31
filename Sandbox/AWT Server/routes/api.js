var express = require('express');
var router = express.Router();
var monitorCollection = require('../monitorCollection');
var log = require('../log.js');

/**
 * 
 * Eventmanagement
 * 
 */
var EventEmitter = require('events').EventEmitter;
var messageBus = new EventEmitter();
messageBus.setMaxListeners(100);
monitorCollection.setMessageBus(messageBus);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.json({message:'hooray!'});
})

/* GET all Monitors. */
.get('/monitor',(req, res)=>{
  log(monitorCollection.getMonitors()[0]);
  res.json(monitorCollection.getMonitors());

})


.post('/monitor', (req, res) => {
  monitorCollection.newMonitor(req.body);
  res.json({message: "monitor created"});

})

.delete('/monitor/:id', (req, res) => {
  monitorCollection.deleteMonitor(req.params.id);
  res.json({message: "monitor created"});
})


.put('/monitor/:id', (req, res) => {
  throw new Error('Not yet implemented');
});

/**  Send data from monitor to controller
* @param :id session id
*/
router.post('/monitor/message/:id', (req, res) => {

  if (messageBus.eventNames().indexOf('controller' + req.params.id) !== -1) {
    messageBus.emit('controller' + req.params.id, req.body);
    res.status(200).end();
  }
  else {
    res.status(404).end();
  }
})

/**  Send data from controller to monitor
* @param :id monitor id
*/
router.post('/controller/message/:id', (req, res) => {

  if (messageBus.eventNames().indexOf('monitor' + req.params.id) !== -1) {
    messageBus.emit('monitor' + req.params.id, req.body);
    res.status(200).end();
  }
  else {
    res.status(404).end();
  }
})

let longpooling = (req, res, listener) => {
  if (req.query.state == -1) {
    res.status(200).end("Timeout");
    return;
  }
  const listenerFun = function (data) {
    res.json(data);
  };
  const addMessageListener = function (res) {
    messageBus.once(listener + req.params.id, listenerFun)
  };
  req.on("close", function () {
    //console.log(listenerFun());
    messageBus.removeListener(listener + req.params.id, listenerFun);
    console.log("Connection closed for: " + req.params.id + ' Events:' + messageBus.listenerCount());
  });
  addMessageListener(res);
  setTimeout(function () {
    messageBus.removeListener(listener + req.params.id, listenerFun);
    res.status(200).end("Timeout at: " + new Date().toLocaleTimeString());
  }, 5000);
};


/**  Receive data from monitor (longpolling)
* @param :id session id
*/
router.get('/controller/message/:id', (req, res) => longpooling(req, res, "controller"));

/**  Receive data from monitor (longpolling)
* @param :id session id
*/
router.get('/monitor/message/:id', (req, res) => longpooling(req, res, "monitor"));


module.exports = router;
