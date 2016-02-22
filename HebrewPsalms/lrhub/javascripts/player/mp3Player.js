// Generated by CoffeeScript 1.10.0
(function() {
  var wrapSoundManager2Player;

  wrapSoundManager2Player = function(sm2) {
    var obj;
    obj = {
      getDuration: function() {
        return sm2.duration;
      },
      getPosition: function() {
        var ref;
        return (ref = sm2.position) != null ? ref : 0;
      },
      setPosition: function(millis) {
        sm2.setPosition(millis);
        return this.cancelPlayingRange();
      },
      play: function() {
        sm2.play();
        return this.cancelPlayingRange();
      },
      stop: function() {
        sm2.stop().setPosition(0);
        return this.cancelPlayingRange();
      },
      togglePause: function() {
        sm2.togglePause();
        return this.cancelPlayingRange();
      },
      playRange: (function(_this) {
        return function(startMillis, endMillis) {
          _this.playingRangeEnd = endMillis;
          return sm2.stop().setPosition(startMillis).play();
        };
      })(this),
      playingRangeEnd: null,
      cancelPlayingRange: (function(_this) {
        return function() {
          return _this.playingRangeEnd = null;
        };
      })(this),
      checkIfShouldStopPlayingRange: (function(_this) {
        return function() {
          if (_this.playingRangeEnd != null) {
            if (sm2.position >= _this.playingRangeEnd) {
              sm2.pause();
              return _this.cancelPlayingRange;
            }
          }
        };
      })(this)
    };
    setInterval((function() {
      return obj.checkIfShouldStopPlayingRange();
    }), 20);
    return obj;
  };

  window.formatTime = function(ms) {
    var hours, minutes, pad2, seconds, x;
    pad2 = function(number) {
      return (number < 10 ? '0' : '') + number;
    };
    x = ms / 1000;
    seconds = Math.floor(x % 60);
    x /= 60;
    minutes = Math.floor(x % 60);
    x /= 60;
    hours = Math.floor(x % 24);
    if (hours > 0) {
      return hours + ':' + pad2(minutes) + ':' + pad2(seconds);
    } else {
      return minutes + ':' + pad2(seconds);
    }
  };

  window.initMp3 = function(mp3Url, onready) {
    soundManager.onready(function() {
      var mySound;
      mySound = soundManager.createSound({
        id: 'aSound',
        url: mp3Url,
        onload: function(result) {
          return onready(wrapSoundManager2Player(mySound));
        }
      });
      return mySound.load();
    });
    return soundManager.ontimeout(function() {
      return alert('Hrmm, SM2 could not start. Flash blocker involved? Show an error, etc.?');
    });
  };

}).call(this);
