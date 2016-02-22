<?php
// parse URL parameters
$trs        = $_GET["trs"];// ?: "sample.trs"; //types_render_field("trs");
$mp3        = $_GET["mp3"];// ?: "sample.mp3"; //types_render_field("mp3");
$fontsize   = $_GET["fontsize"];
$color      = $_GET["color"];
$bg_color   = $_GET["bg_color"];
$bg_url     = $_GET["bg_url"];
$glossaries = $_GET["glossaries"];

include "include/glossaryAttributeToArray.php"

//$plugin_base_url = plugin_dir_url(__FILE__);
//$glossary = plugin_dir_url(__FILE__) . 'glossary.txt';
?> <html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Interactive Transcript Player</title>

    <!-- LRHub CSS -->
    <link rel="stylesheet/less" href="lrhub/stylesheets/main.css"></link>
    <!--<link rel="stylesheet/less" href="lrhub/stylesheets/bootstrap/less/bootstrap.less"></link>-->
    <link rel="stylesheet" type="text/css" href="lrhub/stylesheets/bootstrap/less/bootstrap.css"></link>
    <link type="text/css" rel="stylesheet/less" href="lrhub/stylesheets/playTranscript.less"></link>
    
    <script type="text/javascript" src="lrhub/javascripts/lib/less-1.3.0.min.js"></script>
    <script type="text/javascript" src="lrhub/javascripts/lib/jquery-1.8.3.min.js"></script>
    <script type="text/javascript" src="lrhub/javascripts/lib/rotate3Di.js"></script>
    <script type="text/javascript" src="lrhub/javascripts/lib/xregexp/xregexp-min-2.0.0.js"></script>
    <script type="text/javascript" src="lrhub/javascripts/lib/xregexp/unicode-base.js"></script>
    <script type="text/javascript" src="lrhub/javascripts/lib/underscore-1.4.2.min.js"></script>
    <script type="text/javascript" src="lrhub/javascripts/lib/underscore.string-2.3.0.min.js"></script>

    <link rel="stylesheet" type="text/css" href="popupdict/bootstrap/bootstrap.css" />
    <link rel="stylesheet" type="text/css" href="popupdict/popupdict.css" />
    <script type="text/javascript" src="popupdict/bootstrap/bootstrap.js"></script>
    <script type="text/javascript" src="popupdict/popupdict.js"></script>
    
    <!-- LRHub JS -->
    <script type="text/javascript" src="lrhub/javascripts/lib/sm2/soundmanager2.js"></script>
    <script type="text/javascript">
        soundManager.setup({
            url: 'lrhub/javascripts/lib/sm2/swf/', // directory where SM2 .SWFs live
            debugMode: false
        });
    </script>

    <script type="text/javascript" src="lrhub/javascripts/lib/jquery.layout-latest.js"></script>
    <script type="text/javascript" src="lrhub/javascripts/lib/jquery.scrollintoview.min.js"></script>
    <script type="text/javascript" src="lrhub/javascripts/lib/shortcut.js"></script>
    <script type="text/javascript" src="lrhub/javascripts/player/playTranscript.js"></script>
    <script type="text/javascript" src="lrhub/javascripts/player/mp3Player.js"></script>
    <script type="text/javascript" src="lrhub/javascripts/player/play.js"></script>    
    <style>       
        body {
            /* http://img.src.ca/2013/10/16/635x357/131016_c8712_rci-view230_sn635.jpg */
            background: url('<?php echo $bg_url ?>') no-repeat center center fixed;
            background-size: cover;
            background-color: <?php echo $bg_color ?>;
        }
        
        .ui-layout-north {
            padding-left: 9px;
            border-bottom: 1px grey solid;
            margin-top: -1px;
            background: rgba(255, 255, 255, 0.8);
        }
        
        .ui-layout-center {
            overflow-x: scroll;
        }
        
        /* Flipping flashcards */
        .flashcards {
            display: block;
            float: left;
        }
        .flashcard {
            float: left;
            margin: 10px;
            position: relative;
            display: inline;
        }
        .flashcard .front,
        .flashcard .back {
            width:130px;
            height:100px;
            padding: 15px;
            -moz-border-radius: 12px;
            -webkit-border-radius: 12px;
            border-radius: 12px;
        }
        .flashcard .front {
            background:#70DB93;
            font-size:18px;
            color:#000000;
        }        
        .flashcard .back {
            background:#C77826;
            font-size:17px;
            color:#FFFFFF;
        }
        
        .transcript span {
            color: <?php echo $color ?>;
        }
    </style>
    
    <script>
        var trs = '<?php echo $trs ?>';
        var mp3 = '<?php echo $mp3 ?>';
        var glossaryUrls = <?php echo glossaryAttributeToArray(".", $glossaries) ?>;
    </script>

    <script>
        "use strict";
        // globals
        var transcriptData;
        var player;

        var $ = jQuery;

        $(function () {
            // fetch TRS, and build transcript display

            var handler = function (trsXml, glossary) {
                var lrgrid, transcriptData;
                window.trsXml = trsXml;
                lrgrid = trsToLrgrid(trsXml);
                transcriptData = lrgridToTranscript(lrgrid);
                window.transcriptData = transcriptData;
                var transcriptNode = $("#transcript")[0];
                drawTranscript(transcriptNode, transcriptData.turns);

                // markup glossary terms
                //popupdict.addPopupDefinitions(transcript);
                PopupDict.loadGlossariesAndAddPopupDefs($, glossaryUrls, transcriptNode);

                drawFlashcards($("#flashcards")[0], transcriptData.glossaryArray);
            };

            // for some reason, jQuery is treating the 200 response as an error!  Using .complete() to manually deal with the response
            $.get(trs).complete(function (data) {
                if (data.status !== 200) {
                    window.alert("Error loading Transcriber file.");
                    console.log(data);
                } else {
                    handler(data.responseText);
                }
            });

            //popupdict.init($, "glossary.txt");

            // load audio
            init(mp3, 'segment-');

            $("#flashcard-title").click(function () {
                return $("#flashcards").toggle();
            });
        });
    </script>
    <script>
        "use strict";

        function partition(items, size) {
            var result = _.groupBy(items, function (item, i) {
                return Math.floor(i / size);
            });
            return _.map(result, function (val, key) {
                return val;
            });
        }

        function trsToLrgrid(trsXmlString) {
            function getSpeakersMap(trans) {
                var $speakers = $(trans).children("Speakers").children("Speaker")
                // extract [id, name] pairs and return as map object
                return _.chain($speakers)
                    .map(function (s) { return [s.getAttribute('id'), s.getAttribute('name')]; })
                    .object()
                    .value()
            }

            function segmentsForTurn(turn, speaker) {
                // first child is just a newline char
                var list = _(turn.childNodes).tail();
                var pairs = partition(list, 2);
                var syncs = [];
                _(pairs).each(function (pair, index) {
                    var sync = {};
                    if (index == 0) sync["annotation"] = speaker;
                    sync["millis"] = pair[0].getAttribute('time') * 1000,
                    sync["text"] = pair[1].textContent.slice(1, -1)
                    syncs.push(sync);
                });
                return syncs;
            }

            var xml = $.parseXML(trsXmlString)
            var trans = $(xml).children("Trans");
            var speakers = getSpeakersMap(trans);

            var turns = $(xml).children("Trans").children("Episode").children("Section").children("Turn")
            var syncs = _.chain(turns)
                .map(function (turn) { return segmentsForTurn(turn, speakers[turn.getAttribute("speaker")]); })
                .flatten(true)
                .value();

            // make lrgrid
            return { "syncs": syncs };
        }

        function lrgridToTranscript(lrgrid) {
            function splitIntoGroups(list, beginNewSplitPredicate) {
                var groups = [];
                var currentGroup = [];
                _.each(list, function (element, index) {
                    if (beginNewSplitPredicate(element) || index == 0) {
                        if (currentGroup.length > 0) groups.push(currentGroup);
                        currentGroup = [];
                    }
                    currentGroup.push(element);
                })
                groups.push(currentGroup);
                return groups;
            }

            function extractGlossary(text) {
                var lines = _.string.lines(text);
                return _(lines).chain()
                                .filter(function (line) { return _.str.include(line, "=") })
                                .map(function (line) {
                                    var a = line.split("=");
                                    var word = _.string.trim(a[0]);
                                    var def = _.string.trim(a[1]);
                                    return [word, def];
                                })
                                .value()
            }

            // join syncs into turns
            var groups = splitIntoGroups(lrgrid.syncs, function (s) { return s.annotation !== undefined; });
            var groupedSyncs = _(groups).map(function (group) {
                return {
                    "annotation": group[0].annotation,
                    "syncs": _(group).map(function (sync) {
                        return {
                            "millis": sync.millis,
                            "text": sync.text
                        };
                    })
                };
            });

            // remove the Glossary section
            var last = _.last(groupedSyncs);
            var glossaryArray = [];
            if (last.annotation === "Glossary") {
                groupedSyncs = _.initial(groupedSyncs);
                glossaryArray = extractGlossary(last.syncs[0].text);
            }
            return {
                "turns": groupedSyncs,
                "glossaryArray": glossaryArray,
                "glossary": _.object(glossaryArray)
            };
        }


        function drawTranscript(node, groupedSyncs) {

            function getHtmlForSync(s) {
                if (_.string.startsWith(s.text, "<comment>")) {
                    var text = _.string.splice(s.text, 0, "<comment>".length);
                    return '<span class="comment">' + getHtmlForSync({ "millis": s.millis, "text": text }) + '</span>';
                }
                else {
                    return '<span id="segment-' + s.millis + '">' + s.text + '</span>';
                }
            }

            function getHtmlForTableRow(row) {
                var columns = row.text.split("|");
                return '<tr>' +
                            _(columns).chain().map(function (col) {
                                return '<td>' + getHtmlForSync({ "millis": row.millis, "text": col }) + '</td>';
                            }).join('').value() +
                        '</tr>';

            }

            function getHtmlForComplexTable(syncs) {
                var html = [];
                _(syncs).each(function (sync, index) {
                    if (index === 0) html.push('<tr><td>');
                    var text = sync.text;
                    if (_.string.startsWith(text, '<td>')) {
                        html.push('</td><td>');
                        text = _.string.splice(text, 0, '<td>'.length);
                    }
                    else if (_.string.startsWith(text, '<tr>')) {
                        html.push('</td></tr><tr><td>');
                        text = _.string.splice(text, 0, '<tr>'.length);
                        if (text.length == 0) html.push('&nbsp;');
                    }
                    html.push(getHtmlForSync({ "millis": sync.millis, "text": text }));
                });
                if (html.length > 0) html.push('</td></tr>');
                return _(html).join('');
            }

            function getHtmlForTurn(turn) {
                var type = turn.annotation;
                if (type === "<table>") {
                    return '<table class="table">' +
                                getHtmlForComplexTable(turn.syncs) +
                            '</table>'
                }
                else if (type === "table") {
                    return '<table class="table">' +
                                _(turn.syncs).chain().map(getHtmlForTableRow).join('').value() +
                            '</table>'
                }
                else {
                    return '<div class="' + (turn.annotation || "p") + '">' +
                                _(turn.syncs).chain().map(getHtmlForSync).join('').value() +
                           '</div>';
                }
            }

            // render transcript
            var html = _(groupedSyncs).map(getHtmlForTurn).join('\n');
            $(node).html(html);
        }

        function drawFlashcards(node, glossaryArray) {
            if (glossaryArray.length == 0) {
                return;
            }
            $("#flashcard-section").css('display', 'block');
            var cardsHtml = _(glossaryArray).map(function (pair) {
                return '<li class="flashcard">' +
                                            '<div class="front">' + pair[0] + '</div>' +
                                            '<div class="back">' + pair[1] + '</div>' +
                                        '</li>';
            });

            $(node).html('<ul>' + cardsHtml.join("") + '</ul>');

            // animate flips
            $(node).find('li div.back').hide().css('left', 0);

            function mySideChange(front) {
                var $parent = $(this).parent();
                if (front) {
                    $parent.find('div.front').show();
                    $parent.find('div.back').hide();
                } else {
                    $parent.find('div.front').hide();
                    $parent.find('div.back').show();
                }
            }

            $(node).find('li').hover(
                function () {
                    $(this).find('div').stop().rotate3Di('flip', 250, { direction: 'clockwise', sideChange: mySideChange });
                },
                function () {
                    $(this).find('div').stop().rotate3Di('unflip', 500, { sideChange: mySideChange });
                }
            );

        }

    </script>  
