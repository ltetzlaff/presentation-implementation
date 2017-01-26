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

function ajax(method, url, data) {
  method = method.toUpperCase();
  return new Promise((resolve, reject) => {
    let r = new XMLHttpRequest();
    r.open(method, url, true);
    
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
    
    if (method === "POST") {
      r.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
      r.send(JSON.stringify(data));
    } else {
      r.send();
    }
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
  // #TODO sandbox flag etc
  let ifrm = document.createElement("iframe");
  // scrolling="no" marginwidth="0" marginheight="0" frameborder="0" vspace="0" hspace="0">
  ifrm.setAttribute("src", url);
  ifrm.style.width = "100%";
  ifrm.style.height = "100%";
  document.body.appendChild(ifrm);
  return ifrm;
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