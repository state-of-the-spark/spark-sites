<?php
/**
 * Spark Living: nightly WP-Cron job. Runs inside the site so it keeps living
 * even when the central brain is offline.
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Spark_Living_Cron {

	public const HOOK = 'spark_living_nightly';

	/**
	 * Hook the job.
	 */
	public static function init(): void {
		add_action( self::HOOK, array( __CLASS__, 'run' ) );
		if ( ! wp_next_scheduled( self::HOOK ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', self::HOOK );
		}
	}

	/**
	 * Remove the schedule (plugin deactivation).
	 */
	public static function unschedule(): void {
		$ts = wp_next_scheduled( self::HOOK );
		if ( $ts ) {
			wp_unschedule_event( $ts, self::HOOK );
		}
	}

	/**
	 * Nightly work: evaluate the running test (weights, verdict, promotion,
	 * evolution log), then check recent ships for auto-revert, then prune.
	 */
	public static function run(): void {
		$running = Spark_Living_Store::get_running();
		$changed = false;
		if ( $running ) {
			$result = Spark_Living_Engine::evaluate( (int) $running['id'] );
			// Weights changed: cached pages carry stale weights. (A concluded test or a
			// revert flushes through the spark_living_test_* hooks in spark-living.php.)
			if ( is_array( $result ) && isset( $result['action'] ) && 'weights_updated' === $result['action'] ) {
				$changed = true;
			}
		}
		Spark_Living_Engine::check_reverts();
		if ( $changed ) {
			Spark_Living_Util::flush_page_cache();
		}
		Spark_Living_Metrics::prune( 400 );
		update_option( 'spark_living_last_run', Spark_Living_Util::mysql_utc(), false );
		do_action( 'spark_living_nightly_complete' );
	}
}
