// requires:
//    bootstrap, jquery, underscore
//    xregexp-min-2.0.0.js, unicode-base.js
// seems like these are auto-imported.. or at least these pollute the global namespace as a side-effect
//import $ = require('jquery');
//import _ = require('underscore');
//import underscoreString = require('underscore.string')
var XRegExp = require('xregexp');
//time = (name, code) -> code()
function time(name, code) {
    console.log("Starting " + name + "...");
    var start = new Date().getTime();
    code();
    var elapsed = new Date().getTime() - start;
    console.log("Finished " + name + " after " + elapsed + " ms.");
}
// http://stackoverflow.com/a/7124052
function htmlEscape(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
// shortcut
var h = htmlEscape;
function fetchUrlDeferred(url) {
    var fetch = $.Deferred();
    // fetch glossary text
    $.get(url).then(function (data) {
        if (data.status !== 200) {
            window.alert("Error loading glossary file: " + url);
            console.log(data);
            return fetch.reject();
        }
        else {
            return fetch.resolve(data.responseText);
        }
    });
    return fetch;
}
// does a shallow flatmap
function flatmap(xs, fn) {
    return _(xs).chain().map(fn).flatten(true).value();
}
// Lovely function to access all of the textNodes anywhere under the given element
// Taken directly from: http://stackoverflow.com/a/4399718/187145
function getTextNodesIn($, el) {
    return $(el).find(":not(iframe)").addBack().contents().filter(function () {
        return this.nodeType === 3;
    }).get();
}
//
// Simple Trie implementation
//
var TrieNode = (function () {
    function TrieNode() {
        this.EOW = false;
        this.children = {};
    }
    TrieNode.prototype.insert = function (string) {
        if (string.length === 0) {
            this.EOW = true;
        }
        else {
            var letter = string.substring(0, 1);
            var rest = string.substring(1);
            if (!(letter in this.children)) {
                this.children[letter] = new TrieNode();
            }
            this.children[letter].insert(rest);
        }
    };
    TrieNode.prototype.matches = function (remainingString, processedString, theMatches) {
        if (processedString === void 0) { processedString = ""; }
        if (theMatches === void 0) { theMatches = []; }
        if (this.EOW) {
            theMatches.push(processedString);
        }
        if (remainingString.length === 0) {
            return theMatches;
        }
        //console?.log?("remaining string: "+remainingString)
        var letter = remainingString.substring(0, 1);
        var tail = remainingString.substring(1);
        if (letter in this.children) {
            return this.children[letter].matches(tail, processedString + letter, theMatches);
        }
        else {
            return theMatches;
        }
    };
    return TrieNode;
})();
var HTMLTAG_REGEX = /^<[^>]*>/;
var NONLETTER_REGEX = XRegExp("^((?!\\d)\\p{^L})+");
//LETTER_REGEX    = XRegExp("^(\\p{L}|\\d)+")
// either one CJK character, or a word
var LETTER_REGEX = XRegExp("^([⺀-⺙⺛-⻳⼀-⿕々〇〡-〩〸-〺〻㐀-䶵一-鿃豈-鶴侮-頻並-龎\\u3000-\\u31BF\\u31F0-\\u4DBF]|(\\p{L}|\\d)+)");
var Glossary = (function () {
    function Glossary(entryMap, isCJK) {
        var _this = this;
        if (isCJK === void 0) { isCJK = false; }
        this.entryMap = entryMap;
        this.isCJK = isCJK;
        this.lowercaseToTerm = {};
        this.trie = new TrieNode();
        // get a list of words sorted by length, longest first
        var terms = Object.keys(this.entryMap);
        // build lowercaseToTerm map
        terms.forEach(function (term) { return _this.lowercaseToTerm[term.toLowerCase()] = term; });
        time("Building trie from " + terms.length + " words", function () {
            Object.keys(_this.lowercaseToTerm).forEach(_this.trie.insert);
        });
        this.matchEndingRegex = this.isCJK ? "" : "(\\p{^L}|$)";
    }
    // other static constructor
    Glossary.fromFileContent = function (content, isCJK) {
        return new this(Glossary.parseGlossaryToMap(content), isCJK);
    };
    // returns a deferred Glossary object
    Glossary.loadFromUrl = function ($, url) {
        var isCJK = Glossary.isCJK(url);
        return fetchUrlDeferred(url).then(function (body) { return Glossary.fromFileContent(body, isCJK); });
    };
    // Looks for any CJK codes in URL
    Glossary.isCJK = function (url) {
        var cjkCodes = ["ch", "zh", "zw", "ja", "jp", "ko"];
        return cjkCodes.some(function (code) { return RegExp("_" + code + "-").test(url); });
    };
    Glossary.prototype.findMatches = function (text) {
        var _this = this;
        return _(this.trie.matches(text.toLowerCase())).chain().filter(function (match) { return XRegExp.cache("^" + XRegExp.escape(match) + _this.matchEndingRegex, "i").test(text); }).sortBy(function (match) { return -match.length; }).map(function (match) {
            var term;
            term = _this.lowercaseToTerm[match];
            return [term, _this.entryMap[term]];
        }).value();
    };
    // turn tab-delimited glossary file content into an object of terms to definitions
    Glossary.parseGlossaryToMap = function (text) {
        var lines = _.string.lines(text);
        var sep = "\t";
        var map = {};
        lines.filter(function (line) { return _.str.include(line, sep); })
            .map(function (line) {
            var a = line.split(sep);
            var word = _.string.trim(a[0]);
            var def = _.string.trim(a[1]);
            return [word, def];
        })
            .filter(function (_a) {
            var word = _a[0], _ = _a[1];
            return word.length > 0;
        })
            .forEach(function (_a) {
            var word = _a[0], def = _a[1];
            if (word === "般") {
                console.log("般 def:" + def);
            }
            if (word in map) {
                console.log("Appending def for " + word);
                return map[word].push(def);
            }
            else {
                return map[word] = [def];
            }
        });
        return map;
    };
    ;
    return Glossary;
})();
var PopupDict = (function () {
    function PopupDict() {
    }
    PopupDict.loadGlossariesAndAddPopupDefs = function ($, glossaryUrls, element) {
        var deferreds = glossaryUrls.map(function (url) { return Glossary.loadFromUrl($, url); });
        return $.when.apply($, deferreds).then(function () {
            var glossaries = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                glossaries[_i - 0] = arguments[_i];
            }
            console.log("Glossaries: " + glossaries.length);
            // window.glossaries = glossaries;
            return PopupDict.addPopupDefinitions($, glossaries, element);
        });
    };
    PopupDict.addPopupDefinitions = function ($, glossaries, element) {
        var _this = this;
        time("adding popup definitions", function () {
            var textNodes = getTextNodesIn($, element);
            return textNodes.forEach(function (t) { return $(t).replaceWith(_this.markupGlossaryTerms(glossaries, t.textContent)); });
        });
        // enable popup definitions
        return $(element).find(".definition").popover({
            trigger: "hover",
            placement: "bottom",
            html: true
        });
    };
    // returns a string with any matching terms marked-up
    PopupDict.markupGlossaryTerms = function (glossaries, text) {
        var definition, htmlTag, ignoreToken, markedup, matches, nonLetter, word;
        markedup = [];
        // go over the text one character at a time
        while (text.length > 0) {
            // directly copy over any leading non-letter characters (HTML tags, punctuation, whitespace)
            htmlTag = HTMLTAG_REGEX.exec(text);
            nonLetter = NONLETTER_REGEX.exec(text);
            ignoreToken = (htmlTag != null ? htmlTag[0] : void 0) || (nonLetter != null ? nonLetter[0] : void 0);
            if (ignoreToken) {
                markedup.push(ignoreToken);
                text = _.string.splice(text, 0, ignoreToken.length);
            }
            else {
                // process next word token
                word = LETTER_REGEX.exec(text)[0];
                // does the text start with anything matching in the glossary?
                matches = flatmap(glossaries, function (g) { return g.findMatches(text); });
                if (matches.length > 0) {
                    definition = _(matches).map(function (_arg) {
                        var defs, defsHTML, term, _arg;
                        term = _arg[0], defs = _arg[1];
                        defsHTML = _(defs).map(htmlEscape).join("<br/>");
                        return "<div class='word'>" + h(term) + "</div><div class='word-def'>" + defsHTML + "</div>";
                    }).join("");
                    // copy word over with popup definition
                    markedup.push("<span class=\"definition\" data-content=\"" + h(definition) + "\">" + h(word) + "</span>");
                }
                else {
                    // copy plain word over
                    markedup.push(word);
                }
                text = _.string.splice(text, 0, word.length);
            }
        }
        return markedup.join("");
    };
    return PopupDict;
})();
// window.PopupDict = PopupDict;
// window.Glossary = Glossary;
//# sourceMappingURL=popupdict.js.map