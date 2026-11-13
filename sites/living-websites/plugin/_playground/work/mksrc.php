<?php
// Test helper for t15 (not part of the plugin). ?m=install|remove|ga|icon|extra|seed|rawlabel
global $wpdb;
$mu_dir  = WP_CONTENT_DIR . '/mu-plugins';
$mu_file = $mu_dir . '/sl-test-sources.php';
$m = $_GET['m'] ?? '';
if ($m === 'install' && is_file($mu_file)) { echo 'already installed'; } elseif ($m === 'install') {
	if (!is_dir($mu_dir)) { @mkdir($mu_dir, 0777, true); }
	file_put_contents($mu_file, '<?php
add_filter("spark_living_ga_connected", function ($v) { return get_option("sl_test_ga") === "1" ? true : $v; });
add_filter("spark_living_data_sources", function ($s) {
	if (get_option("sl_test_extra") === "1") {
		$s[] = array("id" => "crm-sheet", "name" => "Lead sheet <script>alert(1)</script> & co", "icon" => array("type" => "svg", "value" => "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"#0ECAEB\"/><script>alert(2)</script></svg>"), "what" => "Leads typed in by hand", "status" => "banana", "detail" => "Checked <b>today</b>");
	}
	return $s;
});');
	echo 'installed';
} elseif ($m === 'remove') {
	// The mu-plugin stays (inert once its options are gone); deleting it empties mu-plugins and Playground then fails to rewrite it.
	delete_option('sl_test_ga'); delete_option('sl_test_extra');
	echo 'removed';
} elseif ($m === 'ga') {
	update_option('sl_test_ga', $_GET['v'] === '1' ? '1' : '0'); echo 'ga=' . get_option('sl_test_ga');
} elseif ($m === 'extra') {
	update_option('sl_test_extra', $_GET['v'] === '1' ? '1' : '0'); echo 'extra=' . get_option('sl_test_extra');
} elseif ($m === 'icon') {
	if ($_GET['v'] === '1') {
		$up = wp_upload_dir();
		wp_mkdir_p($up['path']);
		$png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAJ0lEQVQYV2NkYGD4z0AEYBxVSF2FDAwM/xkZGf4zEKOQgYGB4T8ABXwDBnBqHqQAAAAASUVORK5CYII=');
		file_put_contents($up['path'] . '/sl-test-icon.png', $png);
		$att = wp_insert_attachment(array('post_title' => 'sl-test-icon', 'post_mime_type' => 'image/png', 'post_status' => 'inherit'), $up['path'] . '/sl-test-icon.png');
		update_option('site_icon', $att);
		echo 'icon ' . get_site_icon_url(40);
	} else { delete_option('site_icon'); echo 'icon removed'; }
} elseif ($m === 'seed') {
	// ?exp=ID&age=SECONDS&type=exposure&variant=A&n=1
	$t = $wpdb->prefix . 'spark_living_events';
	$n = max(1, (int) ($_GET['n'] ?? 1));
	for ($i = 0; $i < $n; $i++) {
		$wpdb->insert($t, array('experiment_id' => (int) $_GET['exp'], 'variant' => $_GET['variant'] ?? 'A', 'visitor_id' => bin2hex(random_bytes(8)), 'session_id' => bin2hex(random_bytes(8)), 'event_type' => $_GET['type'] ?? 'exposure', 'created_at' => gmdate('Y-m-d H:i:s', time() - (int) ($_GET['age'] ?? 0))));
	}
	echo 'seeded ' . $n;
} elseif ($m === 'rawlabel') {
	update_post_meta((int) $_GET['exp'], '_spark_living_a_label', wp_slash('<img src=x onerror=alert(1)>Raw "quoted" & <b>bold</b>'));
	echo 'raw';
}
