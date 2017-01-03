/* http://youmightnotneedjquery.com/ */
// https://developer.mozilla.org/en-US/Add-ons/Code_snippets/QuerySelector
function $ (selector, el) {
 if (!el) {el = document;}
 return el.querySelector(selector);
}

function $$ (selector, el) {
 if (!el) {el = document;}
 return el.querySelectorAll(selector);
 // Note: the returned object is a NodeList.
 // If you'd like to convert it to a Array for convenience, use this instead:
 // return Array.prototype.slice.call(el.querySelectorAll(selector));
}

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
        resolve(this.response);
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


function implement(instance, I) {
  for (let prop in I) {
    instance[prop] = I[prop];
  }
}


function copy(dest, source, isDeep) {
  if (isDeep) {
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
 * @param {String} url
 * @return {DOMElement}
 */
function createContext(url) {
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
   * #TODO
   */
  static getDiscoveryAllowance() {
    return DiscoveryAllowance.continous;
  }
  
  
  /**
   * https://www.w3.org/TR/html5/browsers.html#allowed-to-show-a-popup
   * #TODO
   */
  static allowedToShowPopup(context) {
    return true;
  }
  
  /**
   * #TODO
   * https://w3c.github.io/webappsec-mixed-content/#categorize-settings-object
   * @return {boolean}
   */
  static prohibitsMixedSecurityContents() {
    // window.isSecureContext ?
    return true;
  }
  
  static isMixedContentMismatch(presentationUrls) {
    let mixedSecButUnauth = Browser.prohibitsMixedSecurityContents() && presentationUrls.some(u => Browser.isAPrioriUnauthenticatedURL(u)); // 2.-4.
    if (mixedSecButUnauth || Browser.isSandboxedPresentation()) {
      return true;
    }
  }
  
  /**
   * #TODO
   * https://w3c.github.io/presentation-api/#dfn-a-priori-unauthenticated-url
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
   * @param {document} doc - optional
   */
  static isSandboxedPresentation(doc) {
    doc = doc || document;
    return Browser.getSandboxingFlag(doc);
  }
}