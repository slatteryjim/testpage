define(['lib/knockout-1.3.0beta.debug',
        'lib/json2',
        'underscore',
        'utils'], function(ko_nothingReturned, json2, _, utils) {

	// pass in the JSON, it will create the viewModel, apply the bindings, and return the viewmodel 
	return function(lrgridJSON, waveformWidth) {
		// View Model components
		function Sync(annotation, millis, text, parent) {
			this.annotation = ko.observable(annotation);
			this.millis     = ko.observable(millis);
			this.text       = ko.observable(text);

			// extra
			this.isSelected = ko.observable(false);
			this.parent = parent;
			this.textareaCursorPosition = ko.observable(-1);
			
			// dependent observables
			var self = this;
			this.paragraphType = ko.dependentObservable({
				read: function() {
					var annotation = this.annotation();
					if (annotation == "<p>" || annotation == "<title>" || annotation == "<comment>") {
						return annotation;
					}
					else {
						return "<customSpeaker>";
					}
				},
				write: function(value) {
					if (value == "<customSpeaker>") {
						this.annotation("John");
					}
					else {
						this.annotation(value);
					}
				},
				owner: self
			}); 
			this.isCustomSpeaker = ko.dependentObservable(function() {
				return this.paragraphType() == "<customSpeaker>";
			}, this);
			this.formattedMillis = ko.dependentObservable(function() {
				return utils.formatTime(this.millis(), true);
			}, this);

			// links to previous/next Syncs
			this.next = ko.observable();
			this.prev = ko.observable();
			// annotation that is in scope for this sync
			this.effectiveAnnotation = ko.dependentObservable(function() {
				if (this.annotation()) {
					return this.annotation();
				}
				if (this.prev()) {
					return this.prev().effectiveAnnotation();
				}
				return null;
			}, this);
		}
		Sync.prototype.removeNewParagraph = function() {
			this.annotation(null);
		};
		Sync.prototype.addNewParagraph = function() {
			this.annotation(paragraphTypes[0].value);
		};
		Sync.prototype.focus = function() {
			var doc = this.parent;
			doc.setSelectedSync(this);
		};
		Sync.prototype.toJSONSyncEntry = function() {
			return {
				annotation: this.annotation(),
				millis:     this.millis(),
				text:       this.text()
			};
		};


		function millisToPixels(millis) {
			return 40 * (millis / 1000);
		}
		function Document() {
			this.syncs = ko.observableArray([]);

			// dependent observables
			this.selectedSync = ko.observable();
			this.selectedSyncDivStyle = ko.dependentObservable(function(){
				var style = {};
				
				var sync = this.selectedSync();
				if (sync) {
					var startPixels = millisToPixels(sync.millis());
					style.left = ""+startPixels+"px";
					
					var nextSync = sync.next();
					var endPixels = nextSync ? millisToPixels(nextSync.millis()) : waveformWidth;
					style.width = ""+(endPixels - startPixels)+"px";
				}
				return style;
			}, this);

			// extra methods
			this.splitAt = function(sync, millis, text, characterIndex) {
				if (millis == sync.millis()) {
					alert("Playback cursor must be at least 1 ms past the current sync point.");
					return false;
				}
				if (millis <= sync.millis()){
					console.log("Playback cursor is somehow before current sync point. Not splitting sync.");
					return false;
				}
				if (sync.next() && millis >= sync.next().millis()) {
					console.log("Playback cursor is somehow past the next sync point already. Not splitting sync.");
					return false;
				}
				var prevText = text.substring(0, characterIndex);
				var newText  = text.substring(characterIndex);
				
				sync.text(prevText);
				
				var index = this.syncs.indexOf(sync) + 1;
				var newSync = new Sync(null, millis, newText, this);
				this.addSyncAt(index, newSync);
				newSync.focus();
			};
			this.addSyncAt = function(index, newSync) {
				// was there already a sync at that position?
				var oldSync = this.syncs()[index];
				if (oldSync) {
					// update pointers
					newSync.prev(oldSync.prev());
					oldSync.prev(newSync);
					newSync.next(oldSync);
				}
				// is there a sync previous to this one?
				var prevSync = this.syncs()[index-1];
				if (prevSync) {
					prevSync.next(newSync);
					newSync.prev(prevSync);
				}
				// insert the new sync
				this.syncs.splice(index, 0, newSync);
			};
			this.removeSync = function(sync) {
				// was there a sync before this one ?
				var prevSync = sync.prev();
				var nextSync = sync.next();

				// update their pointers
				if (prevSync) {
					prevSync.next(nextSync);
				}
				if (nextSync) {
					nextSync.prev(prevSync);
				}

				// remove this sync
				var index = this.syncs.indexOf(sync);
				this.syncs.splice(index, 1);
			};
			this.setSelectedSync = function(sync) {
				// deselect the previous sync
				var currentSync = this.selectedSync();
				if (currentSync) {
					currentSync.isSelected(false);
				}
				// mark the new one as selected
				sync.isSelected(true);

				// keep a reference to this one
				this.selectedSync(sync);
			};
			this.navigateToSync = function(sync, cursorPosition) {
				if (sync != this.selectedSync()) {
					this.setSelectedSync(sync);
					sync.textareaCursorPosition(cursorPosition);
					
//					# @player.play()
//					@player.setPosition(sync.millis)
				}
			};
			this.mergeSyncWithPrevious = function(sync, curText) {
				var prevSync = sync.prev();
				if (prevSync) {
					var cursorPos = prevSync.text().length;
					prevSync.text( prevSync.text() + curText );
					this.removeSync(sync);
					this.navigateToSync(prevSync, cursorPos);

//					# @player.play()
//					@player.setPosition(sync.millis)
				}
			};

			this.highlightSyncAccordingToPlayerPosition = function(position) {
				// lookup index to highlight
				var syncs = this.syncs();
				var millis = _.map(this.syncs(), function(s) { return s.millis(); });
				var indexToHighlight = 0;
				for (var i=0, length=millis.length; i<length; i++) {
					if (millis[i] <= position) {
						indexToHighlight = i;
					}
				}
				
				var syncToHighlight = syncs[indexToHighlight];
				var selectedSync = this.selectedSync();
				if (selectedSync !== syncToHighlight) {
					// bug: prevent highlighting section before the one just clicked
					// is the next index currently highlighted?
					if (selectedSync && syncToHighlight.next() === selectedSync) {
						// is it less than 150 ms until next index?
						var nextTime = selectedSync.millis();
						if ((nextTime - position) < 150) {
							// let's just wait
							return;
						}
					}
					
					this.navigateToSync(syncToHighlight, 0);	
				}
			};
			this.toLrgridJSON = function() {
				return {
					syncs: _.map(this.syncs(), function(s) {
						return s.toJSONSyncEntry();
					})
				};
			};
		}

		// store the paragraph types to choose from
		function ParagraphType(value, label) {
			this.value = value;
			this.label = label;
		}
		var paragraphTypes = [new ParagraphType("<p>", "Paragraph"),
					          new ParagraphType("<title>", "Title"),
					          new ParagraphType("<comment>", "Comment"),
							  new ParagraphType("<customSpeaker>", "Speaker")
						    ];

		var viewModel = {
			doc: ko.observable(new Document()),
			paragraphTypes: paragraphTypes
		};

		function populateDocFromJSON(doc, json) {
			var syncs = json.syncs;
			for (var i=0, j=syncs.length; i<j; i++) {
				var s = syncs[i];
				doc.addSyncAt(i, new Sync(s.annotation, s.millis, s.text, doc));
			}
		}
		populateDocFromJSON(viewModel.doc(), lrgridJSON);
		ko.applyBindings(viewModel);

		return viewModel;
	};
});