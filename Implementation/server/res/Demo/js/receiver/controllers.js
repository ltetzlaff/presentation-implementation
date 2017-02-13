angular.module('receiver.controllers', [])


.controller('ReceiverCtrl', function($scope) {
  $scope.timerTick = function() {
      setTimeout(function() {
        if (!$scope.runTimer) { return; }
          $scope.secondsRemaining--;
          $scope.displayTime = getSecondsAsDigitalClock($scope.secondsRemaining);
          $scope.$apply();
          if ($scope.secondsRemaining > 0) {
            $scope.timerTick();
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
  $scope.startTimer = function() {
    $scope.hasStarted = true;
    $scope.runTimer = true;
    $scope.timerTick();
  };

  $scope.stopTimer = function() {
    $scope.displayTime = getSecondsAsDigitalClock(3600);
    $scope.timeInSeconds = 3600;
    $scope.runTimer = false;
    $scope.hasStarted = false;
    $scope.hasFinished = false;
    $scope.secondsRemaining = $scope.timeInSeconds;
  };

  $scope.pauseTimer = function() {
    $scope.runTimer = false;
  }


  send = function(type, msg) {

  };

  onReceive = function (type, message) {
    switch(type) {
    case TYPE.CONTROL:
        switch(message) {
          case 'PAUSE':
              $scope.pauseTimer();
              break;
          case 'PLAY':
              $scope.play();
              break;
          case 'STOP':
              $scope.stopTimer();
              break;
          case 'START':
              $scope.startTimer();
              break;
          default:
            }
        break;
    case TYPE.HINT:
        $scope.showMessage(message);
        break;
    case TYPE.IMAGE:
        $scope.showImage(message);
    default:
      }
  };

  $scope.showHint = function(message) {
    $scope.message = message;
    $scope.showMessage = true;
    window.setTimeout(function() {
        $scope.showMessage = false;
        $scope.$apply();
    }, 10000);
  };

  $scope.showImage = function(image) {
    $scope.imageSrc = "data:image/png;base64," + image;
    $scope.showImage = true;
    window.setTimeout(function() {
        $scope.showImage = false;
        $scope.$apply();
    }, 10000);
  }

  addConnection = function(connection) {
    connection.onmessage = function (message) {
      onReceive(message.type, message.msg);
    };
  };

  navigator.presentation.receiver.connectionList.then(function (list) {
    list.connections.map(function (connection) {
      addConnection(connection);
    });
    list.onconnectionavailable = function (evt) {
      addConnection(evt.connection);
    };
  });


  $scope.initTimer = function () {
    //window.addEventListener('onReceive', onReceive);

    $scope.displayTime = getSecondsAsDigitalClock(3600);
    $scope.timeInSeconds = 3600;
    $scope.runTimer = false;
    $scope.hasStarted = false;
    $scope.hasFinished = false;
    $scope.secondsRemaining = $scope.timeInSeconds;
    $scope.messages = [];
    $scope.images = Images.all();
  };

});
