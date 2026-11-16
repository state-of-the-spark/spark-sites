<?php
// More test helpers for t21 and the screenshot script (not part of the plugin). ?m=mk_shortcode_page
$m = $_GET['m'] ?? '';
if ($m === 'mk_shortcode_page') {
	$e = get_page_by_path('living-shortcode-test');
	if (!$e) {
		$id = wp_insert_post(['post_title' => 'Living shortcode test', 'post_name' => 'living-shortcode-test', 'post_status' => 'publish', 'post_type' => 'page', 'post_content' => '[spark_living_dashboard]']);
	} else {
		$id = $e->ID;
	}
	echo $id;
}
