define([//'lib/sm2/soundmanager2',
        'utils'], function(/*sm_nothing,*/ utils) {

	// basic MediaPlayer interface needed by transcript player
	function wrapSoundManager2Player(sm2) {
		var obj = { 
			getDuration: function() { return sm2.duration; },
			getPosition: function() { var p = sm2.position; return p != null ? p : 0; },
			setPosition: function(millis) {  sm2.setPosition(millis); this.cancelPlayingRange(); },
			isPlaying: function() { return sm2.playState === 1; },
			play: function() { 
				sm2.play(); 
				this.cancelPlayingRange();
			},
			togglePlayStop: function() {
				if (this.isPlaying()) {
					this.stop();
				}
				else {
					this.play();
				}
			},
			stop: function() {
				var position = this.getPosition();
				sm2.stop(); 
				this.setPosition(position);
				this.cancelPlayingRange(); 
			},
			stopAndRewind: function() { 
				sm2.stop().setPosition(0); 
				this.cancelPlayingRange(); 
			},
			togglePause: function() { 
				sm2.togglePause(); 
				this.cancelPlayingRange(); 
			},
			playRange: function(startMillis, endMillis) {
				this.playingRangeEnd = endMillis;
				sm2.stop().setPosition(startMillis).play();
			},
			playingRangeEnd: null,
			cancelPlayingRange: function() { this.playingRangeEnd = null; },
			checkIfShouldStopPlayingRange: function() { 
				if (this.playingRangeEnd != null) {
					if (sm2.position >= this.playingRangeEnd) {
						sm2.pause();
						return this.cancelPlayingRange;
					}
				}
			}
		};
		
		// schedule listener
		setInterval(function(){ obj.checkIfShouldStopPlayingRange(); }, 20); 
		
		return obj;
	}
	
	
	// onready is called with the soundObject
	var initMp3 = function(mp3Url, onready) {
		soundManager.onready(function() {
			// SM2 has loaded - now you can create and play sounds!
			mySound = soundManager.createSound({
				id: 'aSound',
				url: mp3Url,
				onload: function(result) { onready(wrapSoundManager2Player(mySound)); }
			});
			mySound.load();
		});
		
		soundManager.ontimeout( function() {
			alert('Hrmm, SM2 could not start. Flash blocker involved? Show an error, etc.?');
		});
	};
	
	return initMp3;
});