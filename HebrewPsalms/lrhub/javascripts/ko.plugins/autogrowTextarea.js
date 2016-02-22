define(['jquery',
        'underscore',
		'lib/goog.ui.Textarea',
        'lib/knockout-1.3.0beta.debug'], function($, _, i1, ko_nothing) {
	
	// marks the textarea as auto-grow
	ko.bindingHandlers.autogrowTextarea = {
		init: function(element, valueAccessor) {
			var ta = element;
			
			_.defer(function() {
			    var t2 = new goog.ui.Textarea();
			    t2.decorate(ta);
	
			    var $ta = $(ta);
				$ta.blur(function() {
					t2.resize();
				});
			});
		}
	};
});