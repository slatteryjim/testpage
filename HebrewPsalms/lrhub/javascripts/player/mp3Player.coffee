
# basic MediaPlayer interface needed by transcript player
wrapSoundManager2Player = (sm2) ->
	obj = 
		getDuration: -> sm2.duration
		getPosition: -> sm2.position ? 0
		setPosition: (millis) -> sm2.setPosition(millis); @cancelPlayingRange()
		play: -> sm2.play(); @cancelPlayingRange()
		stop: -> sm2.stop().setPosition(0); @cancelPlayingRange()
		togglePause: -> sm2.togglePause(); @cancelPlayingRange()
	
		playRange: (startMillis, endMillis) =>
			@playingRangeEnd = endMillis
			sm2.stop().setPosition(startMillis).play()	 
		playingRangeEnd: null
		cancelPlayingRange: => @playingRangeEnd = null
		checkIfShouldStopPlayingRange: => if @playingRangeEnd? then if sm2.position >= @playingRangeEnd then sm2.pause(); @cancelPlayingRange

	# schedule listener
	setInterval (-> obj.checkIfShouldStopPlayingRange()), 20 
	
	obj	


window.formatTime = (ms) ->
    pad2 = (number) -> (if number<10 then '0' else '') + number
    
    x = ms / 1000;
    seconds = Math.floor(x % 60);
    x /= 60;
    minutes = Math.floor(x % 60);
    x /= 60;
    hours = Math.floor(x % 24);
    
    if hours > 0
    	return hours+':'+pad2(minutes)+':'+pad2(seconds)
    else
        return minutes+':'+pad2(seconds)


# onready is called with the soundObject
window.initMp3 = (mp3Url, onready) ->
	soundManager.onready ->
		# SM2 has loaded - now you can create and play sounds!
		mySound = soundManager.createSound
			id: 'aSound'
			url: mp3Url
			onload: (result) -> onready(wrapSoundManager2Player(mySound))
		
		mySound.load()
	
	soundManager.ontimeout () ->
		alert 'Hrmm, SM2 could not start. Flash blocker involved? Show an error, etc.?'
