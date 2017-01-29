'use strict'


/**
 * One Monitor
 */
class Monitor {

  /**
     * Create a monitor collection.
     * 
     */
  constructor(name, id) {
    this.id = id;
    this.name = name;
    this.limit = false;
    this.connected = [];    
     /**
     * Get all monitors
     * @return returns all connected monitors
     */  
    this.getName = () => {
      return this.name;
    }
    /**
     * Creates a new monitor
     * @param  {} monitor     
     */
    this.getID = () => {
      return this.id;
    };   

    this.getInfo = () => {
      return {id: this.id,
          name: this.name,
          limit: this.limit,
          };
    }; 
  }
};
module.exports = Monitor;