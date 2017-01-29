'use strict'
var Monitor = require('./monitor');
var config = require('config');

/**
 * Collection of Monitors
 */
class MonitorCollection {

  /**
     * Create a monitor collection.
     * 
     */
  constructor() {

    this.monitors = [];
    if(config.util.getEnv('NODE_ENV') == 'test') {
      this.monitors.push(new Monitor("conferenz", 123));
    }
    this.messageBus = null;
    
    // Just for testing one monitor

    this.setMessageBus = bus => this.messageBus = bus;
    
    /**
     * Get all monitors
     * @return returns all connected monitors
     */
  
    this.getMonitors = () => {
      return this.monitors.map(el => el.getInfo());
    }
    /**
     * Creates a new monitor
     * @param  {} monitor     
     */
    this.newMonitor = (monitor) => {
      this.monitors.push(new Monitor(monitor.name, monitor.id));      
    }

    /**
     * Connect to monitor with a given id
     * @param  {} id the monitor to connect to
     */
    this.connect = (id) => {
      //TODO: Not working(it's just wrong)
        if(this.monitors.connected.lenght >= limit)
            return false;
        else
            this.monitors.connected. push(id);

    }

    
    /**
     * Deletes Monitor with the given id
     * @param  {} id monitor to be deleted
     */
    this.deleteMonitor = (id) => {        
        this.monitors = this.monitors.filter((el)=>(id != el.getID()));

    }
  }
  
  
 
}

const monitor = new MonitorCollection();
//console.log(monitor.monitors()[0]);
module.exports = monitor;