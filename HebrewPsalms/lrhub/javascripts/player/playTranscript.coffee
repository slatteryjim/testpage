startsWith = (str, prefix) -> str.slice(0, prefix.length) == prefix
# add/remove CSS classes
addClass    = (element, classname) -> element.className += ' '+classname
removeClass = (element, classname) -> element.className = element.className.replace(new RegExp('\\b'+classname+'\\b', 'g'), '').replace(/\s+/g, ' ')

findAllElementsHavingPrefix = (tagName, prefix) ->
	matches = []
	for element in document.getElementsByTagName(tagName)
		if startsWith(element.id, prefix)
			matches.push(element)
	matches


window.Transcript = class Transcript

	# all transcript <spans> and their corresponding startTimeMillis
	spansAndTimes: []
	highlightedIndex:  undefined
	highlightedMillis: undefined  # when was last checked
	timeMonitor:       undefined
		
	constructor: (@soundObj, spanPrefix, mouseoverClass, @highlightClass) ->
		# gather all spans and their times
	
		# find the spans with the given prefix
		spansWithPrefix = findAllElementsHavingPrefix('span', spanPrefix);
		for span in spansWithPrefix
			time = span.id.slice(spanPrefix.length)
			@spansAndTimes.push({span, time})
		
		for {span, time}, index in @spansAndTimes
			# add mouseover highlights to all spans
			span.onmouseover = -> addClass(this, mouseoverClass)
			span.onmouseout  = -> removeClass(this, mouseoverClass)
			
			# add an onclick handler -- triggers playback
			span.onclick = do (time, index) =>
				=>
				  @highlightSpan index
				  @soundObj.play()
				  @soundObj.setPosition time
		
		# add a listener for media player time updates
		@timeMonitor = setInterval((=> @processNewTime @soundObj.getPosition()), 75)
	
	# highlight the appropriate span
	processNewTime: (millis) =>
		findSpanIDToHighlight = (millis) =>
			count = @spansAndTimes.length
			for i in [0..(count-1)]
				span = @spansAndTimes[i];
				if millis >= span.time
					isLast = (i+1) == count
					if isLast then return i
					nextSpan = @spansAndTimes[i+1]
					if millis < nextSpan.time
						return i
	
		if millis != @highlightedMillis
			@highlightedMillis = millis;
			index = findSpanIDToHighlight(millis)
			
			# bug: prevent highlighting section before the one just clicked
			# is the next index currently highlighted?
			if (index + 1) == @highlightedIndex
				# is it less than 150 ms until next index?
				nextTime = @spansAndTimes[@highlightedIndex].time
				millisUntil = nextTime - millis
				if millisUntil < 150
					# let's just wait
					return;		

			@highlightSpan(index)
	
	# highlight the given span (and none others)
	highlightSpan: (index) =>
		if @highlightedIndex != index
			if @highlightedIndex?
				removeClass(@spansAndTimes[@highlightedIndex].span, @highlightClass)
			span = @spansAndTimes[index].span
			addClass(span, @highlightClass);
			$(span).scrollintoview()
			@highlightedIndex = index
	
