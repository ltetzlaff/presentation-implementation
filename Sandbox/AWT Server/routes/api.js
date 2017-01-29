var express = require('express');
var router = express.Router();
var monitor = require('../monitor');
var log = require('../log.js');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.json({message:'hooray!'});
})

/* GET all Monitors. */
.get('/monitor',(req, res)=>{
  log(monitor.monitors()[0]);
  res.json(monitor.monitors());

})


.post('/monitor', (req, res) => {
  monitor.newMonitor(req.body);
  res.json({message: "monitor created"});

})

.delete('/monitor/:id', (req, res) => {
  monitor.deleteMonitor(req.params.id);
  res.json({message: "monitor created"});

});


module.exports = router;
