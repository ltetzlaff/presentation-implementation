# Notes for creating docs later

Dont treat these as fixed

## Usage

How to do stuff

### Start a presentation

needs: displayId
creates: presentationId, sessionId

### Reconnect/Connect to a running presentation

needs: presentationId
creates: sessionId




## Implementation Specifics: Ajax-version

### Routes

In general:
GET will use /:param1/:param2 to identify the ressource that shall be retrieved
POST will use the above pattern to specify the path to the ressource and uses req.body for what is going to be posted

:role is always the own role (the one that sends the request)

### µ-Protocol

```json
{
  category: "application",
  data: ""
}
```

```json
{
  category: "control",
  command: "close|",
  detail: "close Reason etc"
}
```