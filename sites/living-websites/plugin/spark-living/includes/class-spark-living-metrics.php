<?php
/**
 * Spark Living: first-party event table and counting queries.
 *
 * Privacy: rows hold a random visitor id, a random session id, the experiment,
 * the variant, the event type and a UTC timestamp. No IP address, no user
 * agent, no URL, no personal data.
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Spark_Living_Metrics {

	public const EVENT_TYPES  = array( 'exposure', 'cta_click', 'form_start', 'form_submit', 'tel_click' );
	// Event types the browser may post. form_submit is server-side only.
	public const CLIENT_TYPES = array( 'exposure', 'cta_click', 'form_start', 'tel_click' );

	/**
	 * Table name.
	 *
	 * @return string
	 */
	public static function table(): string {
		global $wpdb;
		return $wpdb->prefix . 'spark_living_events';
	}

	/**
	 * Create or upgrade the events table with dbDelta.
	 */
	public static function create_table(): void {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$table   = self::table();
		$charset = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE {$table} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  experiment_id bigint(20) unsigned NOT NULL DEFAULT 0,
  variant varchar(2) NOT NULL DEFAULT '',
  visitor_id varchar(32) NOT NULL DEFAULT '',
  session_id varchar(32) NOT NULL DEFAULT '',
  event_type varchar(20) NOT NULL DEFAULT '',
  created_at datetime NOT NULL,
  PRIMARY KEY  (id),
  KEY exp_type_session (experiment_id,event_type,session_id),
  KEY exp_variant_type (experiment_id,variant,event_type),
  KEY created_at (created_at),
  KEY visitor_id (visitor_id)
) {$charset};";

		dbDelta( $sql );
		update_option( 'spark_living_db_version', SPARK_LIVING_DB_VERSION, false );
	}

	/**
	 * Insert one event row.
	 *
	 * @param int    $experiment_id Experiment ID (0 = site watch).
	 * @param string $variant       A, B, H or L.
	 * @param string $visitor_id    Random visitor id.
	 * @param string $session_id    Random session id.
	 * @param string $type          Event type.
	 * @return bool
	 */
	public static function insert_event( int $experiment_id, string $variant, string $visitor_id, string $session_id, string $type ): bool {
		global $wpdb;
		if ( ! in_array( $type, self::EVENT_TYPES, true ) ) {
			return false;
		}
		$ok = $wpdb->insert(
			self::table(),
			array(
				'experiment_id' => $experiment_id,
				'variant'       => $variant,
				'visitor_id'    => $visitor_id,
				'session_id'    => $session_id,
				'event_type'    => $type,
				'created_at'    => Spark_Living_Util::mysql_utc(),
			),
			array( '%d', '%s', '%s', '%s', '%s', '%s' )
		);
		return false !== $ok;
	}

	/**
	 * Has this session already logged this event for this experiment?
	 *
	 * @param int    $experiment_id Experiment ID.
	 * @param string $session_id    Session id.
	 * @param string $type          Event type.
	 * @return bool
	 */
	public static function has_event( int $experiment_id, string $session_id, string $type ): bool {
		global $wpdb;
		$table = self::table();
		$found = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT id FROM {$table} WHERE experiment_id = %d AND session_id = %s AND event_type = %s LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$experiment_id,
				$session_id,
				$type
			)
		);
		return null !== $found;
	}

	/**
	 * Per-variant counts for one experiment since a start time.
	 *
	 * sessions: distinct sessions with an exposure.
	 * intent:   distinct exposed sessions with cta_click, form_submit or tel_click.
	 * leads:    distinct exposed sessions with form_submit or tel_click.
	 *
	 * @param int    $experiment_id Experiment ID.
	 * @param string $since         UTC datetime.
	 * @return array<string, array{sessions: int, intent: int, leads: int}>
	 */
	public static function variant_counts( int $experiment_id, string $since ): array {
		global $wpdb;
		$t   = self::table();
		$out = array();

		$sessions = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT variant, COUNT(DISTINCT session_id) AS n FROM {$t} WHERE experiment_id = %d AND event_type = 'exposure' AND created_at >= %s GROUP BY variant", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$experiment_id,
				$since
			),
			ARRAY_A
		);
		foreach ( (array) $sessions as $row ) {
			$out[ $row['variant'] ] = array(
				'sessions' => (int) $row['n'],
				'intent'   => 0,
				'leads'    => 0,
			);
		}

		$intent = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT e.variant AS variant, COUNT(DISTINCT e.session_id) AS n FROM {$t} e INNER JOIN {$t} x ON x.experiment_id = e.experiment_id AND x.session_id = e.session_id AND x.event_type = 'exposure' WHERE e.experiment_id = %d AND e.created_at >= %s AND e.event_type IN ('cta_click','form_submit','tel_click') GROUP BY e.variant", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$experiment_id,
				$since
			),
			ARRAY_A
		);
		foreach ( (array) $intent as $row ) {
			if ( isset( $out[ $row['variant'] ] ) ) {
				$out[ $row['variant'] ]['intent'] = (int) $row['n'];
			}
		}

		$leads = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT e.variant AS variant, COUNT(DISTINCT e.session_id) AS n FROM {$t} e INNER JOIN {$t} x ON x.experiment_id = e.experiment_id AND x.session_id = e.session_id AND x.event_type = 'exposure' WHERE e.experiment_id = %d AND e.created_at >= %s AND e.event_type IN ('form_submit','tel_click') GROUP BY e.variant", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$experiment_id,
				$since
			),
			ARRAY_A
		);
		foreach ( (array) $leads as $row ) {
			if ( isset( $out[ $row['variant'] ] ) ) {
				$out[ $row['variant'] ]['leads'] = (int) $row['n'];
			}
		}

		return $out;
	}

	/**
	 * Living versus holdout counts across every experiment since a start time.
	 * Holdout = variant H. Living = every other variant.
	 *
	 * @param string $since UTC datetime.
	 * @return array{living: array, holdout: array}
	 */
	public static function lift_counts( string $since ): array {
		global $wpdb;
		$t    = self::table();
		$zero = array(
			'sessions' => 0,
			'intent'   => 0,
			'leads'    => 0,
		);
		$out  = array(
			'living'  => $zero,
			'holdout' => $zero,
		);

		$sessions = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT IF(variant = 'H','holdout','living') AS grp, COUNT(DISTINCT session_id) AS n FROM {$t} WHERE event_type = 'exposure' AND created_at >= %s GROUP BY grp", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$since
			),
			ARRAY_A
		);
		foreach ( (array) $sessions as $row ) {
			$out[ $row['grp'] ]['sessions'] = (int) $row['n'];
		}

		$intent = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT IF(e.variant = 'H','holdout','living') AS grp, COUNT(DISTINCT e.session_id) AS n FROM {$t} e INNER JOIN {$t} x ON x.experiment_id = e.experiment_id AND x.session_id = e.session_id AND x.event_type = 'exposure' WHERE e.created_at >= %s AND e.event_type IN ('cta_click','form_submit','tel_click') GROUP BY grp", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$since
			),
			ARRAY_A
		);
		foreach ( (array) $intent as $row ) {
			$out[ $row['grp'] ]['intent'] = (int) $row['n'];
		}

		$leads = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT IF(e.variant = 'H','holdout','living') AS grp, COUNT(DISTINCT e.session_id) AS n FROM {$t} e INNER JOIN {$t} x ON x.experiment_id = e.experiment_id AND x.session_id = e.session_id AND x.event_type = 'exposure' WHERE e.created_at >= %s AND e.event_type IN ('form_submit','tel_click') GROUP BY grp", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$since
			),
			ARRAY_A
		);
		foreach ( (array) $leads as $row ) {
			$out[ $row['grp'] ]['leads'] = (int) $row['n'];
		}
		return $out;
	}

	/**
	 * Distinct lead sessions (form_submit or tel_click) in a window, all visitors.
	 *
	 * @param string $from UTC datetime, inclusive.
	 * @param string $to   UTC datetime, exclusive.
	 * @return int
	 */
	public static function lead_sessions_between( string $from, string $to ): int {
		global $wpdb;
		$t = self::table();
		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(DISTINCT session_id) FROM {$t} WHERE event_type IN ('form_submit','tel_click') AND created_at >= %s AND created_at < %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$from,
				$to
			)
		);
	}

	/**
	 * Timestamp of the oldest event, or null if there are none.
	 *
	 * @return string|null
	 */
	public static function first_event_at(): ?string {
		global $wpdb;
		$t   = self::table();
		$min = $wpdb->get_var( "SELECT MIN(created_at) FROM {$t}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		return $min ? (string) $min : null;
	}

	/**
	 * Delete events older than a number of days.
	 *
	 * @param int $days Retention in days.
	 */
	public static function prune( int $days = 400 ): void {
		global $wpdb;
		$t      = self::table();
		$cutoff = Spark_Living_Util::mysql_utc( time() - max( 30, $days ) * DAY_IN_SECONDS );
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$t} WHERE created_at < %s", $cutoff ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	}
}
