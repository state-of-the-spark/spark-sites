<?php
/**
 * Spark Living: the Goal Gate record (0.3.0).
 *
 * The plugin does not judge anything. A separate agent (the Judge) scores a
 * suggestion against the Site Charter and posts the verdict here, where it is
 * stored on the test and written to the ledger. The one rule the plugin
 * enforces itself: an agent may only queue a suggestion that has a passing
 * verdict recorded against the CURRENT charter version, and only as far as the
 * charter's autonomy level allows.
 *
 *   suggest: agents may never queue.
 *   tier1:   agents may queue risk tier 1.
 *   full:    agents may queue risk tier 1 and 2.
 *   Tier 3 (prices, legal, guarantees, claims) is never queued by an agent.
 *
 * A person clicking Queue (no `by`, or any `by` that does not start with
 * "agent:") is not gated and is recorded with gate "na".
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Spark_Living_Gate {

	public const VERDICTS = array( 'pass', 'fail', 'hold' );

	/** Statuses a verdict may be recorded on. */
	private const GATEABLE = array( 'suggested', 'queued', 'draft', 'awaiting_approval' );

	/**
	 * Does this actor name mean an agent?
	 *
	 * @param string $by The `by` value from the request.
	 * @return bool
	 */
	public static function is_agent( string $by ): bool {
		return 0 === stripos( ltrim( $by ), 'agent:' );
	}

	/**
	 * Is the caller an agent? True when `by` starts with "agent:" (the stated
	 * actor), and also whenever a signed-in user without manage_options is
	 * calling (a Builder login that holds only the build capability is an agent
	 * whatever `by` it sends). A call with no user at all (the nightly job,
	 * WP-CLI) is the engine, not an agent.
	 *
	 * @param string $by The `by` value from the request.
	 * @return bool
	 */
	public static function acts_as_agent( string $by ): bool {
		if ( self::is_agent( $by ) ) {
			return true;
		}
		return function_exists( 'is_user_logged_in' ) && is_user_logged_in() && ! current_user_can( 'manage_options' );
	}

	/**
	 * Clean an actor name.
	 *
	 * @param mixed $by Raw value.
	 * @return string Up to 80 characters.
	 */
	public static function clean_by( $by ): string {
		$by = is_scalar( $by ) ? trim( sanitize_text_field( (string) $by ) ) : '';
		return function_exists( 'mb_substr' ) ? mb_substr( $by, 0, 80 ) : substr( $by, 0, 80 );
	}

	/**
	 * Record a verdict on a suggestion.
	 *
	 * @param int   $id   Experiment ID.
	 * @param array $args verdict (pass|fail|hold), reasons (600), by, risk_tier
	 *                    (optional 1 to 3), charter_version (optional: the version
	 *                    the judge read; default the current one).
	 * @return array|WP_Error The updated experiment.
	 */
	public static function record( int $id, array $args ) {
		$exp = Spark_Living_Store::get( $id );
		if ( ! $exp ) {
			return new WP_Error( 'spark_living_missing', __( 'Test not found.', 'spark-living' ), array( 'status' => 404 ) );
		}
		if ( ! in_array( $exp['status'], self::GATEABLE, true ) ) {
			return new WP_Error( 'spark_living_state', __( 'A verdict can only be recorded on a suggested, queued or draft test.', 'spark-living' ), array( 'status' => 409 ) );
		}
		$verdict = isset( $args['verdict'] ) ? sanitize_key( (string) $args['verdict'] ) : '';
		if ( ! in_array( $verdict, self::VERDICTS, true ) ) {
			return new WP_Error( 'spark_living_gate_verdict', __( 'verdict must be pass, fail or hold.', 'spark-living' ), array( 'status' => 400 ) );
		}
		$by = self::clean_by( $args['by'] ?? '' );
		if ( '' === $by ) {
			return new WP_Error( 'spark_living_gate_by', __( 'by is required: who judged this (for example agent:judge).', 'spark-living' ), array( 'status' => 400 ) );
		}
		$reasons = isset( $args['reasons'] ) ? trim( sanitize_textarea_field( (string) $args['reasons'] ) ) : '';
		if ( '' === $reasons && 'pass' !== $verdict ) {
			return new WP_Error( 'spark_living_gate_reasons', __( 'reasons is required for a fail or hold verdict.', 'spark-living' ), array( 'status' => 400 ) );
		}
		$reasons = function_exists( 'mb_substr' ) ? mb_substr( $reasons, 0, 600 ) : substr( $reasons, 0, 600 );

		$fields = array();
		if ( isset( $args['risk_tier'] ) && '' !== $args['risk_tier'] ) {
			if ( ! is_numeric( $args['risk_tier'] ) || ! in_array( (int) $args['risk_tier'], array( 1, 2, 3 ), true ) ) {
				return new WP_Error( 'spark_living_gate_tier', __( 'risk_tier must be 1, 2 or 3.', 'spark-living' ), array( 'status' => 400 ) );
			}
			$fields['tier'] = (int) $args['risk_tier'];
		}
		$current = Spark_Living_Charter::version();
		$version = $current;
		if ( isset( $args['charter_version'] ) && '' !== $args['charter_version'] ) {
			if ( ! is_numeric( $args['charter_version'] ) || (int) $args['charter_version'] < 0 ) {
				return new WP_Error( 'spark_living_gate_version', __( 'charter_version must be a whole number.', 'spark-living' ), array( 'status' => 400 ) );
			}
			$version = (int) $args['charter_version'];
		}

		$before = array(
			'gate_verdict' => $exp['gate_verdict'],
			'risk_tier'    => (int) $exp['tier'],
		);
		$fields = array_merge(
			$fields,
			array(
				'gate_verdict'         => $verdict,
				'gate_reasons'         => $reasons,
				'gate_by'              => $by,
				'gate_at'              => Spark_Living_Util::mysql_utc(),
				'gate_charter_version' => $version,
			)
		);
		Spark_Living_Store::update( $id, $fields );

		Spark_Living_Ledger::record(
			array(
				'kind'            => 'gate_verdict',
				'subject_type'    => 'test',
				'subject_id'      => (string) $id,
				'summary'         => sprintf( /* translators: 1: verdict, 2: test name */ __( 'Goal Gate verdict %1$s recorded for "%2$s".', 'spark-living' ), $verdict, $exp['name'] ),
				'before'          => $before,
				'after'           => array(
					'gate_verdict' => $verdict,
					'risk_tier'    => isset( $fields['tier'] ) ? $fields['tier'] : (int) $exp['tier'],
				),
				'proposed_by'     => (string) $exp['suggested_by'],
				'gate_verdict'    => $verdict,
				'gate_reasons'    => $reasons,
				'gate_by'         => $by,
				'charter_version' => $version,
				'evidence'        => array(
					'gate'            => true,
					'current_charter' => $current,
				),
			)
		);
		return (array) Spark_Living_Store::get( $id );
	}

	/**
	 * Is the stored verdict recorded against an older charter than the current one?
	 *
	 * @param array $exp Experiment.
	 * @return bool
	 */
	public static function is_stale( array $exp ): bool {
		return '' !== (string) $exp['gate_verdict'] && (int) $exp['gate_charter_version'] !== Spark_Living_Charter::version();
	}

	/**
	 * The Goal Gate data of a test, under its own unambiguous key (0.4.0). The
	 * traffic check is a different thing and is reported as traffic_gate.
	 *
	 * @param array $exp Experiment.
	 * @return array{verdict: string, reasons: string, by: string, at: string, charter_version: int, stale: bool}
	 */
	public static function present( array $exp ): array {
		return array(
			'verdict'         => (string) $exp['gate_verdict'],
			'reasons'         => (string) $exp['gate_reasons'],
			'by'              => (string) $exp['gate_by'],
			'at'              => (string) $exp['gate_at'],
			'charter_version' => (int) $exp['gate_charter_version'],
			'stale'           => self::is_stale( $exp ),
		);
	}

	/**
	 * May this actor queue (or start) this test? Only an agent is checked.
	 * The same checks apply to every route an agent can use to put a test in
	 * motion: queue, create-and-start, start.
	 *
	 * @param array  $exp Experiment.
	 * @param string $by  The `by` value.
	 * @return true|WP_Error
	 */
	public static function check_queue( array $exp, string $by ) {
		if ( ! self::acts_as_agent( $by ) ) {
			return true;
		}
		$level = Spark_Living_Charter::autonomy();
		$tier  = (int) $exp['tier'];

		if ( ! Spark_Living_Charter::is_approved() ) {
			return new WP_Error( 'spark_living_charter_unapproved', __( 'Refused: the site goals (charter) are empty or not approved yet, so agents may not queue or start tests. A person approves them under Living Websites, Site charter.', 'spark-living' ), array( 'status' => 403 ) );
		}
		if ( 'suggest' === $level ) {
			return new WP_Error( 'spark_living_agent_not_allowed', __( 'Refused: the charter autonomy level is "suggest", so agents may not queue tests. A person queues them.', 'spark-living' ), array( 'status' => 403 ) );
		}
		if ( $tier >= 3 ) {
			return new WP_Error( 'spark_living_agent_tier3', __( 'Refused: risk tier 3 (prices, legal text, guarantees, claims) is never queued by an agent.', 'spark-living' ), array( 'status' => 403 ) );
		}
		if ( 'tier1' === $level && $tier > 1 ) {
			return new WP_Error( 'spark_living_agent_tier', __( 'Refused: at autonomy level "tier1" an agent may only queue risk tier 1 tests.', 'spark-living' ), array( 'status' => 403 ) );
		}
		if ( 'pass' !== $exp['gate_verdict'] ) {
			$msg = '' === (string) $exp['gate_verdict']
				? __( 'Refused: this suggestion has no Goal Gate verdict. Record one with POST /suggestions/{id}/gate first.', 'spark-living' )
				: __( 'Refused: the Goal Gate verdict on this suggestion is not a pass.', 'spark-living' );
			return new WP_Error( 'spark_living_gate_missing', $msg, array( 'status' => 403 ) );
		}
		if ( self::is_stale( $exp ) ) {
			return new WP_Error( 'spark_living_gate_stale', __( 'Refused: the passing verdict was recorded against an older version of the charter. Judge the suggestion again.', 'spark-living' ), array( 'status' => 403 ) );
		}
		return true;
	}
}
