<?php
/**
 * @package Interactive_Transcript
 * @version 0.2.1
 */
/*
Plugin Name: Interactive Transcript
Plugin URI: http://lrhub.com
Description: A plugin for playing interactive transcripts.
Author: Jim Slattery
Version: 0.2.1
Author URI: http://blog.dinglabs.com
*/

// handle [interactive_transcript_link] shortcode
function interactive_transcript_link($atts, $content) {
   extract( shortcode_atts( array(
      'trs' => 'sample.trs',
      'mp3' => 'sample.mp3',
      'fontsize' => '20px',
      'color' => '',
      'bg_color' => '',
      'bg_url' => '',
      'glossaries' => '',
      ), $atts ) );
   $plugin_base_url = plugin_dir_url(__FILE__);
   $link = $plugin_base_url . "player.php?mp3=".urlencode($mp3).
                                        "&trs=".urlencode($trs).
                                        "&fontsize=".urlencode($fontsize).
                                        "&color=".urlencode($color).
                                        "&bg_color=".urlencode($bg_color).
                                        "&bg_url=".urlencode($bg_url).
                                        "&glossaries=".urlencode($glossaries);
   $content = is_null($content) ? '<img src="http://photo.learningvietnamese.net/1J9rtO5x/Learning-Vietnamese-Click-Read-Along.jpg" alt="Click and Read Along" />' : $content;

   return '<a href="'.$link.'">'.$content.'</a>';
}

include "include/glossaryAttributeToArray.php";

// handle [popup_dictionary] shortcode
function popup_dictionary($atts, $content) {
   extract( shortcode_atts( array(
      'glossaries' => '',
      ), $atts ) );
    $id = 'popuparea-'.rand();
    $plugin_base_url = plugin_dir_url(__FILE__);
    return '<div id="'.$id.'">'.$content.'</div>'."\n".
           '<script>PopupDict.loadGlossariesAndAddPopupDefs(jQuery, '.glossaryAttributeToArray($plugin_base_url, $glossaries).', jQuery("#'.$id.'")[0]);'."\n".
           '</script>';
}

function register_shortcodes() {
    add_shortcode('interactive_transcript_link', 'interactive_transcript_link');
    add_shortcode('popup_dictionary', 'popup_dictionary');
}
add_action('init', 'register_shortcodes');


// add JavaScript if our popup dictionary shortcode is used
// taken from here: http://beerpla.net/2010/01/13/wordpress-plugin-development-how-to-include-css-and-javascript-conditionally-and-only-when-needed-by-the-posts/
add_filter('the_posts', 'conditionally_add_scripts_and_styles'); // the_posts gets triggered before wp_head
function conditionally_add_scripts_and_styles($posts){
	if (empty($posts)) return $posts;
	$shortcode_found = false; // use this flag to see if styles and scripts need to be enqueued
	foreach ($posts as $post) {
		if (stripos($post->post_content, '[popup_dictionary') !== false) {
			$shortcode_found = true; // bingo!
			break;
		}
	}
	if ($shortcode_found) {
        $plugin_base_url = plugin_dir_url(__FILE__);
		// enqueue here
		wp_enqueue_style('popupdict-bootstrap-css', $plugin_base_url.'popupdict/bootstrap/bootstrap.css');
		wp_enqueue_style('popupdict-css', $plugin_base_url.'popupdict/popupdict.css');

        wp_deregister_script('jquery');
        wp_register_script('jquery', $plugin_base_url.'lrhub/javascripts/lib/jquery-1.8.3.min.js');
        wp_enqueue_script('jquery');

        wp_enqueue_script('underscore',        $plugin_base_url.'lrhub/javascripts/lib/underscore-1.4.2.min.js');
        wp_enqueue_script('underscore-string', $plugin_base_url.'lrhub/javascripts/lib/underscore.string-2.3.0.min.js', array('underscore'));
        wp_enqueue_script('xregexp',         $plugin_base_url.'lrhub/javascripts/lib/xregexp/xregexp-min-2.0.0.js');
        wp_enqueue_script('xregexp-unicode', $plugin_base_url.'lrhub/javascripts/lib/xregexp/unicode-base.js');
		wp_enqueue_script('popupdict-bootstrap-js', $plugin_base_url.'popupdict/bootstrap/bootstrap.js');
		wp_enqueue_script('popupdict-js',      $plugin_base_url.'popupdict/popupdict.js');
        //wp_enqueue_script('less-css', $plugin_base_url.'lrhub/javascripts/lib/less-1.3.0.min.js');
	}
	return $posts;
}

?>
