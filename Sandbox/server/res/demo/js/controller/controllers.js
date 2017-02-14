angular.module('controller.controllers', [])

.controller('HomeCtrl', function($scope, Images) {

  var TYPE = {
    CONTROL : 1,
    HINT : 2,
    IMAGE : 3,
    VIDEO : 4
  };

  var connection = undefined;
  let p = window.navigator.presentation;

  handleAvailabilityChange = function(available) {
    $scope.isCastAvailable = available ? true : false;
  };
    


  timerTick = function() {
      setTimeout(function() {
        if (!$scope.runTimer) { return; }
          $scope.secondsRemaining--;
          $scope.displayTime = getSecondsAsDigitalClock($scope.secondsRemaining);
          $scope.$apply();
          if ($scope.secondsRemaining > 0) {
            timerTick();
          } else {
            $scope.hasFinished = true;
        }
      }, 1000);
  };

  getSecondsAsDigitalClock = function(inputSeconds) {
    var sec_num = parseInt(inputSeconds.toString(), 10);
    var hours = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);
    var hoursString = '';
    var minutesString = '';
    var secondsString = '';
    hoursString = (hours < 10) ? "0" + hours : hours.toString();
    minutesString = (minutes < 10) ? "0" + minutes : minutes.toString();
    secondsString = (seconds < 10) ? "0" + seconds : seconds.toString();
    return hoursString + ':' + minutesString + ':' + secondsString;
  };

   getDateTime = function() {
    var date = new Date();
    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    return hour + ":" + min + ":" + sec;
  };

  $scope.startTimer = function() {
    $scope.hasStarted = true;
    $scope.runTimer = true;
    timerTick();

    send(TYPE.CONTROL, 'START');
  };

  $scope.stopTimer = function() {
    $scope.initTimer();

    send(TYPE.CONTROL, 'STOP');
  };

  $scope.pauseTimer = function() {
    $scope.runTimer = false;
    send(TYPE.CONTROL, 'PAUSE');
  }

  $scope.sendMessage = function(msg) {
    var message = getDateTime() + " : " + msg;
    $scope.messages.push(message);
    $scope.message = "";

    // sendMessage
    send(TYPE.HINT, msg);
  };

  $scope.messageKeyPress = function (event, message) {
    if (event.which === 13) $scope.sendMessage(message);
  };

  $scope.play = function () {
    $scope.startTimer();
  };

  toDataUrl = function (url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
      var reader = new FileReader();
      reader.onloadend = function() {
        callback(reader.result);
      }
      reader.readAsDataURL(xhr.response);
    };
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.send();
  };


  $scope.sendImage = function (img) {
    toDataUrl(img.src, function (base64img) {
      send(TYPE.IMAGE, base64img);
    })
  };

  send = function(type, msg) {
    if(connection != undefined){
      connection.send({
        type: type,
        msg: msg
      });
    }
  };

  onReceive = function (type, message) {

  };

  $scope.startCast = function (){
    p.defaultRequest = new PresentationRequest("http://localhost/Demo/receiver.html");
    p.defaultRequest.onconnectionavailable = e => {
      // Disconnect prior connections
      // #TODO https://w3c.github.io/presentation-api/#monitor-connection-s-state-and-exchange-data-example

      connection = e.connection;
      
      
      connection.onconnect = () => {
       

        connection.onmessage = messageEvent => {
          console.log("received message:", messageEvent.data);
          //conn.send("Message Pingpong");
        }
      }
      connection.onclose = () => {
       
      }
    }

    // Go
    p.defaultRequest.getAvailability().then(a => {
      console.log("availability: ", a);
      p.defaultRequest.start().catch(e => console.log(e));
    });
  };

  $scope.stopCast = function () {
    if(connection !=  undefined){
      connection.close();
    }    
  }

  setConnection = function (newConnection) {
    // Disconnect from existing presentation, if not attempting to reconnect
    if (connection && connection != newConnection && connection.state != 'closed') {
      connection.onclosed = undefined;
      connection.close();
    }

    // Set the new connection and save the presentation ID
    connection = newConnection;
    $state.presId = connection.id;

    
    // Monitor the connection state
    connection.onconnect = _ => {
      $scope.isCasting = true;

      // Register message handler
      connection.onmessage = message => {
        console.log(`Received message: ${message.data}`);
      };

      // Send initial message to presentation page
      connection.send({
        type: TYPE.HINT,
        msg: "Say hello"});
    };

    connection.onclose = _ => {
      connection = null;
      $scope.isCasting = false;
    };

    connection.onterminate = _ => {      
      $state.presId = null;
      connection = null;
      $scope.isCasting = false;
    };
  };

  initPresentation = function (){
    $scope.request = new PresentationRequest($scope.presUrls);
    $scope.request.getAvailability().then(function(availability) {
      handleAvailabilityChange(availability.value);
      availability.onchange = function(value) { 
        if(this.value != undefined){
          handleAvailabilityChange(this.value); 
        }
      };
    }).catch(function() {
      handleAvailabilityChange(true);
    });
  }

  $scope.initTimer = function () {
    window.addEventListener('onReceive', onReceive);

    $scope.displayTime = getSecondsAsDigitalClock(3600);
    $scope.timeInSeconds = 3600;
    $scope.runTimer = false;
    $scope.hasStarted = false;
    $scope.hasFinished = false;
    $scope.isCastAvailable = true;
    $scope.isCasting = false;
    $scope.secondsRemaining = $scope.timeInSeconds;
    $scope.messages = [];
    $scope.images = Images.all();
    $scope.presUrls = ["http://localhost/Demo/receiver.html"];
    //$scope.request = null;
    //initPresentation();
  };
})

.controller('SettingsCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };
});
