let p = window.navigator.presentation;
ready(() => {
  $("#host").addEventListener("click", () => {
    let select = $("#displaySelector");
    let display = JSON.parse(select.options[select.selectedIndex].value);
    p.allowed = DiscoveryAllowance.none;
    p.refreshContinousMonitoring();
    p.receiver = new PresentationReceiver(display);
  });
});