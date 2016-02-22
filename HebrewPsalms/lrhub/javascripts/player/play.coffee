$ = jQuery

# helper functions
splitText = (str, pos) -> [str.substring(0, pos), str.substring(pos)]
after = (ms, fn) -> setTimeout  fn, ms
every = (ms, fn) -> setInterval fn, ms

window.init = (mp3Url, spanPrefix) ->
	$(document).ready ->
		$('body').layout
			#applyDefaultStyles: true
			enableCursorHotkey: false
			north__size:	     42
			#north__closable:	 false
			#north__resizable:	 false
			north__spacing_open: 0

	initMp3(mp3Url,
		(sound) ->
			window.mySound = sound
			window.transcript = new Transcript(sound, spanPrefix, 'highlightMouseover', 'highlightPlaying')

			# display playback time in control bar
			curTime = document.getElementById('curTime')
			duration = formatTime(sound.getDuration());
			
			lastPosition = -1;
			every 100, ->
				millis = sound.getPosition()
				if (lastPosition != millis)
					curTime.innerHTML = formatTime(millis)+' <span class="muted">/ '+duration+'</span>';
					lastPosition = millis;
	
			$('#playButton').click(-> sound.togglePause())

			# register hotkeys
			shortcut.add('Space', -> sound.togglePause())
			
			$('#loadingAudioAlert').remove();
	)
