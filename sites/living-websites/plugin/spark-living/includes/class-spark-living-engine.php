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
	 * Minimum exposures each version needs before the traffic split may move
	 * off 50/50. Default 30; stored in the option spark_living_settings
	 * (min_exposures_before_shift) and filterable.
	 *
	 * @return int
	 */
	public static function min_exposures(): int {
		$settings = get_option( 'spark_living_settings', array() );
		$value    = ( is_array( $settings ) && isset( $settings['min_exposures_before_shift'] ) && is_numeric( $settings['min_exposures_before_shift'] ) ) ? (int) $settings['min_exposures_before_shift'] : 30;
		/**
		 * Filters the minimum exposures per version before the split may shift.
		 *
		 * @param int $value Minimum exposures per version.
		 */
		return max( 0, (int) apply_filters( 'spark_living_min_exposures_before_shift', $value ) );
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
			// Slower weight shifting: the split stays 50/50 until each version has the minimum exposures.
			$min    = self::min_exposures();
			$n_a    = (int) $snap['counts']['A']['sessions'];
			$n_b    = (int) $snap['counts']['B']['sessions'];
			$gated  = Spark_Living_Stats::floor_weights( $decision['weights'], $n_a, $n_b, $min );
			$new    = $gated['weights'];
			$old    = is_array( $exp['weights'] ) ? $exp['weights'] : array( 'A' => 0.5, 'B' => 0.5 );
			$moved  = abs( (float) ( $old['A'] ?? 0.5 ) - (float) $new['A'] ) > 0.0001 || abs( (float) ( $old['B'] ?? 0.5 ) - (float) $new['B'] ) > 0.0001;
			Spark_Living_Store::update( $id, array( 'weights' => $new ) );
			if ( $moved ) {
				$reason = $gated['held']
					? sprintf(
						/* translators: 1: test name, 2: old split, 3: A exposures, 4: B exposures, 5: minimum */
						__( 'Traffic split on "%1$s" put back from %2$s to 50/50: only %3$d (current) and %4$d (challenger) exposures so far, and each version needs %5$d before the split may move.', 'spark-living' ),
						$exp['name'],
						Spark_Living_Ledger::weights_text( $old ),
						$n_a,
						$n_b,
						$min
					)
					: sprintf(
						/* translators: 1: test name, 2: old split, 3: new split, 4: A exposures, 5: B exposures */
						__( 'Traffic split on "%1$s" moved from %2$s to %3$s after %4$d (current) and %5$d (challenger) exposures.', 'spark-living' ),
						$exp['name'],
						Spark_Living_Ledger::weights_text( $old ),
						Spark_Living_Ledger::weights_text( $new ),
						$n_a,
						$n_b
					);
				Spark_Living_Ledger::record(
					array(
						'kind'         => 'weights_changed',
						'subject_type' => 'test',
						'subject_id'   => (string) $id,
						'summary'      => $reason,
						'before'       => array( 'A' => (float) ( $old['A'] ?? 0.5 ), 'B' => (float) ( $old['B'] ?? 0.5 ) ),
						'after'        => $new,
						'proposed_by'  => 'engine',
						'evidence'     => array(
							'reason'                    => $gated['held'] ? 'below_exposure_floor' : 'evidence',
							'exposures'                 => array( 'A' => $n_a, 'B' => $n_b ),
							'min_exposures_before_shift' => $min,
							'intent'                    => array( 'A' => (int) $snap['counts']['A']['intent'], 'B' => (int) $snap['counts']['B']['intent'] ),
							'p_b_beats_a'               => $decision['p_b_beats_a'] ?? null,
						),
						'undo'         => array(
							'action'        => 'restore_weights',
							'experiment_id' => $id,
							'weights'       => array( 'A' => (float) ( $old['A'] ?? 0.5 ), 'B' => (float) ( $old['B'] ?? 0.5 ) ),
						),
					)
				);
			}
			$snap['action']          = 'weights_updated';
			$snap['weights_changed'] = $moved;
			$snap['weights_held']    = $gated['held'];
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
	 * @param string $by      Who concluded it, for the ledger (default: engine for nightly, owner otherwise).
	 * @return int|WP_Error Log entry ID.
	 */
	public static function conclude( int $id, string $verdict, array $snap, string $source, string $note = '', string $by = '' ) {
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
		$by = Spark_Living_Gate::clean_by( $by );
		$by = '' !== $by ? $by : ( 'nightly' === $source ? 'engine' : 'owner' );
		Spark_Living_Ledger::record(
			array(
				'kind'         => 'test_concluded',
				'subject_type' => 'test',
				'subject_id'   => (string) $id,
				'summary'      => sprintf( /* translators: 1: test name, 2: outcome */ __( 'Test ended: "%1$s". Outcome: %2$s.', 'spark-living' ), $exp['name'], self::verdict_words( $verdict ) ),
				'before'       => array( 'status' => 'running' ),
				'after'        => array(
					'status'  => 'concluded',
					'verdict' => $verdict,
					'winner'  => $ship ? 'B' : 'A',
				),
				'proposed_by'  => $by,
				'evidence'     => array( 'source' => $source, 'note' => $note, 'reason' => $snap['decision']['reason'] ?? '' ),
				'result'       => array(
					'counts'           => $snap['counts'] ?? array(),
					'rates'            => $snap['rates'] ?? array(),
					'days_running'     => $snap['days_running'] ?? 0,
					'p_b_beats_a'      => $snap['decision']['p_b_beats_a'] ?? null,
					'p_lead_b_beats_a' => $snap['decision']['p_lead_b_beats_a'] ?? null,
				),
			)
		);
		if ( $ship ) {
			Spark_Living_Ledger::record(
				array(
					'kind'         => 'winner_applied',
					'subject_type' => 'test',
					'subject_id'   => (string) $id,
					'summary'      => sprintf( /* translators: %s: test name */ __( 'Winner made permanent: the challenger from "%s" is now what living visitors see.', 'spark-living' ), $exp['name'] ),
					'before'       => array( 'promoted' => false ),
					'after'        => array( 'promoted' => true, 'variants' => $exp['variants']['B'] ?? array() ),
					'proposed_by'  => $by,
					'evidence'     => array( 'source' => $source ),
				)
			);
		}
		do_action( 'spark_living_test_concluded', $id, $verdict, $ship );
		return $log_id;
	}

	/**
	 * Plain words for a verdict (ledger summaries).
	 *
	 * @param string $verdict Verdict.
	 * @return string
	 */
	public static function verdict_words( string $verdict ): string {
		$words = array(
			'ship_b'        => __( 'challenger won and shipped', 'spark-living' ),
			'keep_a'        => __( 'current version kept', 'spark-living' ),
			'no_difference' => __( 'no difference, current version kept', 'spark-living' ),
			'guard_blocked' => __( 'blocked by the lead guard, current version kept', 'spark-living' ),
		);
		return $words[ $verdict ] ?? $verdict;
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
				Spark_Living_Ledger::record(
					array(
						'kind'         => 'reverted',
						'subject_type' => 'test',
						'subject_id'   => (string) $exp['id'],
						'summary'      => sprintf( /* translators: %s: test name */ __( 'Winner reverted: leads fell after "%s" shipped, so visitors see the original again.', 'spark-living' ), $exp['name'] ),
						'before'       => array( 'promoted' => true ),
						'after'        => array( 'promoted' => false, 'reverted' => true ),
						'proposed_by'  => 'engine',
						'result'       => array(
							'leads_7_days_after_ship' => $leads_after,
							'prior_14_day_daily_avg'  => round( $prior_avg, 3 ),
							'revert_below_leads'      => round( $check['threshold'], 2 ),
						),
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
