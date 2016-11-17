# AWT Presentation API

## Which Version is targeted?

- Draft vs last cr (06/16)

## Technologies

- Frontend = JS
  - evaluate encapsulation method to occult list of cast devices from api users
    - keep it in the browser context
      - use some browser magic
        - stuff that works for file api etc
        - <example>
        - but what if we need it now..?
      - use light js magic
        - closures
          - <example>
          - your stuff might get rewritten so meh
        - custom properties
          - make non enumerables https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
        - obfuscation
          - <example>
          - yeah ..
      - es6 symbols + custom wrapper class in between (like famiums multiscreen.js)
        - es6 has true private members (symbols)
        - add some custom class e.g. DeviceChooser which does the availability checking, keeps it private and returns some anonymized reference to the chosen device
        - ensuring that this is done correctly could be done similarly to file api classes (only allow calls to something being instanceof DeviceChooser)
        - user (dev) might be able to call Multiscreen.share(); in the end
    - move to another context
      - iframe
        - https://www.html5rocks.com/en/tutorials/security/sandboxed-iframes/
        - http://webagility.com/posts/web-components-vs-iframes
      - shadow dom / html imports
        - http://stackoverflow.com/a/28518932
      - chrome extension

- Backend = Node.JS ??
  - socket.io ??

- Presentation
  - local website
  - chromecast-a-like etc
  - chrome extension as a receiver