define(['jquery',
        'lib/raphael-min',
        'utils'], function(jquery, raphael_nothing, utils) {
	
	// constructor
	function Waveform(waveformDiv, svgDiv, width, height, svgPathsArray, durationMillis, sound) {
		this.waveformDiv = waveformDiv;
		this.svgDiv = svgDiv;
		this.height = height;
		this.durationMillis = durationMillis;
		
		// create 'paper' canvas of appropriate size
		this.paper = Raphael(svgDiv, width, height);
		
		// add waveform sections to paper
		this.waveformPaths = [];
		var i, svgPath, w, _len;
		for (i=0, _len=svgPathsArray.length; i<_len; i++) {
			svgPath = svgPathsArray[i];
			w = this.paper.path(svgPath);
			//w.animate( {fill:'#666', stroke:'DDD'}, 1000);
			//console.log("Scheduled an animation2!!!");
			w.attr('fill','#666');
			w.attr('stroke','DDD');
			this.waveformPaths.push(w);
		}
		
		// add position marker
		this.positionMarker = $('<div>').addClass('positionMarker').appendTo(svgDiv);
		this.updatePosition(0);
		
		// add onclick handler that selects playback position
		// if we attach the click listener directly to the element now,
		// it will NOT work later.. some bug with KnockoutJS???
		// If we instead listen on 'body' and filter based on node ID, then that will work
		$('body').on('click', '#'+waveformDiv.id, function(e) {
			var container = this;
			var relX = e.clientX - container.offsetLeft + container.scrollLeft;
			//relY = e.clientY - container.offsetTop  + container.scrollTop;
			// move position indicator
			var millis = relX / 40 * 1000;
			sound.setPosition(millis);
		});
	};

	
	Waveform.prototype.updatePosition = function(millis) {
		var pixels = Math.floor(40 * (millis / 1000));
		if (pixels != this.lastPositionPx) {
			this.lastPositionPx = pixels;
			this.positionMarker.css('left', ''+pixels+'px');
		}
		
		// scroll waveform if needed
		var $w = $(this.waveformDiv);
		var left = $w.scrollLeft();
		var width = $w.width();
		var right = left + width;
		var padding = width * .05;
		var newLeft  = left + padding;
		var newRight = right - padding;
		if (pixels < left || pixels >= newRight) {
			// scroll into view
			$w.scrollLeft(pixels - padding);
			//$w.animate({scrollLeft:(pixels-padding)}, {queue:false, duration:300});
		}
	};
	
	return Waveform;
});