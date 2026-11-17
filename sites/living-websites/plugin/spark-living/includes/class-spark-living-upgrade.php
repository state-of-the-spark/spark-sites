<?php
/**
 * Spark Living: the upgrade routine (0.3.0, extended in 0.4.0).
 *
 * Runs on `init` (priority 1) whenever the stored database version or plugin
 * version differs from the code. Creates or updates both tables with dbDelta
 * (safe to run twice), writes the plugin_update ledger row once per version
 * and, the first time the ledger exists, backfills rows for what already
 * happened on the site, derived only from stored post data.
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Spark_Living_Upgrade {

	public const OPT_VERSION  = 'spark_living_version';
	public const OPT_BACKFILL = 'spark_living_ledger_backfilled';
	public const OPT_LOCK     = 'spark_living_upgrade_lock';

	/**
	 * Hook the routine.
	 */
	public static function init(): void {
		add_action( 'init', array( __CLASS__, 'maybe_run' ), 1 );
	}

	/**
	 * Run only when something is out of date.
	 */
	public static function maybe_run(): void {
		if ( get_option( 'spark_living_db_version' ) === SPARK_LIVING_DB_VERSION && get_option( self::OPT_VERSION ) === SPARK_LIVING_VERSION ) {
			return;
		}
		self::run();
	}

	/**
	 * The upgrade. Safe to call any number of times.
	 *
	 * @return array{ran: bool, from: string, to: string, backfilled: int, plugin_update_rows: int, results_backfilled: int, stop_dates_set: int}
	 */
	public static function run(): array {
		$out = array(
			'ran'                => false,
			'from'               => '',
			'to'                 => SPARK_LIVING_VERSION,
			'backfilled'         => 0,
			'plugin_update_rows' => 0,
			'results_backfilled' => 0,
			'stop_dates_set'     => 0,
		);

		// One run at a time (two requests can arrive together right after a file copy).
		if ( ! add_option( self::OPT_LOCK, (string) time(), '', 'no' ) ) {
			$age = time() - (int) get_option( self::OPT_LOCK, 0 );
			if ( $age < 120 ) {
				return $out;
			}
			update_option( self::OPT_LOCK, (string) time(), false );
		}

		// Read the previous version before anything below updates the rewrite option.
		$from        = (string) get_option( self::OPT_VERSION, '' );
		$legacy_from = (string) get_option( 'spark_living_rewrite_version', '' );
		$from        = '' !== $from ? $from : $legacy_from;
		$out['from'] = $from;

		Spark_Living_Metrics::create_table();
		Spark_Living_Ledger::create_table();
		Spark_Living_Results::create_table();
		update_option( 'spark_living_db_version', SPARK_LIVING_DB_VERSION, false );

		if ( ! get_option( self::OPT_BACKFILL ) ) {
			$out['backfilled'] = self::backfill();
			update_option( self::OPT_BACKFILL, Spark_Living_Util::mysql_utc(), false );
		}

		if ( $from !== SPARK_LIVING_VERSION && ! self::plugin_update_exists( SPARK_LIVING_VERSION ) ) {
			$summary = '' === $from
				? sprintf( /* translators: %s: version */ __( 'Spark Living %s installed.', 'spark-living' ), SPARK_LIVING_VERSION )
				: sprintf( /* translators: 1: old version, 2: new version */ __( 'Spark Living updated from %1$s to %2$s.', 'spark-living' ), $from, SPARK_LIVING_VERSION );
			$id = Spark_Living_Ledger::record(
				array(
					'kind'         => 'plugin_update',
					'subject_type' => 'plugin',
					'subject_id'   => 'spark-living',
					'summary'      => $summary,
					'before'       => array( 'version' => $from ),
					'after'        => array( 'version' => SPARK_LIVING_VERSION, 'db_version' => SPARK_LIVING_DB_VERSION ),
					'proposed_by'  => 'owner',
					'gate_verdict' => 'na',
				)
			);
			$out['plugin_update_rows'] = $id ? 1 : 0;
		}

		// 0.4.0: one results row per concluded test (once; a second run finds them all and adds none).
		if ( ! get_option( Spark_Living_Results::OPT_BACKFILL ) ) {
			$out['results_backfilled'] = Spark_Living_Results::backfill();
			update_option( Spark_Living_Results::OPT_BACKFILL, Spark_Living_Util::mysql_utc(), false );
		}

		// 0.4.0: a test that was already running gets its stop date from the same code the nightly job uses.
		// Its start time, variants, weights and events are not touched.
		$running = Spark_Living_Store::get_running();
		if ( $running && (int) $running['max_days'] <= 0 ) {
			$r                      = Spark_Living_Engine::refresh_stop_date( $running, 'upgrade' );
			$out['stop_dates_set'] = $r['changed'] ? 1 : 0;
		}

		update_option( self::OPT_VERSION, SPARK_LIVING_VERSION, false );
		delete_option( self::OPT_LOCK );
		$out['ran'] = true;
		return $out;
	}

	/**
	 * Is there already a plugin_update row that went to this version?
	 *
	 * @param string $version Version.
	 * @return bool
	 */
	private static function plugin_update_exists( string $version ): bool {
		global $wpdb;
		$like = '%' . $wpdb->esc_like( '"version":"' . $version . '"' ) . '%';
		$n    = $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(*) FROM ' . Spark_Living_Ledger::table() . ' WHERE kind = %s AND after_json LIKE %s', 'plugin_update', $like ) ); // phpcs:ignore WordPress.DB
		return (int) $n > 0;
	}

	/**
	 * Is there already a row with this kind, subject and time?
	 *
	 * @param string $kind       Kind.
	 * @param string $subject_id Subject id.
	 * @param string $created_at UTC datetime.
	 * @return bool
	 */
	private static function row_exists( string $kind, string $subject_id, string $created_at ): bool {
		global $wpdb;
		$n = $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(*) FROM ' . Spark_Living_Ledger::table() . ' WHERE kind = %s AND subject_id = %s AND created_at = %s', $kind, $subject_id, $created_at ) ); // phpcs:ignore WordPress.DB
		return (int) $n > 0;
	}

	/**
	 * Write one backfill row unless an identical one exists.
	 *
	 * @param array $row Ledger row (created_at is required).
	 * @return int 1 when written, 0 when skipped.
	 */
	private static function put( array $row ): int {
		if ( empty( $row['created_at'] ) || self::row_exists( (string) $row['kind'], (string) $row['subject_id'], (string) $row['created_at'] ) ) {
			return 0;
		}
		$row['evidence']        = array_merge( array( 'backfill' => true, 'derived_from' => 'stored post data' ), (array) ( $row['evidence'] ?? array() ) );
		$row['charter_version'] = 0;
		return Spark_Living_Ledger::record( $row ) ? 1 : 0;
	}

	/**
	 * Ledger rows for what happened before the ledger existed. Every time and
	 * name comes from the stored experiments and evolution log entries.
	 *
	 * @return int Rows written.
	 */
	private static function backfill(): int {
		$n  = 0;
		$ids = get_posts(
			array(
				'post_type'        => array( Spark_Living_Store::CPT_EXPERIMENT, Spark_Living_Store::CPT_EVOLUTION ),
				'post_status'      => 'any',
				'numberposts'      => 500,
				'orderby'          => 'ID',
				'order'            => 'ASC',
				'fields'           => 'ids',
				'suppress_filters' => true,
			)
		);
		if ( ! $ids ) {
			return 0;
		}

		// First recorded activity = the plugin was installed by then.
		$first = '';
		foreach ( $ids as $pid ) {
			$p = get_post( (int) $pid );
			if ( $p && '' !== $p->post_date_gmt && '0000-00-00 00:00:00' !== $p->post_date_gmt && ( '' === $first || $p->post_date_gmt < $first ) ) {
				$first = $p->post_date_gmt;
			}
		}
		if ( '' !== $first ) {
			$n += self::put(
				array(
					'created_at'   => $first,
					'kind'         => 'plugin_update',
					'subject_type' => 'plugin',
					'subject_id'   => 'spark-living',
					'summary'      => 'Spark Living was installed on this site (the time shown is the first recorded activity; the exact install time was not stored).',
					'after'        => array( 'installed' => true ),
					'proposed_by'  => 'unknown',
				)
			);
		}

		foreach ( $ids as $pid ) {
			$p = get_post( (int) $pid );
			if ( ! $p ) {
				continue;
			}
			if ( Spark_Living_Store::CPT_EVOLUTION === $p->post_type ) {
				$e = Spark_Living_Store::format_log_entry( $p );
				if ( 'revert' === $e['entry_type'] && '' !== $e['ended'] ) {
					$n += self::put(
						array(
							'created_at'   => $e['ended'],
							'kind'         => 'reverted',
							'subject_type' => 'test',
							'subject_id'   => (string) $e['experiment_id'],
							'summary'      => 'A shipped winner was reverted: "' . preg_replace( '/ \([a-z_]+\)$/', '', $e['title'] ) . '".',
							'proposed_by'  => 'engine',
							'result'       => array( 'numbers' => $e['numbers'], 'note' => $e['note'] ),
						)
					);
				}
				continue;
			}

			$x = Spark_Living_Store::get( (int) $p->ID );
			if ( ! $x ) {
				continue;
			}
			$sid  = (string) $x['id'];
			$name = '"' . $x['name'] . '"';

			if ( '' !== (string) $x['suggested_at'] ) {
				$n += self::put(
					array(
						'created_at'   => (string) $x['suggested_at'],
						'kind'         => 'test_suggested',
						'subject_type' => 'test',
						'subject_id'   => $sid,
						'summary'      => 'Test suggested: ' . $name . ( '' !== (string) $x['suggested_by'] ? ' (suggested by ' . $x['suggested_by'] . ').' : '.' ),
						'after'        => array( 'status' => 'suggested', 'page' => $x['page'], 'priority' => $x['priority'], 'device' => $x['device'] ),
						'proposed_by'  => '' !== (string) $x['suggested_by'] ? (string) $x['suggested_by'] : 'unknown',
						'evidence'     => array( 'rationale' => $x['rationale'], 'items' => $x['evidence'] ),
					)
				);
			}
			if ( '' !== (string) $x['queued_at'] ) {
				$n += self::put(
					array(
						'created_at'   => (string) $x['queued_at'],
						'kind'         => 'test_queued',
						'subject_type' => 'test',
						'subject_id'   => $sid,
						'summary'      => 'Test queued: ' . $name . '.',
						'after'        => array( 'status' => 'queued' ),
						'proposed_by'  => 'unknown',
					)
				);
			}
			if ( '' !== (string) $x['dismissed_at'] ) {
				$n += self::put(
					array(
						'created_at'   => (string) $x['dismissed_at'],
						'kind'         => 'test_dismissed',
						'subject_type' => 'test',
						'subject_id'   => $sid,
						'summary'      => 'Test dismissed: ' . $name . '.',
						'after'        => array( 'status' => 'dismissed' ),
						'proposed_by'  => 'unknown',
					)
				);
			}
			if ( '' !== (string) $x['start_date'] ) {
				$n += self::put(
					array(
						'created_at'   => (string) $x['start_date'],
						'kind'         => 'test_started',
						'subject_type' => 'test',
						'subject_id'   => $sid,
						'summary'      => 'Test started: ' . $name . ' (' . ( '' !== (string) $x['target'] ? $x['target'] : 'block test' ) . ').',
						'after'        => array( 'status' => 'running', 'weights' => array( 'A' => 0.5, 'B' => 0.5 ), 'device' => $x['device'] ),
						'proposed_by'  => 'unknown',
						'evidence'     => array( 'sessions_14d' => $x['start_sessions_14d'], 'forced_start' => $x['forced_start'] ),
					)
				);
			}
			if ( '' !== (string) $x['end_date'] && Spark_Living_Store::STATUS_CONCLUDED === $x['status'] ) {
				$n += self::put(
					array(
						'created_at'   => (string) $x['end_date'],
						'kind'         => 'test_concluded',
						'subject_type' => 'test',
						'subject_id'   => $sid,
						'summary'      => 'Test ended: ' . $name . ' (' . ( '' !== (string) $x['verdict'] ? $x['verdict'] : 'no verdict recorded' ) . ').',
						'after'        => array( 'status' => 'concluded', 'verdict' => $x['verdict'], 'winner' => $x['winner'] ),
						'proposed_by'  => 'unknown',
						'result'       => is_array( $x['snapshot'] ) ? array( 'counts' => $x['snapshot']['counts'] ?? null, 'rates' => $x['snapshot']['rates'] ?? null ) : null,
					)
				);
			}
			if ( '' !== (string) $x['shipped_at'] && $x['promoted'] ) {
				$n += self::put(
					array(
						'created_at'   => (string) $x['shipped_at'],
						'kind'         => 'winner_applied',
						'subject_type' => 'test',
						'subject_id'   => $sid,
						'summary'      => 'Winner made permanent: ' . $name . '.',
						'after'        => array( 'promoted' => true ),
						'proposed_by'  => 'unknown',
					)
				);
			}
			// A running test whose split is no longer 50/50: the nightly job moved it before the ledger existed.
			if ( Spark_Living_Store::STATUS_RUNNING === $x['status'] && is_array( $x['weights'] ) && abs( (float) ( $x['weights']['A'] ?? 0.5 ) - 0.5 ) > 0.0001 ) {
				$n += self::put(
					array(
						'created_at'   => Spark_Living_Util::mysql_utc(),
						'kind'         => 'weights_changed',
						'subject_type' => 'test',
						'subject_id'   => $sid,
						'summary'      => 'The traffic split on ' . $name . ' was ' . Spark_Living_Ledger::weights_text( $x['weights'] ) . ' when this ledger started. The nightly job set it before the ledger existed, so the exact time was not recorded (the time shown is when this entry was written).',
						'before'       => array( 'A' => 0.5, 'B' => 0.5 ),
						'after'        => $x['weights'],
						'proposed_by'  => 'engine',
						'evidence'     => array( 'time_unknown' => true ),
					)
				);
			}
		}
		return $n;
	}
}
