# requires:
#    bootstrap, jquery, underscore
#    xregexp-min-2.0.0.js, unicode-base.js

#time = (name, code) -> code()
time = (name, code) ->
   console.log("Starting " + name + "...")
   start = new Date().getTime()
   code()
   elapsed = new Date().getTime() - start
   console.log("Finished " + name + " after " + elapsed + " ms.")

# http://stackoverflow.com/a/7124052
htmlEscape = (str) ->
    String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

# shortcut
h = htmlEscape

fetchUrlDeferred = (url) ->
    fetch = $.Deferred()
    # fetch glossary text
    $.get(url).complete (data) ->
        if (data.status != 200)
            window.alert("Error loading glossary file: "+url)
            console.log(data)
            fetch.reject()
        else
            fetch.resolve(data)
    fetch

# does a shallow flatmap 
flatmap = (xs, fn) -> _(xs).chain().map(fn).flatten(true).value()

# Lovely function to access all of the textNodes anywhere under the given element
# Taken directly from: http://stackoverflow.com/a/4399718/187145
getTextNodesIn = ($, el) ->
    $(el).find(":not(iframe)").addBack().contents().filter(() -> this.nodeType == 3)

#
# Simple Trie implementation
#
class TrieNode
    constructor: ->
        @EOW = false
        @children = {}

    insert: (string) ->
        if string.length == 0
            @EOW = true
        else
            letter = string.substring(0,1)
            rest   = string.substring(1)
            if !(letter of @children)
                @children[letter] = new TrieNode()
            @children[letter].insert(rest);

    matches: (remainingString, processedString = "", matches = []) ->
        if @EOW then matches.push(processedString) 
        if remainingString.length == 0 then return matches
        #console?.log?("remaining string: "+remainingString)
        letter = remainingString.substring(0,1);
        tail   = remainingString.substring(1);
        if letter of @children
            @children[letter].matches(tail, processedString+letter, matches);
        else
            matches


HTMLTAG_REGEX   = /^<[^>]*>/
NONLETTER_REGEX = XRegExp("^((?!\\d)\\p{^L})+")
#LETTER_REGEX    = XRegExp("^(\\p{L}|\\d)+")
# either one CJK character, or a word
LETTER_REGEX    = XRegExp("^([⺀-⺙⺛-⻳⼀-⿕々〇〡-〩〸-〺〻㐀-䶵一-鿃豈-鶴侮-頻並-龎\\u3000-\\u31BF\\u31F0-\\u4DBF]|(\\p{L}|\\d)+)")

class Glossary
    constructor: (@entryMap,
                  @isCJK = false  # non CJK languages must match perfectly, followed by a non-letter.. CJK languages can be followed by anything, since words aren't space-delimited
                  ) ->
        # get a list of words sorted by length, longest first
        terms = Object.keys(@entryMap);
        @lowercaseToTerm = _(terms).chain()
                                   .map((term) => [term.toLowerCase(), term])
                                   .object()
                                   .value();
        @trie = new TrieNode();
        time("Building trie from " + terms.length + " words", () =>
            _.each(Object.keys(@lowercaseToTerm), (lowercaseTerm) => @trie.insert(lowercaseTerm)))
        
        @matchEndingRegex = if @isCJK then "" else "(\\p{^L}|$)"

    # other static constructor
    @fromFileContent: (content, isCJK) -> new @ parseGlossaryToMap(content), isCJK
    
    # returns a deferred Glossary object
    # static
    @loadFromUrl: ($, url) ->
        isCJK = Glossary.isCJK(url)
        fetchUrlDeferred(url).then (data) ->
            Glossary.fromFileContent(data.responseText, isCJK)
    
    # Looks for any CJK codes in URL
    # static
    @isCJK: (url) ->
        cjkCodes = ['ch', 'zh', 'zw', 'ja', 'jp', 'ko']
        _.find(cjkCodes, (code) -> ///_#{code}-///.test(url))
    
    findMatches: (text) ->
        _(@trie.matches(text.toLowerCase()))
              .chain()
              .filter((match) => XRegExp.cache("^"+XRegExp.escape(match)+@matchEndingRegex, "i").  # change this for Chinese (any lang the doesn't use spaces to delimit words)
                                        test(text))
              .sortBy((match) -> -match.length)  # sort longest first
              .map((match) =>
                        term = @lowercaseToTerm[match]
                        [term, @entryMap[term]])
              .value()
    
    # turn tab-delimited glossary file content into an object of terms to definitions
    # Private method
    parseGlossaryToMap = (text) ->
        lines = _.string.lines(text)
        sep = "\t"
        map = {}
        entries = _(lines).chain()
                .filter((line) => _.str.include(line, sep))
                .map((line) =>
                    a = line.split(sep);
                    word = _.string.trim(a[0]);
                    def  = _.string.trim(a[1]);
                    [word, def])
                .filter(([word, _]) => word.length > 0)
                .each(([word, def]) ->
                    if word == "般"
                        console.log("般 def:"+def)
                    if word of map
                        console.log("Appending def for "+word)
                        map[word].push(def)
                    else
                        map[word] = [def])
        map

class PopupDict
    @loadGlossariesAndAddPopupDefs: ($, glossaryUrls, element) ->
        deferreds = _(glossaryUrls).map (url) -> Glossary.loadFromUrl($, url)
        $.when(deferreds...).then (glossaries...) ->
            console.log("Glossaries: "+glossaries.length)
            window.glossaries = glossaries
            PopupDict.addPopupDefinitions($, glossaries, element)
    
    @addPopupDefinitions: ($, glossaries, element) ->
        time "adding popup definitions", () =>
            textNodes = getTextNodesIn($, element)
            _.each textNodes, (t) =>
                $(t).replaceWith(@markupGlossaryTerms(glossaries, t.textContent))
        # enable popup definitions
        $(element).find(".definition").popover
                            trigger: "hover"
                            placement: "bottom"
                            html: true

    # returns a string with any matching terms marked-up
    @markupGlossaryTerms: (glossaries, text) ->
        markedup = [];
        # go over the text one character at a time
        while (text.length > 0)
            # directly copy over any leading non-letter characters (HTML tags, punctuation, whitespace)
            htmlTag   = HTMLTAG_REGEX.exec(text);
            nonLetter = NONLETTER_REGEX.exec(text)  # includes whitespace
            ignoreToken = htmlTag?[0] || nonLetter?[0];
            if (ignoreToken)
                markedup.push(ignoreToken)
                text = _.string.splice(text, 0, ignoreToken.length)
            else
                # process next word token
                word = LETTER_REGEX.exec(text)[0]; # just grab first word from text

                # does the text start with anything matching in the glossary?
                matches = flatmap(glossaries, (g) -> g.findMatches(text))
                if (matches.length > 0)
                    definition = _(matches).map(([term, defs]) ->
                                              defsHTML = _(defs).map(htmlEscape).join('<br/>')  
                                              "<div class='word'>"+h(term)+"</div><div class='word-def'>"+defsHTML+"</div>")
                                           .join('')
                    # copy word over with popup definition
                    markedup.push('<span class="definition" data-content="'+h(definition)+'">'+h(word)+'</span>')
                else
                    # copy plain word over
                    markedup.push(word);
                text = _.string.splice(text, 0, word.length)
        markedup.join("")


window.PopupDict = PopupDict
window.Glossary  = Glossary
