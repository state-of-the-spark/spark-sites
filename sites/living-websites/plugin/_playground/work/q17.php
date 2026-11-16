<?php
// Test helper for t17 to t21 (0.3.0; not part of the plugin).
// ?m=upgrade | fresh | ledger_count | ledger_rows | charter_reset | set_gate | set_tier | settings | seed_counts | cron | digest | table
$m = $_GET['m'] ?? '';
global $wpdb;
$L = $wpdb->prefix . 'spark_living_changes';
$E = $wpdb->prefix . 'spark_living_events';
if ($m === 'upgrade') {
	// Run the upgrade routine again (what a second request after a file copy would do).
	echo wp_json_encode(Spark_Living_Upgrade::run());
} elseif ($m === 'fresh') {
	// Simulate a 0.2.0 site: no ledger table, no 0.3.0 options. The next upgrade() call must rebuild it and backfill.
	$wpdb->query("DROP TABLE IF EXISTS $L");
	delete_option('spark_living_ledger_backfilled');
	delete_option('spark_living_version');
	delete_option('spark_living_upgrade_lock');
	update_option('spark_living_db_version', '1', false);
	if (!empty($_GET['install'])) { delete_option('spark_living_rewrite_version'); } else { update_option('spark_living_rewrite_version', '0.2.0', false); }
	echo wp_json_encode(Spark_Living_Upgrade::run());
} elseif ($m === 'ledger_count') {
	echo (int) $wpdb->get_var("SELECT COUNT(*) FROM $L" . (isset($_GET['kind']) ? $wpdb->prepare(' WHERE kind = %s', $_GET['kind']) : ''));
} elseif ($m === 'ledger_rows') {
	echo wp_json_encode($wpdb->get_results("SELECT * FROM $L ORDER BY id", ARRAY_A));
} elseif ($m === 'ledger_wipe') {
	$wpdb->query("DELETE FROM $L");
	echo 'wiped';
} elseif ($m === 'table') {
	echo Spark_Living_Ledger::table_exists() ? 'yes' : 'no';
} elseif ($m === 'charter_reset') {
	delete_option('spark_living_charter');
	echo 'reset';
} elseif ($m === 'set_gate') {
	Spark_Living_Store::update((int) $_GET['id'], ['gate_verdict' => $_GET['v'], 'gate_reasons' => 'seed', 'gate_by' => 'agent:judge', 'gate_at' => Spark_Living_Util::mysql_utc(), 'gate_charter_version' => (int) $_GET['cv']]);
	echo 'ok';
} elseif ($m === 'set_tier') {
	Spark_Living_Store::update((int) $_GET['id'], ['tier' => (int) $_GET['t']]);
	echo 'ok';
} elseif ($m === 'settings') {
	update_option('spark_living_settings', ['min_exposures_before_shift' => (int) $_GET['v']], false);
	echo 'ok';
} elseif ($m === 'seed_counts') {
	// Seed exposure rows for the running test: ?id=&a=&b= (sessions per arm; some intent on B so the weights want to move).
	$id = (int) $_GET['id'];
	$wpdb->query($wpdb->prepare("DELETE FROM $E WHERE experiment_id = %d", $id));
	$start = time() - 3 * 86400;
	Spark_Living_Store::update($id, ['start_date' => gmdate('Y-m-d H:i:s', $start - 60)]);
	foreach (['A' => (int) $_GET['na'], 'B' => (int) $_GET['nb']] as $v => $n) {
		for ($i = 0; $i < $n; $i++) {
			$sid = substr(md5("c17$v$i$id"), 0, 16); $vid = substr(md5("v17$v$i$id"), 0, 16); $t = gmdate('Y-m-d H:i:s', $start + $i * 60);
			$wpdb->insert($E, ['experiment_id' => $id, 'variant' => $v, 'visitor_id' => $vid, 'session_id' => $sid, 'event_type' => 'exposure', 'created_at' => $t]);
			if ($v === 'B' && $i < (int) ($n * 0.5)) { $wpdb->insert($E, ['experiment_id' => $id, 'variant' => $v, 'visitor_id' => $vid, 'session_id' => $sid, 'event_type' => 'cta_click', 'created_at' => $t]); }
			if ($v === 'A' && $i < (int) ($n * 0.1)) { $wpdb->insert($E, ['experiment_id' => $id, 'variant' => $v, 'visitor_id' => $vid, 'session_id' => $sid, 'event_type' => 'cta_click', 'created_at' => $t]); }
		}
	}
	echo 'seeded';
} elseif ($m === 'set_weights') {
	Spark_Living_Store::update((int) $_GET['id'], ['weights' => ['A' => (float) $_GET['wa'], 'B' => (float) $_GET['wb']]]);
	echo 'ok';
} elseif ($m === 'cron') {
	Spark_Living_Cron::run();
	$r = Spark_Living_Store::get_running();
	echo wp_json_encode($r ? $r['weights'] : null);
} elseif ($m === 'digest') {
	$e = Spark_Living_Store::get((int) $_GET['id']);
	$rows = $wpdb->get_results($wpdb->prepare("SELECT id, experiment_id, variant, visitor_id, session_id, event_type, created_at FROM $E WHERE experiment_id = %d ORDER BY id", (int) $_GET['id']), ARRAY_A);
	echo md5(wp_json_encode($rows)) . ':' . count($rows) . ':' . $e['status'] . ':' . $e['start_date'] . ':' . wp_json_encode($e['weights']);
} elseif ($m === 'ev_count') {
	echo (int) $wpdb->get_var("SELECT COUNT(*) FROM $E");
} elseif ($m === 'mkuser') {
	$login = sanitize_user($_GET['u']);
	$u = get_user_by('login', $login);
	if (!$u) { $uid = wp_create_user($login, 'password', $login . '@example.test'); $u = get_user_by('id', $uid); }
	$u->set_role(sanitize_key($_GET['role']));
	echo 'user ' . $u->ID;
} elseif ($m === 'reset_all') {
	// Clean slate for a test: stop and delete suggestions/queue/dismissed, un-promote, clear charter, empty events and ledger.
	$r = Spark_Living_Store::get_running();
	if ($r) { Spark_Living_Store::update($r['id'], ['status' => 'concluded']); }
	$ids = get_posts(['post_type' => 'living_experiment', 'post_status' => 'publish', 'numberposts' => 500, 'fields' => 'ids',
		'meta_query' => [['key' => '_spark_living_status', 'value' => ['suggested', 'queued', 'dismissed', 'draft', 'awaiting_approval'], 'compare' => 'IN']]]);
	foreach ($ids as $id) { wp_delete_post($id, true); }
	foreach (Spark_Living_Store::get_promoted() as $e) { Spark_Living_Store::update($e['id'], ['promoted' => false]); }
	$wpdb->query("DELETE FROM $E");
	$wpdb->query("DELETE FROM $L");
	delete_option('spark_living_charter');
	delete_option('spark_living_settings');
	echo 'reset_all';
}
// (second block: extra modes)
$m = $_GET['m'] ?? '';
global $wpdb;
$E = $wpdb->prefix . 'spark_living_events';
if ($m === 'set') {
	Spark_Living_Store::update((int) $_GET['id'], [$_GET['k'] => is_numeric($_GET['v']) ? (int) $_GET['v'] : $_GET['v']]);
	echo 'ok';
} elseif ($m === 'purge_experiments') {
	$ids = get_posts(['post_type' => ['living_experiment', 'living_evolution'], 'post_status' => 'any', 'numberposts' => 1000, 'fields' => 'ids']);
	foreach ($ids as $id) { wp_delete_post($id, true); }
	echo 'purged ' . count($ids);
} elseif ($m === 'revert_scenario') {
	// A shipped winner, 8 days old, with leads before the ship and none after: the nightly check must revert it.
	$id = Spark_Living_Store::create(['name' => 'Revert scenario', 'element_type' => 'selector', 'target' => '.t17-rev', 'tier' => 1, 'variants' => ['A' => ['label' => 'A'], 'B' => ['label' => 'B', 'changes' => [['op' => 'text', 'value' => 'x']]]]]);
	$shipped = time() - 8 * 86400;
	Spark_Living_Store::update($id, ['status' => 'concluded', 'promoted' => true, 'winner' => 'B', 'verdict' => 'ship_b', 'shipped_at' => gmdate('Y-m-d H:i:s', $shipped), 'revert_checked' => false, 'start_date' => gmdate('Y-m-d H:i:s', $shipped - 9 * 86400), 'end_date' => gmdate('Y-m-d H:i:s', $shipped)]);
	for ($i = 0; $i < 28; $i++) {
		$t = gmdate('Y-m-d H:i:s', $shipped - 13 * 86400 + (int) ($i * 12.5 * 3600));
		$wpdb->insert($E, ['experiment_id' => 0, 'variant' => 'L', 'visitor_id' => substr(md5("rv$i"), 0, 16), 'session_id' => substr(md5("rs$i"), 0, 16), 'event_type' => 'form_submit', 'created_at' => $t]);
	}
	$did = Spark_Living_Engine::check_reverts();
	echo $did ? 'reverted' : 'not reverted';
}
if (($_GET['m'] ?? '') === 'lint') {
	$dir = WP_PLUGIN_DIR . '/spark-living';
	$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
	$bad = 0;
	foreach ($it as $f) {
		if (substr($f->getFilename(), -4) !== '.php' || strpos($f->getPathname(), '/tests/') !== false) { continue; }
		try { token_get_all(file_get_contents($f->getPathname()), TOKEN_PARSE); }
		catch (Throwable $e) { $bad++; echo $f->getPathname() . ': ' . $e->getMessage() . ' line ' . $e->getLine() . "\n"; }
	}
	echo $bad ? "LINT FAIL\n" : "lint ok\n";
}
