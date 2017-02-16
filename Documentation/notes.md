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

## Protocol to communicate between UA and Context

### From Parent to Context

```json
event.data: {
  output: {~},, // ~ = depending on initial command
  key: ""       // if there is a remembered promise to be resolved
}
```

### From Context to Parent

```json
event.data: {
  command: "",  // list of known commands for the UA
  input: {~},   // ~ = depending on command, for example data, urls, sessionId or whatever
  key: ""       // if there is a remembered promise to be resolved
}
```

### Examples

- Promise Example

Context to Parent:

```json
event.data: {
  contextId: "jsdf-lkdf-jf13-3oijf",
  input: {
    urls: "http://example.org/123"
  },
  key: "asda-asda-sd34-ijgo"
}
```

Parent to Context:

```json
event.data: {
  output: {a: 123, b: 456, deserializeTo: "PresentationConnection"},
  key: "asda-asda-sd34-ijgo"
}
```

- Event Example

Context to Parent:
none

Parent to Context:

```json
event.data: {
  output: {
    recipient: "dsfa-asda-hgd7-ioas",
    eventData: {}
  }
}
```


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