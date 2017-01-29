'use strict'


/**
 * Collection of Monitors
 */
class Monitors {

  /**
     * Create a monitor collection.
     * 
     */
  constructor() {


    // Just for testing one monitor
    var monitors = [{
    id: 123,
    name: "conference room",
    limit: false,
    connected: [],
  
    }];
    /**
     * Get all monitors
     * @return returns all connected monitors
     */
  
    this.monitors = () => {
      return monitors;
    }
    /**
     * Creates a new monitor
     * @param  {} monitor     
     */
    this.newMonitor = (monitor) => {
      monitors.push(monitor);      
    }

    /**
     * Connect to monitor with a given id
     * @param  {} id the monitor to connect to
     */
    this.connect = (id) => {
        if(monitors.connected.lenght >= limit)
            return false;
        else
            monitors.connected. push(id);

    }

    
    /**
     * Deletes Monitor with the given id
     * @param  {} id monitor to be deleted
     */
    this.deleteMonitor = (id) => {        
        monitors = monitors.filter((el)=>(id != el.id));

    }
  }
  
  
 
}

const monitor = new Monitors();
console.log(monitor.monitors()[0]);
module.exports = monitor;