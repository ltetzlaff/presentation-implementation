# Howto
## Setup
use node >6

Then:  
```
npm install
```

## start
```language
npm start
```

## run test
```language
npm test
```


## Basic usage
Everything in the client directory next to this Server-directory is staticly served to the client, so that is the client playground.

### Monitor registry
monitor makes a post requet to this server with the following body:
```language
.post('/api/monitor')
{
    "id": id,
    "name": "lobby"    
}
``` 
monitor disconect from server:
```language
.delete('/api/monitor/:id')
``` 

Controller request for available monitors:
```language
.get('/api/monitor')
``` 

### Message passing
Controller listen for new messages via longpolling with session id:
```language
.get('/api/controller/message/:id')
``` 
Controller sending messages to monitor via longpolling with monitor id:
```language
.post('/api/controller/message/:id')
``` 

Monitor listen for new messages via longpolling with monitor id:
```language
.get('/api/monitor/message/:id')
``` 
Monitor sending messages to controller via longpolling with session id:
```language
.post('/api/monitor/message/:id')
``` 