<?php
// Test helper for t22 to t25 (0.4.0; not part of the plugin).
// ?m=... see each branch.
$m = $_GET['m'] ?? '';
global $wpdb;
$E = $wpdb->prefix . 'spark_living_events';
$L = $wpdb->prefix . 'spark_living_changes';
$R = $wpdb->prefix . 'spark_living_results';
$out = static function ( $v ) { echo is_string( $v ) ? $v : wp_json_encode( $v ); };

if ( 'start_direct' === $m ) {
	// Create a selector test and start it through the store (no REST). ?sel=&sessions=&name=&scope=&page=&device=&ago= (start N days ago)
	$id = Spark_Living_Store::create( array(
		'name' => $_GET['name'] ?? 'Q22 test', 'element_type' => 'selector', 'target' => wp_unslash( $_GET['sel'] ?? '.q22-btn' ), 'tier' => 1,
		'scope' => $_GET['scope'] ?? 'page', 'device' => $_GET['device'] ?? 'all',
		'variants' => array( 'A' => array( 'label' => 'Current' ), 'B' => array( 'label' => 'Challenger', 'changes' => array( array( 'op' => 'text', 'value' => 'Challenger words' ) ) ) ),
	) );
	if ( isset( $_GET['page'] ) ) { Spark_Living_Store::update( $id, array( 'page' => $_GET['page'] ) ); }
	$r = Spark_Living_Store::start( $id, array( 'start_sessions_14d' => (int) ( $_GET['sessions'] ?? 137 ), 'by' => 'owner' ) );
	if ( is_wp_error( $r ) ) { $out( 'ERR ' . $r->get_error_code() ); return; }
	if ( isset( $_GET['ago'] ) ) { Spark_Living_Store::update( $id, array( 'start_date' => gmdate( 'Y-m-d H:i:s', time() - (float) $_GET['ago'] * 86400 ) ) ); }
	$out( (string) $id );
} elseif ( 'set_start' === $m ) {
	Spark_Living_Store::update( (int) $_GET['id'], array( 'start_date' => gmdate( 'Y-m-d H:i:s', time() - (float) $_GET['ago'] * 86400 ) ) );
	$out( 'ok' );
} elseif ( 'seed_obs' === $m ) {
	// Exposed sessions per arm for a running test: ?id=&na=&nb=
	$id = (int) $_GET['id'];
	$exp = Spark_Living_Store::get( $id );
	$start = Spark_Living_Util::to_ts( $exp['start_date'] );
	$wpdb->query( $wpdb->prepare( "DELETE FROM $E WHERE experiment_id = %d", $id ) );
	foreach ( array( 'A' => (int) $_GET['na'], 'B' => (int) $_GET['nb'] ) as $v => $n ) {
		for ( $i = 0; $i < $n; $i++ ) {
			$wpdb->insert( $E, array( 'experiment_id' => $id, 'variant' => $v, 'visitor_id' => substr( md5( "q22v$v$i$id" ), 0, 16 ), 'session_id' => substr( md5( "q22s$v$i$id" ), 0, 16 ), 'event_type' => 'exposure', 'created_at' => gmdate( 'Y-m-d H:i:s', $start + 60 + $i * 30 ) ) );
		}
	}
	$out( 'seeded' );
} elseif ( 'legacy_running' === $m ) {
	// Pretend the test was started before 0.4.0: no stop date stored.
	Spark_Living_Store::update( (int) $_GET['id'], array( 'max_days' => 0, 'stop_basis' => '', 'stop_updated_at' => '' ) );
	$out( 'ok' );
} elseif ( 'meta' === $m ) {
	$e = Spark_Living_Store::get( (int) $_GET['id'] );
	$rows = $wpdb->get_results( $wpdb->prepare( "SELECT id, experiment_id, variant, visitor_id, session_id, event_type, created_at FROM $E WHERE experiment_id = %d ORDER BY id", (int) $_GET['id'] ), ARRAY_A );
	$out( array(
		'status' => $e['status'], 'max_days' => $e['max_days'], 'stop_basis' => $e['stop_basis'], 'start_date' => $e['start_date'], 'weights' => $e['weights'],
		'variants_md5' => md5( wp_json_encode( $e['variants'] ) ), 'events_md5' => md5( wp_json_encode( $rows ) ), 'events' => count( $rows ),
		'verdict' => $e['verdict'], 'scope' => $e['scope'], 'tier' => $e['tier'], 'promoted' => $e['promoted'], 'target' => $e['target'], 'payoff_score' => $e['payoff_score'],
	) );
} elseif ( 'cron' === $m ) {
	Spark_Living_Cron::run();
	$out( 'ran' );
} elseif ( 'upgrade_again' === $m ) {
	delete_option( 'spark_living_version' );
	delete_option( 'spark_living_upgrade_lock' );
	$out( Spark_Living_Upgrade::run() );
} elseif ( 'ledger' === $m ) {
	$sql = "SELECT id, kind, subject_id, summary, proposed_by, status, gate_verdict, evidence_json, before_json, after_json FROM $L" . ( isset( $_GET['kind'] ) ? $wpdb->prepare( ' WHERE kind = %s', $_GET['kind'] ) : '' ) . ' ORDER BY id';
	$out( $wpdb->get_results( $sql, ARRAY_A ) );
} elseif ( 'results' === $m ) {
	$out( $wpdb->get_results( "SELECT * FROM $R ORDER BY id", ARRAY_A ) );
} elseif ( 'results_wipe' === $m ) {
	$wpdb->query( "DELETE FROM $R" );
	delete_option( 'spark_living_results_backfilled' );
	$out( 'wiped' );
} elseif ( 'results_table' === $m ) {
	$out( Spark_Living_Results::table_exists() ? 'yes' : 'no' );
} elseif ( 'drop_results' === $m ) {
	$wpdb->query( "DROP TABLE IF EXISTS $R" );
	delete_option( 'spark_living_results_backfilled' );
	delete_option( 'spark_living_db_version' );
	$out( 'dropped' );
} elseif ( 'mk_concluded' === $m ) {
	// A concluded test with a stored snapshot (or none: voided). ?verdict=&na=&nb=&ia=&ib=&days=&sel=
	$id = Spark_Living_Store::create( array( 'name' => $_GET['name'] ?? 'Concluded ' . ( $_GET['verdict'] ?? 'none' ), 'element_type' => 'selector', 'target' => $_GET['sel'] ?? '.q22-old', 'tier' => 1, 'change_type' => 'wording', 'a_label' => 'Get started', 'b_label' => 'Get a plan',
		'variants' => array( 'A' => array( 'label' => 'A' ), 'B' => array( 'label' => 'B', 'changes' => array( array( 'op' => 'text', 'value' => 'Get a plan' ) ) ) ) ) );
	$days = (float) ( $_GET['days'] ?? 14 );
	$end = time() - 86400;
	$f = array( 'status' => 'concluded', 'start_date' => gmdate( 'Y-m-d H:i:s', $end - $days * 86400 ), 'end_date' => gmdate( 'Y-m-d H:i:s', $end ), 'verdict' => $_GET['verdict'] ?? '', 'page' => '/', 'start_sessions_14d' => 300 );
	if ( isset( $_GET['na'] ) ) {
		$na = (int) $_GET['na']; $nb = (int) $_GET['nb'];
		$f['snapshot'] = array( 'counts' => array( 'A' => array( 'sessions' => $na, 'intent' => (int) $_GET['ia'], 'leads' => 0 ), 'B' => array( 'sessions' => $nb, 'intent' => (int) $_GET['ib'], 'leads' => 0 ), 'H' => array( 'sessions' => 5, 'intent' => 0, 'leads' => 0 ) ), 'days_running' => $days, 'decision' => array( 'p_b_beats_a' => 0.93 ) );
	}
	if ( ( $_GET['verdict'] ?? '' ) === 'ship_b' ) { $f['winner'] = 'B'; }
	Spark_Living_Store::update( $id, $f );
	$out( (string) $id );
} elseif ( 'mk_pages' === $m ) {
	$ids = array();
	foreach ( array( 'one', 'two' ) as $slug ) {
		$existing = get_page_by_path( 'q22-' . $slug );
		if ( $existing ) { $ids[ $slug ] = $existing->ID; wp_update_post( array( 'ID' => $existing->ID, 'post_content' => '<p><a class="q22-btn" href="#go-' . $slug . '">Book a free call</a></p><p><a class="q22-other" href="#x">Other link</a></p>' ) ); continue; }
		$ids[ $slug ] = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Q22 ' . $slug, 'post_name' => 'q22-' . $slug, 'post_content' => '<p><a class="q22-btn" href="#go-' . $slug . '">Book a free call</a></p><p><a class="q22-other" href="#x">Other link</a></p>' ) );
	}
	$out( $ids );
} elseif ( 'mk_role_user' === $m ) {
	// ?u=slgate&caps=spark_living_gate  (a user whose role holds only "read" plus the listed capabilities)
	$caps = array( 'read' => true );
	foreach ( array_filter( explode( ',', $_GET['caps'] ?? '' ) ) as $c ) { $caps[ $c ] = true; }
	$role = 'q22role_' . sanitize_key( $_GET['u'] );
	remove_role( $role );
	add_role( $role, $role, $caps );
	$u = get_user_by( 'login', $_GET['u'] );
	if ( ! $u ) { $uid = wp_create_user( $_GET['u'], 'password', $_GET['u'] . '@example.test' ); $u = get_user_by( 'id', $uid ); }
	$u->set_role( $role );
	$out( 'user ' . $u->ID );
} elseif ( 'mk_token' === $m ) {
	$now = isset( $_GET['offset'] ) ? time() + (int) $_GET['offset'] : null;
	$t = Spark_Living_Preview::make_token( (int) $_GET['id'], $now );
	$out( $t['token'] );
} elseif ( 'verify_token' === $m ) {
	$out( Spark_Living_Preview::verify( (string) $_GET['t'], (int) $_GET['id'] ) ? 'valid' : 'invalid' );
} elseif ( 'charter_state' === $m ) {
	$c = Spark_Living_Charter::get();
	$out( array( 'version' => $c['version'], 'status' => $c['status'], 'approved_by' => $c['approved_by'], 'approved_at' => $c['approved_at'], 'autonomy' => $c['autonomy_level'] ) );
} elseif ( 'set_gate' === $m ) {
	Spark_Living_Store::update( (int) $_GET['id'], array( 'gate_verdict' => $_GET['v'], 'gate_reasons' => 'seed', 'gate_by' => 'agent:judge', 'gate_at' => Spark_Living_Util::mysql_utc(), 'gate_charter_version' => (int) $_GET['cv'] ) );
	$out( 'ok' );
} elseif ( 'autopick_plan' === $m ) {
	$out( Spark_Living_Queue::auto_pick_plan() );
} elseif ( 'running' === $m ) {
	$r = Spark_Living_Store::get_running();
	$out( $r ? array( 'id' => $r['id'], 'name' => $r['name'], 'max_days' => $r['max_days'] ) : null );
} elseif ( 'ev_count' === $m ) {
	$out( (string) (int) $wpdb->get_var( "SELECT COUNT(*) FROM $E" ) );
} elseif ( 'set_meta' === $m ) {
	Spark_Living_Store::update( (int) $_GET['id'], array( $_GET['k'] => $_GET['v'] ) );
	$out( 'ok' );
} elseif ( 'promote' === $m ) {
	Spark_Living_Store::update( (int) $_GET['id'], array( 'status' => 'concluded', 'promoted' => true, 'winner' => 'B', 'verdict' => 'ship_b', 'shipped_at' => Spark_Living_Util::mysql_utc() ) );
	$out( 'ok' );
}
