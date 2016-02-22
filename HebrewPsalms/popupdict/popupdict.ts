// requires:
//    bootstrap, jquery, underscore
//    xregexp-min-2.0.0.js, unicode-base.js

// seems like these are auto-imported.. or at least these pollute the global namespace as a side-effect
//import $ = require('jquery');
//import _ = require('underscore');
//import underscoreString = require('underscore.string')

//import XRegExp = require('xregexp');

var XRegExp = xregexp

//time = (name, code) -> code()
function time(name: string, code: () => void) {
    console.log("Starting " + name + "...");
    var start = new Date().getTime();
    code();
    var elapsed = new Date().getTime() - start;
    console.log( `Finished ${name} after ${elapsed} ms.`);
}

// http://stackoverflow.com/a/7124052
function htmlEscape(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
}

// shortcut
var h = htmlEscape

function fetchUrlDeferred(url: string): JQueryDeferred<string> {
    var fetch = $.Deferred();
    // fetch glossary text
    $.get(url).then((data) => {
        if (data.status !== 200) {
            window.alert("Error loading glossary file: " + url);
            console.log(data);
            return fetch.reject();
        } else {
            return fetch.resolve(data.responseText);
        }
    });
    return fetch;
}

// does a shallow flatmap
function flatmap<T>(xs: T[], fn: (T) => T) {
    return _(xs).chain().map(fn).flatten(true).value();
}

// Lovely function to access all of the textNodes anywhere under the given element
// Taken directly from: http://stackoverflow.com/a/4399718/187145
function getTextNodesIn($: JQueryStatic, el): Element[] {
    return $(el).find(":not(iframe)").addBack().contents().filter(function() {
        return this.nodeType === 3;
    }).get();
}

//
// Simple Trie implementation
//
class TrieNode {
    
    EOW: boolean
    children: {[key: string]: TrieNode}
    
    constructor() {
        this.EOW = false;
        this.children = {};
    }

    insert(string: string) {
        if (string.length === 0) {
            this.EOW = true;
        } else {
            var letter = string.substring(0, 1);
            var rest = string.substring(1);
            if (!(letter in this.children)) {
                this.children[letter] = new TrieNode();
            }
            this.children[letter].insert(rest);
        }
    }

    matches(remainingString: string, processedString = "", theMatches: string[] = []): string[] {
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
        } else {
            return theMatches;
        }
    }
}

var HTMLTAG_REGEX = /^<[^>]*>/;
var NONLETTER_REGEX = XRegExp("^((?!\\d)\\p{^L})+");
//LETTER_REGEX    = XRegExp("^(\\p{L}|\\d)+")
// either one CJK character, or a word
var LETTER_REGEX = XRegExp("^([⺀-⺙⺛-⻳⼀-⿕々〇〡-〩〸-〺〻㐀-䶵一-鿃豈-鶴侮-頻並-龎\\u3000-\\u31BF\\u31F0-\\u4DBF]|(\\p{L}|\\d)+)");

interface GlossaryEntryMap {
    [key: string]: string[]
}
class Glossary {
    
    lowercaseToTerm: {[key: string]: string} = {}
    trie: TrieNode = new TrieNode()
    matchEndingRegex: string
    
    constructor(
        public entryMap: GlossaryEntryMap,
        public isCJK : any = false
    ) {
        // get a list of words sorted by length, longest first
        var terms = Object.keys(this.entryMap);
        // build lowercaseToTerm map
        terms.forEach((term) => this.lowercaseToTerm[term.toLowerCase()] = term)
        time("Building trie from " + terms.length + " words", () => { 
            Object.keys(this.lowercaseToTerm).forEach(this.trie.insert)
        });

        this.matchEndingRegex = this.isCJK ? "" : "(\\p{^L}|$)";
    }

    // other static constructor

    public static fromFileContent(content: string, isCJK: boolean) {
        return new this(Glossary.parseGlossaryToMap(content), isCJK);
    }

