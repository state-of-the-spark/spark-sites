<?php
/**
 * Spark Living: statistics engine.
 *
 * The math methods in this class are pure PHP with no WordPress dependencies,
 * so they can be unit-tested outside WordPress (tests/stats-check.js mirrors
 * this file line for line).
 *
 * Model: Beta-Bernoulli. Each session either did the thing (success) or did
 * not. With a uniform Beta(1,1) prior, an arm with s successes in n sessions
 * has the posterior Beta(1 + s, 1 + n - s).
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) && PHP_SAPI !== 'cli' ) {
	exit;
}

final class Spark_Living_Stats {

	// Section 3 of the build plan. Do not change without changing the plan.
	public const MIN_DAYS       = 7;      // Minimum run, full days.
	public const MIN_SESSIONS   = 100;    // Minimum run, sessions per variant.
	public const HARD_STOP_DAYS = 14;     // Hard stop.
	public const WIN_P          = 0.90;   // P(B beats A) at or above: B wins.
	public const LOSE_P         = 0.10;   // P(B beats A) at or below: A wins.
	public const FLOOR          = 0.20;   // Neither variant below 20 percent of traffic.
	public const GUARD_P        = 0.80;   // Guard: B blocked if worse on leads with this probability.
	public const REVERT_DROP    = 0.30;   // Auto-revert if leads fall more than 30 percent.
	public const REVERT_DAYS    = 7;      // Window after a ship that is watched.
	public const PRIOR_DAYS     = 14;     // Baseline window before a ship.
	public const HOLDOUT        = 0.10;   // Permanent holdout share of visitors.
	public const ELIGIBILITY_SESSIONS = 100; // Sessions in the last 14 days a page (or device) needs before a test may start.

	public const V_CONTINUE      = 'continue';
	public const V_SHIP_B        = 'ship_b';
	public const V_KEEP_A        = 'keep_a';
	public const V_NO_DIFF       = 'no_difference';
	public const V_GUARD_BLOCKED = 'guard_blocked';

	/**
	 * Natural log of the gamma function (Lanczos approximation, g = 7), x >= 0.5.
	 *
	 * @param float $x Argument.
	 * @return float
	 */
	public static function ln_gamma( float $x ): float {
		static $c = array(
			0.99999999999980993,
			676.5203681218851,
			-1259.1392167224028,
			771.32342877765313,
			-176.61502916214059,
			12.507343278686905,
			-0.13857109526572012,
			9.9843695780195716e-6,
			1.5056327351493116e-7,
		);
		$x -= 1.0;
		$a  = $c[0];
		$t  = $x + 7.5;
		for ( $i = 1; $i < 9; $i++ ) {
			$a += $c[ $i ] / ( $x + $i );
		}
		return 0.5 * log( 2.0 * M_PI ) + ( $x + 0.5 ) * log( $t ) - $t + log( $a );
	}

	/**
	 * Natural log of the beta function B(a, b).
	 *
	 * @param float $a First shape.
	 * @param float $b Second shape.
	 * @return float
	 */
	public static function ln_beta( float $a, float $b ): float {
		return self::ln_gamma( $a ) + self::ln_gamma( $b ) - self::ln_gamma( $a + $b );
	}

	/**
	 * P(rate_X > rate_Y) for two independent Beta posteriors with integer
	 * parameters, using the exact finite sum (Evan Miller, "Formulas for
	 * Bayesian A/B Testing"):
	 *
	 *   P(X > Y) = sum_{i=0}^{aX-1} B(aY+i, bY+bX) / ((bX+i) B(1+i, bX) B(aY, bY))
	 *
	 * This is exact, deterministic and needs no random numbers. The loop runs
	 * over the smaller alpha, using P(X > Y) = 1 - P(Y > X) when needed.
	 *
	 * @param int $alpha_x X alpha (1 + successes).
	 * @param int $beta_x  X beta (1 + failures).
	 * @param int $alpha_y Y alpha.
	 * @param int $beta_y  Y beta.
	 * @return float
	 */
	private static function prob_x_beats_y( int $alpha_x, int $beta_x, int $alpha_y, int $beta_y ): float {
		$ln_b_y = self::ln_beta( $alpha_y, $beta_y );
		$sum    = 0.0;
		for ( $i = 0; $i < $alpha_x; $i++ ) {
			$sum += exp(
				self::ln_beta( $alpha_y + $i, $beta_y + $beta_x )
				- log( $beta_x + $i )
				- self::ln_beta( 1 + $i, $beta_x )
				- $ln_b_y
			);
		}
		return $sum;
	}

	/**
	 * Probability that arm B's true rate beats arm A's true rate.
	 *
	 * @param int $s_a Successes in A.
	 * @param int $n_a Sessions in A.
	 * @param int $s_b Successes in B.
	 * @param int $n_b Sessions in B.
	 * @return float 0..1
	 */
	public static function prob_b_beats_a( int $s_a, int $n_a, int $s_b, int $n_b ): float {
		$n_a = max( 0, $n_a );
		$n_b = max( 0, $n_b );
		$s_a = min( $n_a, max( 0, $s_a ) );
		$s_b = min( $n_b, max( 0, $s_b ) );

		$alpha_a = 1 + $s_a;
		$beta_a  = 1 + $n_a - $s_a;
		$alpha_b = 1 + $s_b;
		$beta_b  = 1 + $n_b - $s_b;

		if ( $alpha_b <= $alpha_a ) {
			$p = self::prob_x_beats_y( $alpha_b, $beta_b, $alpha_a, $beta_a );
		} else {
			$p = 1.0 - self::prob_x_beats_y( $alpha_a, $beta_a, $alpha_b, $beta_b );
		}
		return min( 1.0, max( 0.0, $p ) );
	}

	/**
	 * Observed rate.
	 *
	 * @param int $successes Successes.
	 * @param int $sessions  Sessions.
	 * @return float
	 */
	public static function rate( int $successes, int $sessions ): float {
		return $sessions > 0 ? $successes / $sessions : 0.0;
	}

	/**
	 * Relative lift of B over A, as a fraction (0.25 = +25 percent). Null when A's rate is zero.
	 *
	 * @param float $rate_b B rate.
	 * @param float $rate_a A rate.
	 * @return float|null
	 */
	public static function relative_lift( float $rate_b, float $rate_a ): ?float {
		return $rate_a > 0 ? ( $rate_b - $rate_a ) / $rate_a : null;
	}

	/**
	 * Thompson allocation for two arms. The probability that B is the best arm
	 * is P(B beats A); that is the Thompson sampling selection probability.
	 * Both arms are clamped to the floor (20 percent).
	 *
	 * @param float $p_b_best P(B beats A).
	 * @param float $floor    Minimum share per arm.
	 * @return array{A: float, B: float}
	 */
	public static function allocate( float $p_b_best, float $floor = self::FLOOR ): array {
		$w_b = min( 1.0 - $floor, max( $floor, $p_b_best ) );
		return array(
			'A' => round( 1.0 - $w_b, 4 ),
			'B' => round( $w_b, 4 ),
		);
	}

	/**
	 * Apply every test rule from section 3.
	 *
	 * Each arm array: sessions (exposed sessions), intent (sessions with a
	 * tracked CTA click, form submit or tel click), leads (sessions with a
	 * form submit or tel click).
	 *
	 * @param array $a            Arm A counts.
	 * @param array $b            Arm B counts.
	 * @param float $days_running Days since the test started (fractional).
	 * @return array Verdict, reason, probabilities and the next weights.
	 */
	public static function decide( array $a, array $b, float $days_running ): array {
		$n_a = max( 0, (int) ( $a['sessions'] ?? 0 ) );
		$n_b = max( 0, (int) ( $b['sessions'] ?? 0 ) );
		$s_a = min( $n_a, max( 0, (int) ( $a['intent'] ?? 0 ) ) );
		$s_b = min( $n_b, max( 0, (int) ( $b['intent'] ?? 0 ) ) );
		$l_a = min( $n_a, max( 0, (int) ( $a['leads'] ?? 0 ) ) );
		$l_b = min( $n_b, max( 0, (int) ( $b['leads'] ?? 0 ) ) );

		$p      = self::prob_b_beats_a( $s_a, $n_a, $s_b, $n_b );
		$p_lead = self::prob_b_beats_a( $l_a, $n_a, $l_b, $n_b );
		$p_lead_worse = 1.0 - $p_lead; // P(B lead rate is lower than A lead rate).

		$out = array(
			'verdict'          => self::V_CONTINUE,
			'reason'           => '',
			'p_b_beats_a'      => $p,
			'p_lead_b_beats_a' => $p_lead,
			'guard_blocked'    => false,
			'weights'          => self::allocate( $p ),
			'days_running'     => $days_running,
			'min_run_met'      => false,
		);

		$min_met             = ( $days_running >= self::MIN_DAYS ) && ( min( $n_a, $n_b ) >= self::MIN_SESSIONS );
		$out['min_run_met']  = $min_met;

		if ( ! $min_met ) {
			if ( $days_running >= self::HARD_STOP_DAYS ) {
				$out['verdict'] = self::V_NO_DIFF;
				$out['reason']  = 'Hard stop at 14 days before the minimum run (7 days and 100 sessions per variant) was met. Keep A.';
			} else {
				$out['reason'] = 'Minimum run not met yet (7 full days and 100 sessions per variant).';
			}
			return $out;
		}

		if ( $p >= self::WIN_P ) {
			if ( $p_lead_worse >= self::GUARD_P ) {
				$out['verdict']       = self::V_GUARD_BLOCKED;
				$out['guard_blocked'] = true;
				$out['reason']        = 'B wins on intent rate but its lead rate is lower than A with 80 percent or more probability. Keep A.';
			} else {
				$out['verdict'] = self::V_SHIP_B;
				$out['reason']  = 'Probability B beats A is 90 percent or more and the lead guard passed. Ship B.';
			}
			return $out;
		}

		if ( $p <= self::LOSE_P ) {
			$out['verdict'] = self::V_KEEP_A;
			$out['reason']  = 'Probability B beats A is 10 percent or less. A wins; keep A.';
			return $out;
		}

		if ( $days_running >= self::HARD_STOP_DAYS ) {
			$out['verdict'] = self::V_NO_DIFF;
			$out['reason']  = 'Hard stop at 14 days with no winner. No difference: keep A, log it, queue a bolder test.';
			return $out;
		}

		$out['reason'] = 'No winner yet; the test keeps running.';
		return $out;
	}

	/**
	 * Auto-revert rule: if leads over the 7 days after a ship fall more than
	 * 30 percent below the prior 14-day daily average, revert.
	 *
	 * @param int   $leads_since_ship Lead sessions in the 7 days after the ship.
	 * @param float $prior_daily_avg  Average lead sessions per day in the prior 14 days.
	 * @param float $days_since_ship  Days since the ship.
	 * @return array{revert: bool, due: bool, threshold: float}
	 */
	public static function auto_revert_check( int $leads_since_ship, float $prior_daily_avg, float $days_since_ship ): array {
		$expected  = $prior_daily_avg * self::REVERT_DAYS;
		$threshold = $expected * ( 1.0 - self::REVERT_DROP );
		$due       = $days_since_ship >= self::REVERT_DAYS;
		return array(
			'due'       => $due,
			'revert'    => $due && $prior_daily_avg > 0 && $leads_since_ship < $threshold,
			'threshold' => $threshold,
		);
	}
}
