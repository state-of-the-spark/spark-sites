<?php
/**
 * Spark Living: the results record (0.4.0).
 *
 * One row per concluded test, in the table `{prefix}spark_living_results`, written
 * when a test concludes (and back-filled once, on upgrade, from the tests that
 * had already concluded). Read through GET /results (administrators only). The
 * rows stay on this site: nothing here is sent anywhere. The shape follows
 * agents/results-library.md as far as this plugin can truthfully know the fields.
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Spark_Living_Results {

	public const OPT_BACKFILL = 'spark_living_results_backfilled';

	public const OUTCOMES = array( 'challenger won', 'original won', 'no difference', 'voided' );

	/**
	 * Table name.
	 *
	 * @return string
	 */
	public static function table(): string {
		global $wpdb;
		return $wpdb->prefix . 'spark_living_results';
	}

	/**
	 * Create or upgrade the table with dbDelta. Safe to run any number of times.
	 */
	public static function create_table(): void {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$table   = self::table();
		$charset = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE {$table} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  test_id bigint(20) unsigned NOT NULL DEFAULT 0,
  created_at datetime NOT NULL,
  started_at datetime NULL,
  ended_at datetime NULL,
  days_run double NOT NULL DEFAULT 0,
  max_days smallint(5) unsigned NOT NULL DEFAULT 0,
  test_name varchar(200) NOT NULL DEFAULT '',
  page_type varchar(24) NOT NULL DEFAULT '',
  scope varchar(12) NOT NULL DEFAULT 'page',
  device_scope varchar(10) NOT NULL DEFAULT 'all',
  element_type varchar(10) NOT NULL DEFAULT '',
  element_selector varchar(200) NOT NULL DEFAULT '',
  change_type varchar(16) NOT NULL DEFAULT '',
  a_label varchar(200) NOT NULL DEFAULT '',
  b_label varchar(200) NOT NULL DEFAULT '',
  outcome varchar(20) NOT NULL DEFAULT '',
  verdict varchar(16) NOT NULL DEFAULT '',
  shipped tinyint(1) NOT NULL DEFAULT 0,
  tier tinyint(1) NOT NULL DEFAULT 1,
  sessions_a int(10) unsigned NOT NULL DEFAULT 0,
  sessions_b int(10) unsigned NOT NULL DEFAULT 0,
  intent_a int(10) unsigned NOT NULL DEFAULT 0,
  intent_b int(10) unsigned NOT NULL DEFAULT 0,
  leads_a int(10) unsigned NOT NULL DEFAULT 0,
  leads_b int(10) unsigned NOT NULL DEFAULT 0,
  intent_rate_a double NOT NULL DEFAULT 0,
  intent_rate_b double NOT NULL DEFAULT 0,
  lead_rate_a double NOT NULL DEFAULT 0,
  lead_rate_b double NOT NULL DEFAULT 0,
  lift_intent double NULL,
  lift_leads double NULL,
  probability double NULL,
  met_minimum tinyint(1) NOT NULL DEFAULT 0,
  forced_start tinyint(1) NOT NULL DEFAULT 0,
  payoff_score double NULL,
  summary varchar(300) NOT NULL DEFAULT '',
  PRIMARY KEY  (id),
  UNIQUE KEY test_idx (test_id),
  KEY ended_idx (ended_at)
) {$charset};";

		dbDelta( $sql );
	}

	/**
	 * Does the table exist?
	 *
	 * @return bool
	 */
	public static function table_exists(): bool {
		global $wpdb;
		$t = self::table();
		return (bool) $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $t ) ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	}

	/**
	 * What kind of page does a test cover? Only what the plugin can know: the
	 * front page, a product, the whole site, or anything else.
	 *
	 * @param array $exp Experiment.
	 * @return string home, product, sitewide, other or unknown.
	 */
	public static function page_type( array $exp ): string {
		if ( 'sitewide' === ( $exp['scope'] ?? 'page' ) ) {
			return 'sitewide';
		}
		$page = (string) ( $exp['page'] ?? '' );
		if ( '' === $page ) {
			return 'unknown';
		}
		if ( preg_match( '/^\d+$/', $page ) ) {
			$id = (int) $page;
			if ( (int) get_option( 'page_on_front' ) === $id && $id > 0 ) {
				return 'home';
			}
			return 'product' === get_post_type( $id ) ? 'product' : 'other';
		}
		$path = (string) wp_parse_url( $page, PHP_URL_PATH );
		$path = '' === $path ? '/' : $path;
		if ( '/' === $path ) {
			return 'home';
		}
		return 'other';
	}

	/**
	 * Plain words for a verdict, as a result outcome.
	 *
	 * @param array $exp Concluded experiment.
	 * @return string One of OUTCOMES.
	 */
	public static function outcome( array $exp ): string {
		switch ( (string) $exp['verdict'] ) {
			case Spark_Living_Stats::V_SHIP_B:
				return 'challenger won';
			case Spark_Living_Stats::V_KEEP_A:
			case Spark_Living_Stats::V_GUARD_BLOCKED:
				return 'original won';
			case Spark_Living_Stats::V_NO_DIFF:
				return 'no difference';
		}
		return 'voided';
	}

	/**
	 * Build the row for a concluded test from what is stored on it.
	 *
	 * @param array $exp Concluded experiment (from Spark_Living_Store::get()).
	 * @return array
	 */
	public static function build_row( array $exp ): array {
		$snap   = is_array( $exp['snapshot'] ) ? $exp['snapshot'] : array();
		$counts = is_array( $snap['counts'] ?? null ) ? $snap['counts'] : array();
		$g      = static function ( string $arm, string $k ) use ( $counts ): int {
			return (int) ( $counts[ $arm ][ $k ] ?? 0 );
		};
		$sa  = $g( 'A', 'sessions' );
		$sb  = $g( 'B', 'sessions' );
		$ia  = $g( 'A', 'intent' );
		$ib  = $g( 'B', 'intent' );
		$la  = $g( 'A', 'leads' );
		$lb  = $g( 'B', 'leads' );
		$ria = Spark_Living_Stats::rate( $ia, $sa );
		$rib = Spark_Living_Stats::rate( $ib, $sb );
		$rla = Spark_Living_Stats::rate( $la, $sa );
		$rlb = Spark_Living_Stats::rate( $lb, $sb );

		$start = Spark_Living_Util::to_ts( (string) $exp['start_date'] );
		$end   = Spark_Living_Util::to_ts( (string) $exp['end_date'] );
		$days  = ( $start && $end && $end >= $start ) ? ( $end - $start ) / DAY_IN_SECONDS : (float) ( $snap['days_running'] ?? 0 );

		$d       = Spark_Living_Store::describe( $exp );
		$outcome = self::outcome( $exp );
		$p       = $snap['decision']['p_b_beats_a'] ?? null;

		$summary = sprintf(
			/* translators: 1: challenger, 2: current, 3: outcome, 4: days, 5: sessions A, 6: sessions B */
			'Challenger "%1$s" against current "%2$s": %3$s after %4$s days (%5$d and %6$d sessions).',
			$d['challenger'],
			$d['current'],
			$outcome,
			number_format( $days, 1, '.', '' ),
			$sa,
			$sb
		);
		$cap = static function ( string $v, int $n ): string {
			return function_exists( 'mb_substr' ) ? mb_substr( $v, 0, $n ) : substr( $v, 0, $n );
		};

		return array(
			'test_id'          => (int) $exp['id'],
			'created_at'       => Spark_Living_Util::mysql_utc(),
			'started_at'       => '' !== (string) $exp['start_date'] ? (string) $exp['start_date'] : null,
			'ended_at'         => '' !== (string) $exp['end_date'] ? (string) $exp['end_date'] : null,
			'days_run'         => round( $days, 2 ),
			'max_days'         => Spark_Living_Engine::max_days_of( $exp ),
			'test_name'        => $cap( (string) $exp['name'], 200 ),
			'page_type'        => self::page_type( $exp ),
			'scope'            => (string) $exp['scope'],
			'device_scope'     => (string) $exp['device'],
			'element_type'     => (string) $exp['element_type'],
			'element_selector' => $cap( (string) $exp['target'], 200 ),
			'change_type'      => (string) $d['type'],
			'a_label'          => $cap( (string) $d['current'], 200 ),
			'b_label'          => $cap( (string) $d['challenger'], 200 ),
			'outcome'          => $outcome,
			'verdict'          => (string) $exp['verdict'],
			'shipped'          => ( Spark_Living_Stats::V_SHIP_B === (string) $exp['verdict'] ) ? 1 : 0,
			'tier'             => (int) $exp['tier'],
			'sessions_a'       => $sa,
			'sessions_b'       => $sb,
			'intent_a'         => $ia,
			'intent_b'         => $ib,
			'leads_a'          => $la,
			'leads_b'          => $lb,
			'intent_rate_a'    => $ria,
			'intent_rate_b'    => $rib,
			'lead_rate_a'      => $rla,
			'lead_rate_b'      => $rlb,
			'lift_intent'      => Spark_Living_Stats::relative_lift( $rib, $ria ),
			'lift_leads'       => Spark_Living_Stats::relative_lift( $rlb, $rla ),
			'probability'      => is_numeric( $p ) ? (float) $p : null,
			'met_minimum'      => ( min( $sa, $sb ) >= Spark_Living_Stats::MIN_SESSIONS && $days >= Spark_Living_Stats::MIN_DAYS ) ? 1 : 0,
			'forced_start'     => ! empty( $exp['forced_start'] ) ? 1 : 0,
			'payoff_score'     => isset( $exp['payoff_score'] ) && null !== $exp['payoff_score'] ? (float) $exp['payoff_score'] : null,
			'summary'          => $cap( $summary, 300 ),
		);
	}

	/**
	 * Write (or refresh) the result row of one concluded test.
	 *
	 * @param int $test_id Experiment ID.
	 * @return int Row id (0 when nothing was written).
	 */
	public static function record_test( int $test_id ): int {
		global $wpdb;
		$exp = Spark_Living_Store::get( $test_id );
		if ( ! $exp || Spark_Living_Store::STATUS_CONCLUDED !== $exp['status'] ) {
			return 0;
		}
		if ( ! self::table_exists() ) {
			self::create_table();
		}
		$row      = self::build_row( $exp );
		$existing = (int) $wpdb->get_var( $wpdb->prepare( 'SELECT id FROM ' . self::table() . ' WHERE test_id = %d', $test_id ) ); // phpcs:ignore WordPress.DB
		if ( $existing ) {
			unset( $row['created_at'] );
			$wpdb->update( self::table(), $row, array( 'id' => $existing ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
			return $existing;
		}
		$ok = $wpdb->insert( self::table(), $row ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		return $ok ? max( 1, (int) $wpdb->insert_id ) : 0; // (a fresh table can report no insert id; a written row still counts)
	}

	/**
	 * Back-fill a row for every concluded test that has none. Safe to run twice.
	 *
	 * @return int Rows written.
	 */
	public static function backfill(): int {
		global $wpdb;
		$ids = get_posts(
			array(
				'post_type'        => Spark_Living_Store::CPT_EXPERIMENT,
				'post_status'      => 'any',
				'numberposts'      => 500,
				'orderby'          => 'ID',
				'order'            => 'ASC',
				'fields'           => 'ids',
				'suppress_filters' => true,
				'meta_query'       => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
					array(
						'key'   => '_spark_living_status',
						'value' => Spark_Living_Store::STATUS_CONCLUDED,
					),
				),
			)
		);
		$n = 0;
		foreach ( (array) $ids as $id ) {
			$has = (int) $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(*) FROM ' . self::table() . ' WHERE test_id = %d', (int) $id ) ); // phpcs:ignore WordPress.DB
			if ( $has ) {
				continue;
			}
			if ( self::record_test( (int) $id ) ) {
				++$n;
			}
		}
		return $n;
	}

	/**
	 * Round a stored double for output.
	 *
	 * @param mixed $v Value.
	 * @return float|null
	 */
	private static function num( $v ): ?float {
		return ( null === $v || '' === $v ) ? null : round( (float) $v, 6 );
	}

	/**
	 * Shape one table row for GET /results. The names follow agents/results-library.md
	 * where the plugin can know the field; the plugin's own fields follow.
	 *
	 * @param array $r Row (ARRAY_A).
	 * @return array
	 */
	public static function present( array $r ): array {
		$ended = (string) ( $r['ended_at'] ?? '' );
		return array(
			'record_id'            => ( '' !== $ended ? substr( $ended, 0, 10 ) : 'undated' ) . '-' . (int) $r['test_id'],
			'test_id'              => (int) $r['test_id'],
			'test_name'            => (string) $r['test_name'],
			'page_type'            => (string) $r['page_type'],
			'scope'                => (string) $r['scope'],
			'device'               => (string) $r['device_scope'],
			'element'              => (string) $r['element_selector'],
			'element_type'         => (string) $r['element_type'],
			'change_type'          => (string) $r['change_type'],
			'a_label'              => (string) $r['a_label'],
			'b_label'              => (string) $r['b_label'],
			'variant_a'            => (string) $r['a_label'],
			'variant_b'            => (string) $r['b_label'],
			'outcome'              => (string) $r['outcome'],
			'verdict'              => (string) $r['verdict'],
			'shipped'              => (bool) $r['shipped'],
			'tier'                 => (int) $r['tier'],
			'started'              => '' !== (string) $r['started_at'] ? substr( (string) $r['started_at'], 0, 10 ) : null,
			'ended'                => '' !== $ended ? substr( $ended, 0, 10 ) : null,
			'days'                 => self::num( $r['days_run'] ),
			'max_days'             => (int) $r['max_days'],
			'sessions_a'           => (int) $r['sessions_a'],
			'sessions_b'           => (int) $r['sessions_b'],
			'intent_rate_a'        => self::num( $r['intent_rate_a'] ),
			'intent_rate_b'        => self::num( $r['intent_rate_b'] ),
			'lead_rate_a'          => self::num( $r['lead_rate_a'] ),
			'lead_rate_b'          => self::num( $r['lead_rate_b'] ),
			'relative_lift_intent' => self::num( $r['lift_intent'] ),
			'relative_lift_leads'  => self::num( $r['lift_leads'] ),
			'lift'                 => self::num( $r['lift_intent'] ),
			'p_b_beats_a'          => self::num( $r['probability'] ),
			'probability'          => self::num( $r['probability'] ),
			'met_minimum'          => (bool) $r['met_minimum'],
			'forced_start'         => (bool) $r['forced_start'],
			'payoff_score_at_start' => self::num( $r['payoff_score'] ),
			'summary'              => (string) $r['summary'],
		);
	}

	/**
	 * Rows, newest first.
	 *
	 * @param array $args per_page (1 to 100), page, outcome, change_type, scope.
	 * @return array{items: array[], total: int}
	 */
	public static function query( array $args = array() ): array {
		global $wpdb;
		if ( ! self::table_exists() ) {
			return array( 'items' => array(), 'total' => 0 );
		}
		$per_page = max( 1, min( 100, (int) ( $args['per_page'] ?? 20 ) ) );
		$page     = max( 1, (int) ( $args['page'] ?? 1 ) );
		$where    = array( '1=1' );
		$params   = array();
		foreach ( array( 'outcome', 'change_type', 'scope' ) as $k ) {
			if ( isset( $args[ $k ] ) && '' !== (string) $args[ $k ] ) {
				$where[]  = $k . ' = %s';
				$params[] = sanitize_text_field( (string) $args[ $k ] );
			}
		}
		$clause = implode( ' AND ', $where );
		$table  = self::table();

		$count_sql = "SELECT COUNT(*) FROM {$table} WHERE {$clause}";
		$total     = (int) ( $params ? $wpdb->get_var( $wpdb->prepare( $count_sql, $params ) ) : $wpdb->get_var( $count_sql ) ); // phpcs:ignore WordPress.DB

		$sql      = "SELECT * FROM {$table} WHERE {$clause} ORDER BY ended_at DESC, id DESC LIMIT %d OFFSET %d";
		$params[] = $per_page;
		$params[] = ( $page - 1 ) * $per_page;
		$rows     = $wpdb->get_results( $wpdb->prepare( $sql, $params ), ARRAY_A ); // phpcs:ignore WordPress.DB

		$items = array();
		foreach ( (array) $rows as $r ) {
			$items[] = self::present( $r );
		}
		return array(
			'items' => $items,
			'total' => $total,
		);
	}

	/**
	 * Number of result rows.
	 *
	 * @return int
	 */
	public static function count(): int {
		global $wpdb;
		if ( ! self::table_exists() ) {
			return 0;
		}
		return (int) $wpdb->get_var( 'SELECT COUNT(*) FROM ' . self::table() ); // phpcs:ignore WordPress.DB
	}
}
