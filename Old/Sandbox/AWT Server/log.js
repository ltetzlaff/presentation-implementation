var config = require('config');
var log;

if(config.util.getEnv('NODE_ENV') == 'test') {
    log = function log(message){
    }
}else{
    log = function log(message){
        console.log(message);
    }
}
    


module.exports = log