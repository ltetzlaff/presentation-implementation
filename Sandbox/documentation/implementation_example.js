let handlers = {
  monitor         :  () => Promise.reject(),
  selectDisplay   :  (displays) => Promise.reject(),
  createContext   :  (url) => Promise.reject(),
  connect         :  (id, url) => Promise.reject(),
  send            :  (type, data) => Promise.reject(),
  receive         :  () => Promise.reject(),
  close           :  (conn, reason, message) => Promise.reject(),
  host            :  (id, url, displayName) => Promise.resolve()
};

window.navigator.presentation = new Presentator();
let config = new ImplementationConfig("My First Presentation App", handlers);
window.navigator.presentation.configure(config);