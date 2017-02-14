angular.module('controller.services', [])

.factory('Images', function() {
  // Might use a resource here that returns a JSON array

  // Some fake testing data
  var images = [{
    id: 0,
    text: 'light bulb',
    src: 'img/hint1.png'
  }, {
    id: 1,
    text: 'magnifier',
    src: 'img/hint2.png'
  }];

  return {
    all: function() {
      return images;
    },
    remove: function(index) {
      images.splice(chats.indexOf(index), 1);
    },
    get: function(id) {
      for (var i = 0; i < images.length; i++) {
        if (images[i].id === parseInt(id)) {
          return chats[i];
        }
      }
      return null;
    }
  };
});
