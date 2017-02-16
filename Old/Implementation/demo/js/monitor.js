(function () {

    class PresentationConnection {
        constructor(url, id) {
            this.url = url;
            this.id = id;
        }       

        get getString(){
            return this.url + this.id;
        } 
    }

    button = document.getElementById('testButton');

    button.onclick = function () {
        myIFrame = document.getElementById('myFrame');
        const quadrat = new PresentationConnection("http://diesunddas.de", "1258892489");

        

        myIFrame.contentWindow.postMessage(quadrat, 'http://localhost');
    }

    function receiveMessage(event) {
        // Do we trust the sender of this message?
        if (event.origin !== "http://localhost")
            return;

        welt = document.getElementById('helloWorld');
        welt.innerHTML = event.data;
    }

    window.addEventListener("message", receiveMessage, false);

})();