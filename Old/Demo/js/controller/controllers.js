angular.module('controller.controllers', [])

.controller('HomeCtrl', function($scope, Images) {

  var TYPE = {
    CONTROL : 1,
    HINT : 2,
    IMAGE : 3,
    VIDEO : 4
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
    send(TYPE.CONTROL, msg);
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

  };

  onReceive = function (type, message) {

  };
  $scope.initTimer = function () {
    window.addEventListener('onReceive', onReceive);

    $scope.displayTime = getSecondsAsDigitalClock(3600);
    $scope.timeInSeconds = 3600;
    $scope.runTimer = false;
    $scope.hasStarted = false;
    $scope.hasFinished = false;
    $scope.secondsRemaining = $scope.timeInSeconds;
    $scope.messages = [];
    $scope.images = Images.all();
  };
})

.controller('SettingsCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };
});
