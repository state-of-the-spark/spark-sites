<?php
/**
 * Spark Living: evaluates tests, concludes them, promotes winners, reverts.
 *
 * All statistics come from Spark_Living_Stats. This class only gathers the
 * counts, applies the verdict to the stored test and writes the log.
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Spark_Living_Engine {

	/**
	 * Fractional days a test has been running.
	 *
	 * @param array $exp Experiment.
	 * @return float
	 */
	public static function days_running( array $exp ): float {
		$start = Spark_Living_Util::to_ts( (string) $exp['start_date'] );
		if ( ! $start ) {
			return 0.0;
		}
		return max( 0.0, ( time() - $start ) / DAY_IN_SECONDS );
	}

	/**
	 * Counts per arm plus holdout for a test.
	 *
	 * @param array $exp Experiment.
	 * @return array{A: array, B: array, H: array}
	 */
	public static function counts( array $exp ): array {
		$zero = array(
			'sessions' => 0,
			'intent'   => 0,
			'leads'    => 0,
		);
		if ( '' === (string) $exp['start_date'] ) {
			return array(
				'A' => $zero,
				'B' => $zero,
				'H' => $zero,
			);
		}
		$c = Spark_Living_Metrics::variant_counts( (int) $exp['id'], (string) $exp['start_date'] );
		return array(
			'A' => $c['A'] ?? $zero,
			'B' => $c['B'] ?? $zero,
			'H' => $c['H'] ?? $zero,
		);
	}

	/**
	 * Live numbers and the current decision for a test (read-only).
	 *
	 * @param array $exp Experiment.
	 * @return array
	 */
	public static function snapshot( array $exp ): array {
		$counts   = self::counts( $exp );
		$days     = ( Spark_Living_Store::STATUS_RUNNING === $exp['status'] ) ? self::days_running( $exp ) : 0.0;
		$decision = Spark_Living_Stats::decide( $counts['A'], $counts['B'], $days );
		return array(
			'counts'       => $counts,
			'days_running' => round( $days, 2 ),
			'decision'     => $decision,
			'rates'        => array(
				'A' => Spark_Living_Stats::rate( $counts['A']['intent'], $counts['A']['sessions'] ),
				'B' => Spark_Living_Stats::rate( $counts['B']['intent'], $counts['B']['sessions'] ),
				'H' => Spark_Living_Stats::rate( $counts['H']['intent'], $counts['H']['sessions'] ),
			),
		);
	}

	/**
	 * Nightly evaluation of the running test: update weights or conclude.
	 *
	 * @param int $id Experiment ID.
	 * @return array|WP_Error
	 */
	public static function evaluate( int $id ) {
		$exp = Spark_Living_Store::get( $id );
		if ( ! $exp || Spark_Living_Store::STATUS_RUNNING !== $exp['status'] ) {
			return new WP_Error( 'spark_living_not_running', __( 'That test is not running.', 'spark-living' ), array( 'status' => 409 ) );
		}
		$snap     = self::snapshot( $exp );
		$decision = $snap['decision'];

		if ( Spark_Living_Stats::V_CONTINUE === $decision['verdict'] ) {
			Spark_Living_Store::update( $id, array( 'weights' => $decision['weights'] ) );
			$snap['action'] = 'weights_updated';
			return $snap;
		}

		$result = self::conclude( $id, $decision['verdict'], $snap, 'nightly', $decision['reason'] );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		$snap['action']  = 'concluded';
		$snap['log_id']  = $result;
		return $snap;
	}

	/**
	 * Conclude a running test. ship_b promotes B; every other verdict keeps A.
	 *
	 * @param int    $id      Experiment ID.
	 * @param string $verdict ship_b, keep_a, no_difference or guard_blocked.
	 * @param array  $snap    Snapshot from snapshot().
	 * @param string $source  nightly, rest or admin.
	 * @param string $note    Free text for the log.
	 * @return int|WP_Error Log entry ID.
	 */
	public static function conclude( int $id, string $verdict, array $snap, string $source, string $note = '' ) {
		$valid = array(
			Spark_Living_Stats::V_SHIP_B,
			Spark_Living_Stats::V_KEEP_A,
			Spark_Living_Stats::V_NO_DIFF,
			Spark_Living_Stats::V_GUARD_BLOCKED,
		);
		if ( ! in_array( $verdict, $valid, true ) ) {
			return new WP_Error( 'spark_living_verdict', __( 'Unknown verdict.', 'spark-living' ), array( 'status' => 400 ) );
		}
		$exp = Spark_Living_Store::get( $id );
		if ( ! $exp ) {
			return new WP_Error( 'spark_living_missing', __( 'Test not found.', 'spark-living' ), array( 'status' => 404 ) );
		}
		if ( Spark_Living_Store::STATUS_RUNNING !== $exp['status'] ) {
			return new WP_Error( 'spark_living_state', __( 'Only a running test can be concluded.', 'spark-living' ), array( 'status' => 409 ) );
		}

		$ship   = ( Spark_Living_Stats::V_SHIP_B === $verdict );
		$fields = array(
			'status'   => Spark_Living_Store::STATUS_CONCLUDED,
			'end_date' => Spark_Living_Util::mysql_utc(),
			'verdict'  => $verdict,
			'winner'   => $ship ? 'B' : 'A',
			'promoted' => $ship,
			'snapshot' => $snap,
		);
		if ( $ship ) {
			$fields['shipped_at']     = Spark_Living_Util::mysql_utc();
			$fields['revert_checked'] = false;
		}
		Spark_Living_Store::update( $id, $fields );

		$numbers = array(
			'counts'           => $snap['counts'] ?? array(),
			'rates'            => $snap['rates'] ?? array(),
			'days_running'     => $snap['days_running'] ?? 0,
			'p_b_beats_a'      => $snap['decision']['p_b_beats_a'] ?? null,
			'p_lead_b_beats_a' => $snap['decision']['p_lead_b_beats_a'] ?? null,
			'source'           => $source,
		);
		$log_id = Spark_Living_Store::add_log_entry(
			$exp,
			array(
				'verdict'    => $verdict,
				'numbers'    => $numbers,
				'shipped'    => $ship,
				'entry_type' => 'test',
				'note'       => $note,
			)
		);
		do_action( 'spark_living_test_concluded', $id, $verdict, $ship );
		return $log_id;
	}

	/**
	 * Review shipped winners that are 7 or more days old and not yet checked.
	 * Reverts any whose leads fell more than 30 percent below the prior
	 * 14-day daily average.
	 *
	 * @return bool True when at least one winner was reverted.
	 */
	public static function check_reverts(): bool {
		$reverted = false;
		foreach ( Spark_Living_Store::get_promoted() as $exp ) {
			if ( $exp['revert_checked'] || '' === (string) $exp['shipped_at'] ) {
				continue;
			}
			$shipped = Spark_Living_Util::to_ts( (string) $exp['shipped_at'] );
			$days    = ( time() - $shipped ) / DAY_IN_SECONDS;
			if ( $days < Spark_Living_Stats::REVERT_DAYS ) {
				continue;
			}

			$window_end   = $shipped + Spark_Living_Stats::REVERT_DAYS * DAY_IN_SECONDS;
			$leads_after  = Spark_Living_Metrics::lead_sessions_between(
				Spark_Living_Util::mysql_utc( $shipped ),
				Spark_Living_Util::mysql_utc( $window_end )
			);
			$prior_start  = $shipped - Spark_Living_Stats::PRIOR_DAYS * DAY_IN_SECONDS;
			$first        = Spark_Living_Metrics::first_event_at();
			$first_ts     = $first ? Spark_Living_Util::to_ts( $first ) : $shipped;
			$prior_days   = max( 1.0, min( (float) Spark_Living_Stats::PRIOR_DAYS, ( $shipped - max( $first_ts, $prior_start ) ) / DAY_IN_SECONDS ) );
			$prior_leads  = Spark_Living_Metrics::lead_sessions_between(
				Spark_Living_Util::mysql_utc( max( $first_ts, $prior_start ) ),
				Spark_Living_Util::mysql_utc( $shipped )
			);
			$prior_avg    = $prior_leads / $prior_days;
			$check        = Spark_Living_Stats::auto_revert_check( $leads_after, $prior_avg, $days );

			Spark_Living_Store::update( (int) $exp['id'], array( 'revert_checked' => true ) );

			if ( $check['revert'] ) {
				Spark_Living_Store::update(
					(int) $exp['id'],
					array(
						'promoted' => false,
						'reverted' => true,
					)
				);
				Spark_Living_Store::add_log_entry(
					$exp,
					array(
						'verdict'    => 'reverted',
						'entry_type' => 'revert',
						'shipped'    => false,
						'numbers'    => array(
							'leads_7_days_after_ship'  => $leads_after,
							'prior_14_day_daily_avg'   => round( $prior_avg, 3 ),
							'revert_below_leads'       => round( $check['threshold'], 2 ),
						),
						'note'       => 'Auto-revert: leads in the 7 days after the ship fell more than 30 percent below the prior 14-day daily average.',
					)
				);
				do_action( 'spark_living_test_reverted', (int) $exp['id'] );
				$reverted = true;
			}
		}
		return $reverted;
	}

	/**
	 * Cumulative lift: living visitors versus the permanent holdout, counted
	 * from the first shipped winner that is still live.
	 *
	 * @return array|null Null when nothing has shipped yet.
	 */
	public static function lift_summary(): ?array {
		$promoted = Spark_Living_Store::get_promoted();
		if ( ! $promoted ) {
			return null;
		}
		$since = '';
		foreach ( $promoted as $exp ) {
			if ( '' !== (string) $exp['shipped_at'] && ( '' === $since || $exp['shipped_at'] < $since ) ) {
				$since = (string) $exp['shipped_at'];
			}
		}
		if ( '' === $since ) {
			return null;
		}
		$c       = Spark_Living_Metrics::lift_counts( $since );
		$rate_l  = Spark_Living_Stats::rate( $c['living']['intent'], $c['living']['sessions'] );
		$rate_h  = Spark_Living_Stats::rate( $c['holdout']['intent'], $c['holdout']['sessions'] );
		$lrate_l = Spark_Living_Stats::rate( $c['living']['leads'], $c['living']['sessions'] );
		$lrate_h = Spark_Living_Stats::rate( $c['holdout']['leads'], $c['holdout']['sessions'] );
		return array(
			'since'          => $since,
			'counts'         => $c,
			'intent_rate'    => array(
				'living'  => $rate_l,
				'holdout' => $rate_h,
			),
			'lead_rate'      => array(
				'living'  => $lrate_l,
				'holdout' => $lrate_h,
			),
			'intent_lift'    => Spark_Living_Stats::relative_lift( $rate_l, $rate_h ),
			'lead_lift'      => Spark_Living_Stats::relative_lift( $lrate_l, $lrate_h ),
			'p_living_wins'  => Spark_Living_Stats::prob_b_beats_a(
				$c['holdout']['intent'],
				$c['holdout']['sessions'],
				$c['living']['intent'],
				$c['living']['sessions']
			),
		);
	}
}
