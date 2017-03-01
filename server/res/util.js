/* http://youmightnotneedjquery.com/ */
// https://developer.mozilla.org/en-US/Add-ons/Code_snippets/QuerySelector
function $(selector, el) {
 if (!el) {el = document;}
 return el.querySelector(selector);
}

/**
 * $ for multiple retrievals
 */
function $$(selector, el) {
 if (!el) {el = document;}
 return el.querySelectorAll(selector);
 // Note: the returned object is a NodeList.
 // If you'd like to convert it to a Array for convenience, use this instead:
 // return Array.prototype.slice.call(el.querySelectorAll(selector));
}

 /**
   * #TODO https://w3c.github.io/presentation-api/#dfn-a-priori-unauthenticated-url
   * @return {boolean}
   */
function isAPrioriUnauthenticatedURL(url) {
  return !isAPrioriAuthenticatedURL(url);
}

// https://w3c.github.io/webappsec-mixed-content/#a-priori-authenticated-url
function isAPrioriAuthenticatedURL(url) {
  return getScheme(url) !== "data" || isUrlTrustworthy(url) === "Potentially Trustworthy";
}

function isUrlTrustworthy(url) {
  if (getScheme(url) === "data") {
    return "Not Trustworthy";
  }
  if (url === "about:blank" || url == "about:srcdoc") {
    return "Potentially Trustworthy";
  }
  return isOriginPotentiallyTrustworthy(getOrigin(url));
}

// https://w3c.github.io/webappsec-secure-contexts/#is-origin-trustworthy
function isOriginPotentiallyTrustworthy(origin) {
  if (!origin) {
    return "Not Trustworthy";
  }

  if (origin.scheme === "https" ||
      origin.scheme === "wss") {
    return "Potentially Trustworthy";
  }

  //return "Potentially Trustworthy"; // #TODO
  return "Not Trustworthy";
}

function getOrigin(url) {
  switch (getScheme(url)) {
    case "blob":
      /* Let url be the result of parsing URL’s path[0].
        Return a new opaque origin, if url is failure, and url’s origin otherwise.
      */
      return null; // #TODO
      break;
    case "ftp":
    case "gopher":
    case "http":
    case "https":
    case "ws":
    case "wss":
      return {
        scheme: getScheme(url),
        /*host: ,
        port: ,
        domain: ,*/
        baseUrl: getBaseUrl(url)
      }
      break;
    case "file":
      return null;
      break;
    default:
      return null;
      break;
  }
}

function getScheme(url) {
  url = url || window.location.href;
  return new RegExp(/.*\/\//).exec(url)[0].slice(0, -3);
}

function getBaseUrl(url) {
  url = url || window.location.href;
  return new RegExp(/^.*\//).exec(url)[0];
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
          //console.warn(e);
          result = this.response;
        } finally {
          resolve(result);
        }
      } else {
        console.warn(this.status + "-Error on " + method + " to " + url);
        reject(this.status);
      }
    };
    
    /*r.onerror = () => {
      reject(404);
    }*/
    r.ontimeout = () => {
      console.log("timeout");
      reject(403);
    }
    
    r.open(method, url, true);
    r.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    r.send(JSON.stringify(data));
  });
}

/**
 * Promisified Timeout that resolves after ms
 * .then(value) can be chained
 * @param {Number} ms - milliseconds
 * @param {any} value
 */
function Delay(ms, value) {
  return new Promise((resolve, _) => {
    setTimeout(resolve, ms, value);
  });
}

/**
 * Does long polling to a server
 * @param {String} url destination to poll
 * @param {Object} initData the data which is beeing send every time
 * @param {Object|Function} onSuccess - Object (see below) OR a simple callback function that's executed on request success
 *  @param {EventTarget} onSuccess.target - who receives the event
 *  @param {String}      onSuccess.name   - the name of the event which is beeing created when request succeeds
 * @param {Function} onStop - if this evaluates to truthy stop the polling
 */
function ajaxLong(url, initData, onSuccess, onStop){
  if (onStop !== undefined && typeof onStop === "function") {
    let result = onStop();
    if (result) {
      return Promise.resolve(result);
    }
  }
  
  return ajax('GET', url, initData)
  .catch(() => {
    return Delay(5000).then(() => {
      return ajaxLong(url, initData, onSuccess, onStop);  
    });
  })
  .then((message) => {
    switch (typeof onSuccess) {
      case "function":
        onSuccess(message);
        break;
      case "object":
        fire(new CustomEvent(onSuccess.name, {detail: message}), onSuccess.target);
        break;
    }

    return ajaxLong(url, initData, onSuccess, onStop);
  })
}

function queueTask(cb) {
  setTimeout(cb, 0);
}

function fire(event, at) {
  at.dispatchEvent(event);
}

function addEventListeners(eventTarget, eventNames) {
  if (typeof eventNames === "string") {
    eventNames = [eventNames];
  }
  eventNames.forEach(name => {
    eventTarget["on" + name] = null;
    eventTarget.addEventListener(name, (e) => {
      let handler = eventTarget["on" + name];
      if (handler && typeof handler === "function") {
        handler.call(eventTarget, e);
      } else {
        console.warn("No handler assigned for " + name + " on Target:", eventTarget);
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
  //ifrm.setAttribute("sandbox", "allow-scripts");
  ifrm.className = "fullscreen";
  document.body.appendChild(ifrm);
  return ifrm;
}

/**
 * @param {string} id - which kind of DomExp.: DomException.*
 * @param {string} msg - optional: additional note to the error to be posted to console
 */
function domEx(id, msg) {
  console.error(new Error(msg).stack);
  return new DOMException(msg, id);
}

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
  static allowedToShowPopup(event) {
    console.log(event);
    if (event && event.isTrusted && event.type !== "load") {
      return true;
    } else {
      return false;
    }
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
    let mixedSecButUnauth = Browser.prohibitsMixedSecurityContents() && presentationUrls.some(u => isAPrioriUnauthenticatedURL(u)); // 2.-4.
    if (mixedSecButUnauth || Browser.isSandboxedPresentation()) {
      return true;
    }
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