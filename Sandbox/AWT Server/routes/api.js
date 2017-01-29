var express = require('express');
var router = express.Router();
var monitorCollection = require('../monitorCollection');
var log = require('../log.js');

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
router.post('/send/:id', (req, res) => {
  throw new Error("Not yet implemented");
})

/**  Receive data from monitor (longpolling)
* @param :id session id
*/
router.post('/receive/:id', (req, res) => {
  throw new Error("Not yet implemented");
})



module.exports = router;
