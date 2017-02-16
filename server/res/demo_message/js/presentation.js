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

    // Called sometime after postMessage is called
    function receiveMessage(event) {
        // Do we trust the sender of this message?
        if (event.origin !== "http://localhost")
            return;

        meinDiv = document.getElementById("demo");
        meinDiv.innerHTML = event.data.url + "<br /> <button id='sendTest'>Test</button>";

        event.data.__proto__ = PresentationConnection.prototype;

        if(event.data instanceof PresentationConnection){
            alert("Ja es ist PresentationConnection!")
        }



        button = document.getElementById('sendTest');

        button.onclick = function () {


            event.source.postMessage("hello Back!",
                event.origin);
        }

    }

    window.addEventListener("message", receiveMessage, false);

})();