</head>
<body>
    <div class="ui-layout-north">
        <div id="btn-toolbar" style="float:left; padding-top:8px;">
            <a href="#" id="playButton" style="float:left;" class="btn" title="Play/Pause [Space]"><i class="icon-play"></i> / <i class="icon-pause"></i></a>
            <div style="float:left; padding-left:30px; padding-top:5px;" id="curTime"></div>
        </div>
    </div>
    <div class="alert" id="loadingAudioAlert" style="position:fixed;">
        <img alt="Loading audio..." src="lrhub/images/ajax-loader-indicator.gif" style="vertical-align:top;"/>
        <strong>Loading audio...</strong>
    </div>
    <div class="container ui-layout-center">
      <div style="padding-bottom:100px">
          <div id="transcript" class="transcript" style="font-size:<?php echo $fontsize ?>;"></div>
          <div style="margin: 15px 100px; float:left; display:none;" id="flashcard-section">
              <h2 id="flashcard-title">Flashcards</h2>
              <div id="flashcards" class="flashcards">Empty</div>
              <hr/>
          </div>
      </div>
<?php /*
      <h1>Links</h1>
      <a href="<?php echo $mp3 ?>">mp3</a> 
      <a href="<?php echo $trs ?>">trs</a> 
      <a href="http://reader.dinglabs.com/InteractiveTranscript.html#a:=<?php echo urlencode($mp3) ?>,t:=<?php echo urlencode($trs) ?>,n:=Untitled,s:=false,f:=23,ff:=SimSun,l:=100%25,e:=true">dinglabs reader</a>
*/ ?>
      
    </div>
</body>
</html>