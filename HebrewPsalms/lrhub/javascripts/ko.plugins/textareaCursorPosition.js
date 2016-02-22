define(['jquery',
        'utils',
        'lib/knockout-1.3.0beta.debug'], function($, utils, ko_nothing) {
	
	// sets the textarea's cursor position
	ko.bindingHandlers.textareaCursorPosition = {
		init: function(element, valueAccessor) {
			// init the cursor position for newly created textarea
			// scheduling it for 'later', to ensure cursor gets set AFTER autoGrow and focus() have been applied.
			utils.after(0, function() {
				var value = ko.utils.unwrapObservable( valueAccessor() );
		    	var pos = value<0 ? 0 : value;
		    	utils.setInputSelection(element, pos, pos);
			});
		    
			// subscribe to cursor position changes
			// onblur, just setting the value to -1, so we're sure to get notified of later value changes
			$(element).blur(function () {
				var value = valueAccessor();
				value(-1);
			});
		},
		
	    update: function(element, valueAccessor, allBindingsAccessor) {
	    	// set the textarea's cursor position
	    	var value = ko.utils.unwrapObservable( valueAccessor() );
	    	if (value >= 0) {
				$(element).focus();
	    		utils.setInputSelection(element, value, value);
	    	}
	    }
	};
});