    // returns a deferred Glossary object
    public static loadFromUrl($: JQuery, url: string): JQueryPromise<Glossary> {
        var isCJK = Glossary.isCJK(url);
        return fetchUrlDeferred(url).then((body) => Glossary.fromFileContent(body, isCJK));
    }

    // Looks for any CJK codes in URL
    public static isCJK(url: string): boolean {
        var cjkCodes = ["ch", "zh", "zw", "ja", "jp", "ko"];
        return cjkCodes.some((code) => RegExp("_"+code+"-").test(url));
    }

    public findMatches(text) {
        return _(this.trie.matches(text.toLowerCase())).chain().filter((match) => XRegExp.cache("^" + XRegExp.escape(match) + this.matchEndingRegex, "i").test(text)).sortBy((match) => -match.length).map((match) => {
            var term;
            term = this.lowercaseToTerm[match];
            return [term, this.entryMap[term]];
        }).value();
    }

    // turn tab-delimited glossary file content into an object of terms to definitions
    private static parseGlossaryToMap(text: string): GlossaryEntryMap {
        var lines: string[] = _.string.lines(text);
        var sep = "\t";
        var map: GlossaryEntryMap = {};
        lines.filter((line) => _.str.include(line, sep))
            .map((line) => {
                var a = line.split(sep);
                var word = _.string.trim(a[0]);
                var def = _.string.trim(a[1]);
                return [word, def];
            })
            .filter(([word, _]) => word.length > 0)
            .forEach(([word, def]) => {
                if (word === "般") {
                    console.log("般 def:" + def);
                }
                if (word in map) {
                    console.log("Appending def for " + word);
                    return map[word].push(def);
                } else {
                    return map[word] = [def];
                }
            });
        return map;
    };
}

class PopupDict {
    public static loadGlossariesAndAddPopupDefs($, glossaryUrls, element) {
        var deferreds = glossaryUrls.map((url) => Glossary.loadFromUrl($, url));
        return $.when.apply($, deferreds).then((...glossaries) => {
            console.log("Glossaries: " + glossaries.length);
            // window.glossaries = glossaries;
            return PopupDict.addPopupDefinitions($, glossaries, element);
        });
    }

    public static addPopupDefinitions($: JQueryStatic, glossaries: Glossary[], element: Element) {
        time("adding popup definitions", () => {
            var textNodes = getTextNodesIn($, element);
            return textNodes.forEach((t) => $(t).replaceWith(this.markupGlossaryTerms(glossaries, t.textContent)));
        });
        // enable popup definitions
        return $(element).find(".definition").popover({
            trigger: "hover",
            placement: "bottom",
            html: true
        });
    }

    // returns a string with any matching terms marked-up

    public static markupGlossaryTerms(glossaries, text) {
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
            } else {
                // process next word token
                word = LETTER_REGEX.exec(text)[0];

                // does the text start with anything matching in the glossary?
                matches = flatmap(glossaries, (g) => g.findMatches(text));
                if (matches.length > 0) {
                    definition = _(matches).map((_arg) => {
                        var defs, defsHTML, term, _arg;
                        term = _arg[0], defs = _arg[1];
                        defsHTML = _(defs).map(htmlEscape).join("<br/>");
                        return "<div class='word'>" + h(term) + "</div><div class='word-def'>" + defsHTML + "</div>";
                    }).join("");
                    // copy word over with popup definition
                    markedup.push("<span class=\"definition\" data-content=\"" + h(definition) + "\">" + h(word) + "</span>");
                } else {
                    // copy plain word over
                    markedup.push(word);
                }
                text = _.string.splice(text, 0, word.length);
            }
        }
        return markedup.join("");
    }
}

// let's export some crap to `window`

interface Window {
    Glossary: Glossary
    PopupDict: PopupDict
    glossaries: Glossary[]
}

// window.PopupDict = PopupDict;
// window.Glossary = Glossary;
