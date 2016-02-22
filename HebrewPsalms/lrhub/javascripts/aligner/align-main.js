define(['jquery',
        'underscore',
		 'lib/jquery.layout-latest',
		 'lib/less',
		 'lib/json2',
		 'lib/knockout-1.3.0beta.debug',
		 'ko.plugins/textareaCursorPosition',
		 'ko.plugins/autogrowTextarea',
		 'const/KeyEvent',
		 'aligner/mp3Player',
		 'aligner/waveform',
		 'aligner/viewModelInit',
		 'utils'], function($,_,i2,i3,i4,ko_nothing, plugin1, plugin2, KeyEvent, mp3Player_init, waveform_constructor, viewModelInit, utils) {

	var main = function(
			lrgridJSON,
			saveUrl,
			mp3Url,
			waveformWidth,
			waveformHeight,
			waveformSvgArray,
			waveformDiv,
			waveformSvgDiv) {
		
		// we only work properly in Chrome, currently..
		if (!window.chrome) {
			if(!confirm("You don't appear to be using Google Chrome. Do you still want to continue?")) {
				history.go(-1);
			}
		}
		
		$('body').layout({
			applyDefaultStyles: true,
			enableCursorHotkey: false,
			north__size:	     235,    //74
			//north__closable:	 false,
			north__resizable:	 true,
			north__spacing_open: 0
		});
		
		mp3Player_init(mp3Url, function(sound) {
			console.log("scheduling deferred function in mp3Player_init()...");
			_.defer(function() {
				console.log("deferred function executing now...");
				var waveform = new waveform_constructor(waveformDiv, waveformSvgDiv, waveformWidth, waveformHeight, waveformSvgArray, sound.getDuration(), sound);
				window.waveform = waveform; 
				
				// init viewmodel, apply bindings
				var viewModel = viewModelInit(lrgridJSON, waveformWidth); 
				
				var saveAlignment = function() {
					// serialize to document
					var json = JSON.stringify(viewModel.doc().toLrgridJSON());
					
					// submit to server
					$.post(	saveUrl,
							{content: json},
							function() { alert("successfully saved."); })
					 .error(function() { alert("error while saving"); });
				};
				
				// for DEBUGGING!
				window.mySound = sound;
				window.vm = viewModel;
				window.saveAlignment = saveAlignment;
	
				// highlight the first sync
				sound.setPosition(1);
				
			    $('#loadingAudioAlert').remove();
				
				// add keyboard listeners to transcript textareas
				// use 'delegate' event approach
				var textareaMatcher = ".syncTextarea";
				$("#transcript")
					.on('keypress', textareaMatcher, function(event){
						// grab this as fast as possible, in case we need it
						var newMillis = sound.getPosition();
						
						// 'Enter' (without Shift)  => split at cursor
						if (event.keyCode === KeyEvent.RETURN && !event.shiftKey) {
							//@splitSync sync, ta, newMillis
							var ta = this;
							var ctx = ko.contextFor(this);
							var sync = ctx.$data;
							var doc  = ctx.$parent;
		
							var currentText = ta.value;
							var cursorPos = utils.getInputSelection(ta).start;
							doc.splitAt(sync, newMillis, currentText, cursorPos);
							
							return false;
						}
					})
					.on('keydown', textareaMatcher, function(event) {
						var ctx = ko.contextFor(this);
						var sync = ctx.$data;
						var doc  = ctx.$parent;
		
						var ta = this;
						
						// grab cursor position
						var selection = utils.getInputSelection(ta);
						var start = selection.start;
						var end   = selection.end;
										
						// only do something special if there is no text selected
						if (start === end) {
							// cursor must be at beginng, or [Ctrl-Up]?
							if (start === 0 || (event.keyCode === KeyEvent.UP && event.ctrlKey)) {
								// [UP] OR [Left]
								if (event.keyCode === KeyEvent.UP || event.keyCode === KeyEvent.LEFT) {
									// is there a previous sync??
									var prevSync = sync.prev();
									if (prevSync) {
										// [Left] go to end of previous textarea
										var cursorPos = (event.keyCode === KeyEvent.LEFT) ? prevSync.text().length : 0;
		
										doc.navigateToSync(prevSync, cursorPos);
										sound.setPosition(prevSync.millis());
										return false;
									}
								}
								// [CTRL+Backspace]
								if (event.keyCode === KeyEvent.BACK_SPACE && event.ctrlKey) {
									doc.mergeSyncWithPrevious(sync, ta.value);
									return false;
								}
							}
							
							// cursor at end, or [Ctrl-Down]?
							if (end === ta.value.length || (event.keyCode == KeyEvent.DOWN && event.ctrlKey)) {
								// [Right] OR [Down]
								if (event.keyCode == KeyEvent.RIGHT || event.keyCode == KeyEvent.DOWN) {
									// is there a next sync??
									var nextSync = sync.next();
									if (nextSync) {
										doc.navigateToSync(nextSync, 0);
										sound.setPosition(nextSync.millis());
										return false;
									}
								}
							}
						}
						
						// ALT-W to trim whitespace
						if (event.keyCode == KeyEvent.W && event.altKey) {
							var ta = this;
							//var sync = ko.dataFor(this);
							
							var before = ta.value;
							var after = $.trim(before);
							
							if (before == after) {
								alert("no whitespace to trim.");
							}
							else {
								ta.value = after;
								sync.text(after);
							}
							return false;
						}
						
						// DISABLED UNTIL I CAN GET TEXTAREAS TO UPDATE VM BEFORE SAVING
						// Ctrl-S to save LRGrid to server
	//					if (event.keyCode == KeyEvent.S && event.ctrlKey) {
	//						saveAlignment();
	//						return false;
	//					}
	
					})
					.on('click', textareaMatcher, function(event) {
						var ctx = ko.contextFor(this);
						var sync = ctx.$data;
						var doc  = ctx.$parent;
						
						if (!sync.isSelected()) {
							// jump to this millis position.
							sound.setPosition(sync.millis());
							
							// mark this sync as selected index
							sync.focus();
							
							console.log("focused received: "+sync.text());
						}
					});
	
				
				// global player hotkeys
				$('body').on('keydown', function(event) {
					var millis = sound.getPosition();
					
					// no Shift or Alt
					if (!event.shiftKey && !event.altKey) {
						if (event.keyCode === KeyEvent.TAB || event.keyCode === KeyEvent.ESCAPE) {
							sound.togglePlayStop();
							return false;
						}
						if (event.keyCode === KeyEvent.F1) {
							sound.setPosition(millis - 500);
							return false;
						}
						if (event.keyCode === KeyEvent.F2) {
							sound.setPosition(millis + 500);
							return false;
						}
					}
					
					// Shift
					if (event.shiftKey) {
						if (event.keyCode === KeyEvent.F1) {
							sound.setPosition(millis - (1000 / 40));
							return false;
						}
						if (event.keyCode === KeyEvent.F2) {
							sound.setPosition(millis + (1000 / 40));
							return false;
						}
					}
				});
				
				
				// listen to player updates (polling)
				var lastMillis = 0;
				utils.every(20, function() {
					var millis = sound.getPosition();
					if (lastMillis != millis) {
						lastMillis = millis;
						
						// update viewmodel observable
						//viewModel.positionMillis(millis);
						
						waveform.updatePosition(millis);
						
						// var durationMillis = sound.getDuration();
						
						// display playback time in control bar
						//curTime.innerHTML = "#{millis} #{formatTime(millis)} / #{formatTime(durationMillis)}"
						viewModel.doc().highlightSyncAccordingToPlayerPosition(millis);
					}
				});
			});
		});
	};
	
	return main;
});