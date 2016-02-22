define([], function() {
	var utils = {};
	
	utils.atleast = function(min, x) { return x < min ? min : x; };
	utils.atmost  = function(max, x) { return x > max ? max : x; };

	utils.after = function(ms, fn) { setTimeout(fn, ms);  };
	utils.every = function(ms, fn) { setInterval(fn, ms); };

	// get the selected start and end range in the given textarea
	utils.getInputSelection = function(el) {
	    var start = 0, end = 0, normalizedValue, range,
	        textInputRange, len, endRange;
	
	    if (typeof el.selectionStart == "number" && typeof el.selectionEnd == "number") {
	        start = el.selectionStart;
	        end = el.selectionEnd;
	    } else {
	        range = document.selection.createRange();
	
	        if (range && range.parentElement() == el) {
	            len = el.value.length;
	            normalizedValue = el.value.replace(/\r\n/g, "\n");
	
	            // Create a working TextRange that lives only in the input
	            textInputRange = el.createTextRange();
	            textInputRange.moveToBookmark(range.getBookmark());
	
	            // Check if the start and end of the selection are at the very end
	            // of the input, since moveStart/moveEnd doesn't return what we want
	            // in those cases
	            endRange = el.createTextRange();
	            endRange.collapse(false);
	
	            if (textInputRange.compareEndPoints("StartToEnd", endRange) > -1) {
	                start = end = len;
	            } else {
	                start = -textInputRange.moveStart("character", -len);
	                start += normalizedValue.slice(0, start).split("\n").length - 1;
	
	                if (textInputRange.compareEndPoints("EndToEnd", endRange) > -1) {
	                    end = len;
	                } else {
	                    end = -textInputRange.moveEnd("character", -len);
	                    end += normalizedValue.slice(0, end).split("\n").length - 1;
	                }
	            }
	        }
	    }
	
	    return {
	        start: start,
	        end: end
	    };
	};

	utils.offsetToRangeCharacterMove = function(el, offset) {
	    return offset - (el.value.slice(0, offset).split("\r\n").length - 1);
	};

	utils.setInputSelection = function(el, startOffset, endOffset) {
	    if (typeof el.selectionStart == "number" && typeof el.selectionEnd == "number") {
	        el.selectionStart = startOffset;
	        el.selectionEnd = endOffset;
	    } else {
	        var range = el.createTextRange();
	        var startCharMove = utils.offsetToRangeCharacterMove(el, startOffset);
	        range.collapse(true);
	        if (startOffset == endOffset) {
	            range.move("character", startCharMove);
	        } else {
	            range.moveEnd("character", utils.offsetToRangeCharacterMove(el, endOffset));
	            range.moveStart("character", startCharMove);
	        }
	        range.select();
	    }
	};
	
	
	utils.formatTime = function(ms, includeMillis) {
		function pad2(number) {
			return (number<10 ? '0' : '') + number;
		}
		function pad3(number) {
			return (number<100 ? '0' : '') + pad2(number);
		}
	    millis = Math.floor(ms % 1000);
	    x = ms / 1000;
	    seconds = Math.floor(x % 60);
	    x /= 60;
	    minutes = Math.floor(x % 60);
	    x /= 60;
	    hours = Math.floor(x % 24);
	    
	    var millisPart = includeMillis ? '.'+pad3(millis) : ''; 
	    if (hours > 0) {
	    	return hours+':'+pad2(minutes)+':'+pad2(seconds)+millisPart;
	    }
	    else if (minutes > 0) {
	        return minutes+':'+pad2(seconds)+millisPart;
	    }
	    else {
	        return seconds+millisPart;
	    }
	};
	
	// FireFox equivalent of: scrollIntoViewIfNeeded()
	// From: http://www.performantdesign.com/2009/08/26/scrollintoview-but-only-if-out-of-view/
	utils.scrollIntoViewIfOutOfView = function(el) {
		var topOfPage = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
		var heightOfPage = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
		var elY = 0;
		var elH = 0;
		if (document.layers) { // NS4
			elY = el.y;
			elH = el.height;
		}
		else {
			for(var p=el; p&&p.tagName!='BODY'; p=p.offsetParent){
				elY += p.offsetTop;
			}
			elH = el.offsetHeight;
		}
		if ((topOfPage + heightOfPage) < (elY + elH)) {
			el.scrollIntoView(false);
		}
		else if (elY < topOfPage) {
			el.scrollIntoView(true);
		}
	};	
	
	utils.scrollIntoViewIfNeeded = function(elem) {
		if (elem.scrollIntoViewIfNeeded != null) {
			elem.scrollIntoViewIfNeeded();
		}
		else {
			utils.scrollIntoViewIfOutOfView(elem);
		}
	};
	
	return utils;	
});