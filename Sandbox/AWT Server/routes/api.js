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

});


/** GET a new connection to monitor 
* @param :id monitor id
*/
router.get('/connection/:id', function(req, res, next) {
  //res.json({message:'error'});
  throw new Error("Not yet implemented");
})


/**  End connection to monitor
* @param :id session id
*/
.delete('/connectionn/:id', (req, res) => {
  throw new Error("Not yet implemented");
});

/**  Send data to monitor
* @param :id session id
*/
router.post('/message/:id', (req, res) => {
  res.status(200).end();
	messageBus.emit('message' + req.params.id, req.body);  
})

/**  Receive data from monitor (longpolling)
* @param :id session id
*/
router.get('/message/:id', (req, res) => {
  if (req.query.state == -1) {
    res.status(200).end("Timeout");
    return;
  }
  const listenerFun = function (data) {
    res.json(data);
  };
  const addMessageListener = function (res) {
    messageBus.once('message' + req.params.id, listenerFun)
  };
  req.on("close", function () {
    //console.log(listenerFun());
    messageBus.removeListener('message' + req.params.id, listenerFun);
    console.log("Connection closed for: " + req.params.id + ' Events:' + messageBus.listenerCount());
  });
  addMessageListener(res);
  setTimeout(function () {
    messageBus.removeListener('message' + req.params.id, listenerFun);
    res.status(200).end("Timeout");
  }, 20000);
});


module.exports = router;
