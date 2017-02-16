ready(() => {
  $("#addController").addEventListener("click", () => {
    //createContext("/controller");
    ua.createControllingContext("/controller");
  });
  /*
  $("#discoveryAllowance").addEventListener("change", function() {
    p.allowed = Number.parseInt(this.options[this.selectedIndex].value);
    p.refreshContinousMonitoring();
  });
  */
});