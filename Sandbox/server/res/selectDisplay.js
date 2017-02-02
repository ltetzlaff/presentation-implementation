let parent = null;
let origin = null;
window.addEventListener("message", e => {
  parent = e.source;
  origin = e.origin;
  ready(() => {
    populateDisplayList(e.data);
  });
});

function populateDisplayList(displayNames) {
  let ul = $("#displays");
  displayNames.forEach(displayName => {
    // One Line per Display
    let li = document.createElement("li");
    li.innerHTML = displayName;

    // Attach Click Listener
    li.addEventListener("click", (e) => {
      if (parent !== null) {
        let clicked = e.target.innerHTML;
        parent.postMessage(clicked, origin);
      }
    });

    // Add
    ul.appendChild(li);
  });
}
