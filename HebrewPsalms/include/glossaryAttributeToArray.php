<?php
function expandGlossaryFragment($baseurl, $fragment) {
	$trimmed = trim($fragment);
	$filename = (strlen($trimmed) == 0) ? 'glossary.txt' : 'glossary_'.$trimmed.'.txt';
    return '"'.$baseurl.'/'.$filename.'"';
}

function glossaryAttributeToArray($baseurl, $attrValue) {
	$values = explode(',', $attrValue);
    foreach ($values as $fragment) {
        $urlStrings[] = expandGlossaryFragment($baseurl, $fragment);
    }
    return "[".implode(", ", $urlStrings)."]";
}
?>