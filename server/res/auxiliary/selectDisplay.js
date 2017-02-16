let parent = null;
let origin = null;
window.addEventListener("message", e => {
  parent = e.source;
  origin = e.origin;
  ready(() => {
    populateDisplayList(e.data);
  });
});

function cancel(){
  parent.postMessage(-1, origin);
}

function populateDisplayList(displays) {
  let ul = $("#displays");
  if(displays.lenght == 0){
    let li = document.createElement("li");
    li.innerHTML = "no display available";
    li.className = "list-group-item";
    ul.appendChild(li);
  }
  displays.forEach(display => {
    // One Line per Display
    let li = document.createElement("li");
    li.innerHTML = display.displayName + " (" + display.displayId + ")";
    li.setAttribute("displayId", display.displayId);
    li.className = "list-group-item";
    // Attach Click Listener
    li.addEventListener("click", (e) => {
      if (parent !== null) {
        let clicked = e.target.getAttribute("displayId");
        parent.postMessage(clicked, origin);
      }
    });

    // Add
    ul.appendChild(li);
  });
}
