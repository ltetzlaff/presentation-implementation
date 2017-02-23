var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
app.use(express.static('static'));


class Entity{
    constructor(socket, id){
        this.socket = socket;
        this.id = id;

    }
    get connectionId(){
        return this.id;
    }
    set newsocket(socket){
        this.socket = socket;
    }
}

class Monitor extends Entity{
    constructor(socket, name, id){
        super(socket, id);
        this.name = name;
    }
    get getJSONInfo(){
        return {
            id: this.connectionId,
            name: this.name
        };
    }
}

var monitors = [];

var monitorIO = io.of('/monitor');
var controllerIO = io.of('/controller');

monitorIO.use(function(socket, next){
  //console.log(socket);
  next();
  
});

monitorIO.on('connection', function(socket){
    console.log('a monior connected');
    let monitor = monitors.find(el => socket.handshake.query.id == el.connectionId);
    if (monitor != undefined){
        monitor.newsocket = socket;
    }
    else{
        monitors.push(new Monitor(socket, socket.handshake.query.name, socket.handshake.query.id));   
        controllerIO.emit('chat message', monitors.map((el) => {
            return el.getJSONInfo;
        }));
    }    
    
    socket.on('disconnect', function(){
        //monitor.splice(monitor.indexOf(el => el.connectionId == socket.id),1);
        console.log('monitor disconnected');
    });
    socket.on('chat message', function(msg){
        console.log('message: ' + msg.msg);
        console.log('id: ' + socket.id);
    });
});

controllerIO.on('connection', function(socket){
    console.log('a controller connected');
    socket.on('disconnect', function(){
        console.log('controller disconnected');
    });
    socket.on('chat message', function(msg){
        console.log('message: ' + msg.msg);
        console.log('id: ' + socket.id);
    });
    socket.on('get monitors', () =>{
        controllerIO.emit('chat message', monitors.map((el) => {
            return el.getJSONInfo;
        }));
    });
});

http.listen(3000, function(){
    console.log('listening on *:3000')
});