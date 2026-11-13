<?php
// Test helper for t16 (not part of the plugin). ?m=reset|set|age|cron|running|get|mkuser|digest
$m = $_GET['m'] ?? '';
global $wpdb;
if ($m === 'reset') {
	// Stop any running test, then delete every suggested, queued and dismissed test.
	$r = Spark_Living_Store::get_running();
	if ($r) { Spark_Living_Store::update($r['id'], ['status' => 'concluded']); }
	$ids = get_posts(['post_type' => 'living_experiment', 'post_status' => 'publish', 'numberposts' => 500, 'fields' => 'ids',
		'meta_query' => [['key' => '_spark_living_status', 'value' => ['suggested', 'queued', 'dismissed'], 'compare' => 'IN']]]);
	foreach ($ids as $id) { wp_delete_post($id, true); }
	foreach (Spark_Living_Store::get_promoted() as $e) { Spark_Living_Store::update($e['id'], ['promoted' => false]); }
	echo 'deleted ' . count($ids);
} elseif ($m === 'set') {
	Spark_Living_Store::update((int) $_GET['id'], [$_GET['k'] => is_numeric($_GET['v']) ? (int) $_GET['v'] : $_GET['v']]);
	echo 'ok';
} elseif ($m === 'age') {
	// Make the stored traffic count N days old.
	Spark_Living_Store::update((int) $_GET['id'], ['sessions_as_of' => gmdate('Y-m-d', time() - (int) $_GET['days'] * 86400)]);
	echo 'ok';
} elseif ($m === 'cron') {
	Spark_Living_Cron::run();
	$r = Spark_Living_Store::get_running();
	echo $r ? (int) $r['id'] : 0;
} elseif ($m === 'running') {
	$r = Spark_Living_Store::get_running();
	echo $r ? (int) $r['id'] : 0;
} elseif ($m === 'get') {
	echo wp_json_encode(Spark_Living_Store::get((int) $_GET['id']));
} elseif ($m === 'digest') {
	// A fingerprint of everything a running test is made of (fields plus event rows).
	$e = Spark_Living_Store::get((int) $_GET['id']);
	$rows = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->prefix}spark_living_events WHERE experiment_id = %d ORDER BY id", (int) $_GET['id']), ARRAY_A);
	echo md5(wp_json_encode($e)) . ':' . md5(wp_json_encode($rows)) . ':' . count($rows);
} elseif ($m === 'mkuser') {
	$login = sanitize_user($_GET['u']);
	$u = get_user_by('login', $login);
	if (!$u) { $uid = wp_create_user($login, 'password', $login . '@example.test'); $u = get_user_by('id', $uid); }
	$u->set_role(sanitize_key($_GET['role']));
	wp_set_password('password', $u->ID);
	echo 'user ' . $u->ID . ' ' . implode(',', $u->roles);
} elseif ($m === 'conclude') {
	$e = Spark_Living_Store::get((int) $_GET['id']);
	$r = Spark_Living_Engine::conclude((int) $_GET['id'], 'no_difference', Spark_Living_Engine::snapshot($e), 'rest', 'test');
	echo is_wp_error($r) ? $r->get_error_message() : 'concluded';
}
