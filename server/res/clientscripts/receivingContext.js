// Include this if you intend to make this website "shareable" as a presentation
let parent, origin;

window.addEventListener("message", e => {
  if (e.data === "RECEIVE") {
    Object.defineProperty(window.navigator, "presentation", {value: window.top.navigator.presentation})
    fire(new Event("presentationLoaded"), window);
    parent = e.source;
    origin = e.origin;
    ready(() => {
      parent.postMessage("READY", origin);
    });
  }
});