/* http://youmightnotneedjquery.com/ */
// https://developer.mozilla.org/en-US/Add-ons/Code_snippets/QuerySelector
function $ (selector, el) {
 if (!el) {el = document;}
 return el.querySelector(selector);
}

/**
 * $ for multiple retrievals
 */
function $$ (selector, el) {
 if (!el) {el = document;}
 return el.querySelectorAll(selector);
 // Note: the returned object is a NodeList.
 // If you'd like to convert it to a Array for convenience, use this instead:
 // return Array.prototype.slice.call(el.querySelectorAll(selector));
}

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

/**
 * document.ready
 */
function ready(fn) {
  if (document.readyState != 'loading'){
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

// http://stackoverflow.com/a/18116302
function querystring(o) {
  if (!o || (typeof o !== "object")) {
    return "";
  }
  return '?' + Object.keys(o).map(k => encodeURIComponent(k)+ '=' + encodeURIComponent(o[k])).join('&');
}

function ajax(method, url, data) {
  method = method.toUpperCase();
  return new Promise((resolve, reject) => {
    let r = new XMLHttpRequest();
    r.timeout = 60000;
    
    r.onload = function() {
      if (this.status >= 200 && this.status < 400) {
        // Success
        let result = "";
        try {
          result = JSON.parse(this.response);
        } catch (e) {
          console.warn(e);
          result = this.response;
        } finally {
          resolve(result);
        }
      } else {
        console.warn(this.status + "-Error on " + method + " to " + url);
        reject(this.status);
      }
    };
    
    r.onerror = () => {
      console.warn("Couldn't " + method + " to " + url);
      reject(404);
    }
    
    r.open(method, url + querystring(data), true);
    /*if (method === "POST") {
      r.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    }*/
    r.send();
  });
}

/**
 * Does long polling to a server
 * @param {String} url destination to poll
 * @param {Object} initData the data which is beeing send every time
 * @param {Object|Function} onsuccess - Object (see below) OR a simple callback function that's executed on request success
 *  @param {EventTarget} onsuccess.target - who receives the event
 *  @param {String}      onsuccess.name   - the name of the event which is beeing created when request succeeds
 *  @param {String}      onsuccess.onStop - is suppose to be the event the function listens to, to know when to stop
 */
function ajaxLong(url, initData, onsuccess){
  // #TODO onStop should be implemented
  //let runing = true;

  ajax('GET', url, initData).then((message) => {
    switch (typeof onsuccess) {
      case "function":
        onsuccess(message);
        break;
      case "object":
        fire(new CustomEvent(onsuccess.name, {detail: message}), onsuccess.target);
        break;
    }

    ajaxLong(url, initData, onsuccess);
  });
}

function queueTask(cb) {
  setTimeout(cb, 0);
}

function fire(event, at) {
  at.dispatchEvent(event);
}

function addEventListeners(obj, eventNames) {
  if (typeof eventNames === "string") {
    eventNames = [eventNames];
  }
  eventNames.forEach(name => {
    obj["on" + name] = null;
    obj.addEventListener(name, (e) => {
      let handler = obj["on" + name];
      if (handler && typeof handler === "function") {
        handler(e);
      } else {
        console.warn("No handler assigned for " + name + " on Target:", obj);
      }
    });
  });
}

/**
 * WebIDL states interfaces but js doesnt have an implement function x)
 * @param {Object} instance
 * @param {Interface} I
 */
function implement(instance, I) {
  for (let prop in I) {
    instance[prop] = I[prop];
  }

  // This magic was found at and adapted from: http://stackoverflow.com/a/24216547
  let eventTarget = document.createDocumentFragment();
  for (let prop in I.prototype) {
    instance[prop] = I.prototype[prop].bind(eventTarget);
  }
}

/**
 * Overwrite dest and give it source's properties (assign doesnt take functions)
 * @param {Object} dest
 * @param {Object} source
 * @param {boolean} isDeep - do a deep copy or not
 */
function copy(dest, source, isDeep) {
  if (isDeep) {
    // #TODO implement this if we need it at some point
    throw new NotImplementedException();
  } else {
    // http://www.2ality.com/2014/01/object-assign.html
    dest = Object.assign({}, source);
  }
}

/**
 * @param {Object} to - receiving object
 * @param {String} propName
 * @param {any} propValue - reference to value of the getter
 */
function makeGetter(to, propName, propValue) {
  Object.defineProperty(to, propName, {get: () => propValue});
}

/**
 * @param {Object} to - receiving object
 * @param {String} propName
 * @param {any} propValue - once written then twice shy
 */
function readOnly(to, propName, propValue) {
  Object.defineProperty(to, propName, {value: propValue, writable: false});
}

/**
 * Array.prototype.includes doesn't check for deep equality,
 * whereas this one does.
 * @param {Array} haystack
 * @param {Object} needle
 */
function includes(haystack, needle) {
  return haystack.some(n => eq(n, needle));
}

// http://stackoverflow.com/questions/201183/how-to-determine-equality-for-two-javascript-objects#comment61401243_32922084
function eq(x, y) {
  return (x && y && typeof x === 'object' && typeof y === 'object') ?
    (Object.keys(x).length === Object.keys(y).length) &&
      Object.keys(x).every(function(key) {
        return eq(x[key], y[key]);
      }, true) : (x === y);
}

/**
 * @param {String} url
 * @return {DOMElement}
 */
function createContext(url) {
  let ifrm = document.createElement("iframe");
  // scrolling="no" marginwidth="0" marginheight="0" frameborder="0" vspace="0" hspace="0">
  ifrm.setAttribute("src", url);
  ifrm.setAttribute("sandbox", "allow-scripts");
  ifrm.style.width = "100%";
  ifrm.style.height = "100%";
  document.body.appendChild(ifrm);
  return ifrm;
}

/**
 * @param {string} id - which kind of DomExp.: DomException.*
 * @param {string} msg - optional: additional note to the error to be posted to console
 */
function domEx(id, msg) {
  console.error(new Error(msg).stack);
  return new DOMException(DOMException[id]);
}

// none: must not discover, manual: may discover if initiated manually (powersave), continous: do what Bam Margera will do next
const DiscoveryAllowance = {none: 0, manual: 1, continous: 2};

class Browser {
  /**
   * Have a local setting for the discoveryAllowance of the user,
   * might be in local storage?
   * #TODO implement saving this there
   * #TODO implement asking the user for it (widget component)
   */
  static getDiscoveryAllowance() {
    return DiscoveryAllowance.continous;
  }
  
  
  /**
   * #TODO https://www.w3.org/TR/html5/browsers.html#allowed-to-show-a-popup
   */
  static allowedToShowPopup(context) {
    return true;
  }
  
  /**
   * #TODO https://w3c.github.io/webappsec-mixed-content/#categorize-settings-object
   * @return {boolean}
   */
  static prohibitsMixedSecurityContents() {
    // window.isSecureContext ?
    return true;
  }
  
  /**
   * Combines some of the other functions in this class
   */
  static isMixedContentMismatch(presentationUrls) {
    let mixedSecButUnauth = Browser.prohibitsMixedSecurityContents() && presentationUrls.some(u => Browser.isAPrioriUnauthenticatedURL(u)); // 2.-4.
    if (mixedSecButUnauth || Browser.isSandboxedPresentation()) {
      return true;
    }
  }
  
  /**
   * #TODO https://w3c.github.io/presentation-api/#dfn-a-priori-unauthenticated-url
   * @return {boolean}
   */
  static isAPrioriUnauthenticatedURL(url) {
    return false;
  }
  
  /**
   * #TODO
   * https://www.w3.org/TR/html5/browsers.html#sandboxing-flag-set
   * https://w3c.github.io/presentation-api/#sandboxed-presentation-browsing-context-flag
   * @param {document} doc
   */
  static getSandboxingFlag(doc) {
    // i have no idea yet
    return false;
  }
  
  /**
   * Retrieve Sandboxing Flag for doc || document
   * @param {document} doc - optional
   */
  static isSandboxedPresentation(doc) {
    doc = doc || document;
    return Browser.getSandboxingFlag(doc);
  }
}