// Gatekeeper between parent (= UA) and this context (= browsing context)
let ua = {};
implement(ua, EventTarget);
const MessageType = {Promise: 100, Event: 101};
// #TODO let context ask ua to execute a function and return a promise

// Presentation API Interfaces
// #TODO

function sendMessageToParent(data){
    if(ua.source === undefined){
        return;
    }    
    ua.source.postMessage(data, "dieseURL");
}

function receiveMessage(event){
    if(ua.source === undefined){
        ua.source === event.source;
    }

    /* Do we trust the sender of this message?
        if (event.origin !== "http://localhost"){
            return;
        }
      */      
    ua.dispatch(new Even(event.data.recipient, event.data));    
}

/**
 * Protocol From Parent
 * event.data ->
 * {
 *      recipient,
 *      data 
 * }
 * 
 *  * Protocol To Parent
 * event.data ->
 * {
 *      command,
 *      data 
 *      + extra elemtents depending on command, for example session_id
 * }
 * 
 */


class PresentationConnection{
    constructor(session_id){
        implement(this, EventTarget);        
        this.session_id = session_id;
        this.onmessage = null;
        this.addEventListener(this, "message" + session_id, (data) =>{
            onmessage(data.data);
        });
    }
    send(data){
        sendMessageToParent(
            { 
                command: "send",
                sId: session_id,
                data: data
            }
            );
    }

}


window.addEventListener("message", receiveMessage, false);

