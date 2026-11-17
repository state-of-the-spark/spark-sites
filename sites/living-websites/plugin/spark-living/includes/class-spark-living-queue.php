<?php
/**
 * Spark Living: suggested tests and the queue (0.2.0).
 *
 * A suggestion is a fully specified test that has not been queued: a
 * `living_experiment` post with status `suggested`. Queueing it moves it to
 * status `queued` (ordered by `queue_order`). The plugin still runs one test at
 * a time; when nothing is running, the nightly job starts the first queued
 * test, but only if its stored traffic count passes the traffic gate (0.4.0: 100
 * sessions per version reachable within 42 days, so 75 sessions in 14 days or
 * more, measured no more than 21 days ago). A failed gate leaves the test
 * queued. The queue never force-starts anything. At autonomy tier1 or full the
 * nightly job may also pick the best suggestion itself (auto_pick).
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Spark_Living_Queue {

	/** A traffic count older than this many days no longer opens the gate. */
	public const MAX_AGE_DAYS = 21;

	/** The dashboard shows this many suggestions at once. */
	public const SHOW_TOP = 2;

	/** Ledger row id written by the last queue(), unqueue() or dismiss() call (0 when none). */
	public static int $last_change_id = 0;

	public const MAX_RATIONALE = 600;
	public const MAX_EVIDENCE  = 5;

	/**
	 * A calendar date as YYYY-MM-DD, or an empty string.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	public static function sanitize_date( $value ): string {
		$value = trim( (string) $value );
		if ( ! preg_match( '/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m ) ) {
			return '';
		}
		return checkdate( (int) $m[2], (int) $m[3], (int) $m[1] ) ? $value : '';
	}

	/**
	 * Plain text capped at $max characters.
	 *
	 * @param mixed $value Raw text.
	 * @param int   $max   Characters.
	 * @return string
	 */
	private static function text( $value, int $max ): string {
		$value = sanitize_text_field( (string) $value );
		return function_exists( 'mb_substr' ) ? mb_substr( $value, 0, $max ) : substr( $value, 0, $max );
	}

	/**
	 * Length in characters.
	 *
	 * @param string $value Text.
	 * @return int
	 */
	private static function length( string $value ): int {
		return function_exists( 'mb_strlen' ) ? mb_strlen( $value ) : strlen( $value );
	}

	/**
	 * The page a suggestion targets: a post ID or an http(s) / root-relative URL.
	 *
	 * @param mixed $page Raw value.
	 * @return string Empty when not acceptable.
	 */
	public static function sanitize_page( $page ): string {
		if ( is_int( $page ) || ( is_string( $page ) && preg_match( '/^\d{1,10}$/', trim( $page ) ) ) ) {
			$id = (int) $page;
			return $id > 0 ? (string) $id : '';
		}
		$page = trim( (string) $page );
		if ( '' === $page || strlen( $page ) > 500 ) {
			return '';
		}
		if ( preg_match( '/^\/(?!\/)/', $page ) ) {
			return esc_url_raw( $page );
		}
		return esc_url_raw( $page, array( 'http', 'https' ) );
	}

	/**
	 * Validate the evidence list. Each item needs a source, a one-line detail
	 * and a date.
	 *
	 * @param mixed $raw Raw list.
	 * @return array[]|WP_Error
	 */
	public static function sanitize_evidence( $raw ) {
		if ( null === $raw || '' === $raw ) {
			return array();
		}
		if ( ! is_array( $raw ) ) {
			return new WP_Error( 'spark_living_evidence', __( 'evidence must be a list of {source, detail, as_of} items.', 'spark-living' ), array( 'status' => 400 ) );
		}
		$out = array();
		foreach ( array_slice( array_values( $raw ), 0, self::MAX_EVIDENCE ) as $item ) {
			$source = is_array( $item ) ? self::text( $item['source'] ?? '', 120 ) : '';
			$detail = is_array( $item ) ? self::text( $item['detail'] ?? '', 200 ) : '';
			$as_of  = is_array( $item ) ? self::sanitize_date( $item['as_of'] ?? '' ) : '';
			if ( '' === $source || '' === $detail || '' === $as_of ) {
				return new WP_Error( 'spark_living_evidence', __( 'Each evidence item needs a source, a detail and an as_of date (YYYY-MM-DD).', 'spark-living' ), array( 'status' => 400 ) );
			}
			$out[] = array(
				'source' => $source,
				'detail' => $detail,
				'as_of'  => $as_of,
			);
		}
		return $out;
	}

	/**
	 * Create a suggestion. Everything is validated before anything is written.
	 *
	 * @param array $args title (or name), hypothesis, page, device, element_type,
	 *                    target, variants, change_type, a_label, b_label,
	 *                    rationale, evidence, priority, suggested_by,
	 *                    sessions_14d, sessions_as_of.
	 * @return int|WP_Error Experiment ID.
	 */
	public static function create_suggestion( array $args ) {
		$title = self::text( $args['title'] ?? ( $args['name'] ?? '' ), 200 );
		if ( '' === $title ) {
			return new WP_Error( 'spark_living_name', __( 'A suggestion needs a title.', 'spark-living' ), array( 'status' => 400 ) );
		}
		// 0.4.0: tier 2 suggestions are accepted (an agent may queue them only at autonomy "full"); tier 3 never.
		$tier     = 1;
		$raw_tier = $args['tier'] ?? ( $args['risk_tier'] ?? null );
		if ( null !== $raw_tier && '' !== $raw_tier ) {
			if ( ! is_numeric( $raw_tier ) || ! in_array( (int) $raw_tier, array( 1, 2, 3 ), true ) ) {
				return new WP_Error( 'spark_living_tier', __( 'tier must be 1, 2 or 3.', 'spark-living' ), array( 'status' => 400 ) );
			}
			if ( 3 === (int) $raw_tier ) {
				return new WP_Error( 'spark_living_tier3', __( 'Tier 3 tests (prices, legal text, guarantees, claims) cannot be suggested.', 'spark-living' ), array( 'status' => 400 ) );
			}
			$tier = (int) $raw_tier;
		}

		$scope = isset( $args['scope'] ) ? sanitize_key( (string) $args['scope'] ) : 'page';
		$scope = '' === $scope ? 'page' : $scope;
		if ( ! in_array( $scope, Spark_Living_Store::SCOPES, true ) ) {
			return new WP_Error( 'spark_living_scope', __( 'scope must be page or sitewide.', 'spark-living' ), array( 'status' => 400 ) );
		}
		$page = self::sanitize_page( $args['page'] ?? '' );
		if ( '' === $page && 'sitewide' !== $scope ) {
			return new WP_Error( 'spark_living_page', __( 'page must be a post ID or an http(s) URL or path (a sitewide test may leave it out).', 'spark-living' ), array( 'status' => 400 ) );
		}
		$payoff = self::sanitize_payoff( $args );
		if ( is_wp_error( $payoff ) ) {
			return $payoff;
		}

		$device = isset( $args['device'] ) ? sanitize_key( (string) $args['device'] ) : 'all';
		$device = '' === $device ? 'all' : $device;
		if ( ! in_array( $device, Spark_Living_Store::DEVICES, true ) ) {
			return new WP_Error( 'spark_living_device', __( 'device must be all, mobile or desktop.', 'spark-living' ), array( 'status' => 400 ) );
		}

		$raw_type = isset( $args['change_type'] ) ? trim( (string) $args['change_type'] ) : '';
		if ( '' !== $raw_type && '' === Spark_Living_Util::sanitize_change_type( $raw_type ) ) {
			return new WP_Error( 'spark_living_change_type', __( 'change_type must be wording, color, shape, placement, visibility, style or block.', 'spark-living' ), array( 'status' => 400 ) );
		}

		$rationale = isset( $args['rationale'] ) ? trim( sanitize_textarea_field( (string) $args['rationale'] ) ) : '';
		if ( '' === $rationale ) {
			return new WP_Error( 'spark_living_rationale', __( 'A suggestion needs a rationale: what was seen on the page.', 'spark-living' ), array( 'status' => 400 ) );
		}
		if ( self::length( $rationale ) > self::MAX_RATIONALE ) {
			return new WP_Error( 'spark_living_rationale_long', sprintf( /* translators: %d: characters */ __( 'rationale is limited to %d characters.', 'spark-living' ), self::MAX_RATIONALE ), array( 'status' => 400 ) );
		}

		$evidence = self::sanitize_evidence( $args['evidence'] ?? array() );
		if ( is_wp_error( $evidence ) ) {
			return $evidence;
		}

		$sessions = $args['sessions_14d'] ?? null;
		if ( null === $sessions || '' === $sessions || ! is_numeric( $sessions ) || (float) $sessions < 0 || (float) $sessions !== floor( (float) $sessions ) ) {
			return new WP_Error( 'spark_living_sessions_invalid', __( 'sessions_14d is required: a whole number of zero or more (sessions in the last 14 days on the target page and device).', 'spark-living' ), array( 'status' => 400 ) );
		}
		$as_of = self::sanitize_date( $args['sessions_as_of'] ?? '' );
		if ( '' === $as_of || $as_of > gmdate( 'Y-m-d', time() + DAY_IN_SECONDS ) ) {
			return new WP_Error( 'spark_living_sessions_as_of', __( 'sessions_as_of is required: the date (YYYY-MM-DD, not in the future) the count was measured.', 'spark-living' ), array( 'status' => 400 ) );
		}

		$priority = 0;
		if ( isset( $args['priority'] ) && '' !== $args['priority'] ) {
			if ( ! is_numeric( $args['priority'] ) || (float) $args['priority'] < 1 || (float) $args['priority'] !== floor( (float) $args['priority'] ) ) {
				return new WP_Error( 'spark_living_priority', __( 'priority must be a whole number of 1 or more (1 is first).', 'spark-living' ), array( 'status' => 400 ) );
			}
			$priority = (int) $args['priority'];
		} else {
			foreach ( self::suggestions() as $existing ) {
				$priority = max( $priority, (int) $existing['priority'] );
			}
			++$priority;
		}

		$id = Spark_Living_Store::create(
			array(
				'name'         => $title,
				'element_type' => $args['element_type'] ?? 'selector',
				'target'       => $args['target'] ?? '',
				'hypothesis'   => $args['hypothesis'] ?? '',
				'variants'     => $args['variants'] ?? array(),
				'tier'         => $tier,
				'scope'        => $scope,
				'device'       => $device,
				'change_type'  => $raw_type,
				'a_label'      => $args['a_label'] ?? '',
				'b_label'      => $args['b_label'] ?? '',
			)
		);
		if ( is_wp_error( $id ) ) {
			return $id;
		}
		Spark_Living_Store::update(
			$id,
			array_merge(
				array(
					'status'         => Spark_Living_Store::STATUS_SUGGESTED,
					'page'           => 'sitewide' === $scope ? '' : $page,
					'rationale'      => $rationale,
					'evidence'       => $evidence,
					'priority'       => $priority,
					'suggested_by'   => self::text( $args['suggested_by'] ?? '', 80 ),
					'suggested_at'   => Spark_Living_Util::mysql_utc(),
					'sessions_14d'   => (int) $sessions,
					'sessions_as_of' => $as_of,
				),
				$payoff,
				array( 'payoff_check' => self::payoff_check( (int) $sessions, $payoff['payoff_inputs'] ?? array() ) )
			)
		);
		$by = Spark_Living_Gate::clean_by( $args['by'] ?? '' );
		$by = '' !== $by ? $by : self::text( $args['suggested_by'] ?? '', 80 );
		Spark_Living_Ledger::record(
			array(
				'kind'         => 'test_suggested',
				'subject_type' => 'test',
				'subject_id'   => (string) $id,
				'summary'      => sprintf( /* translators: %s: test title */ __( 'Test suggested: "%s".', 'spark-living' ), $title ),
				'after'        => array(
					'status'   => 'suggested',
					'page'     => 'sitewide' === $scope ? '' : $page,
					'scope'    => $scope,
					'device'   => $device,
					'priority' => $priority,
					'tier'     => $tier,
				),
				'proposed_by'  => '' !== $by ? $by : 'owner',
				'evidence'     => array(
					'rationale'    => $rationale,
					'items'        => $evidence,
					'sessions_14d' => (int) $sessions,
					'projected_days' => Spark_Living_Stats::projected_days( (float) $sessions ),
					'payoff_score' => $payoff['payoff_score'] ?? null,
				),
			)
		);
		return (int) $id;
	}

	/**
	 * Validate the payoff fields of a request. Only the keys that are present are
	 * returned. A null or empty payoff_score clears it.
	 *
	 * @param array $args Request body.
	 * @return array|WP_Error payoff_score, payoff_inputs, payoff_version (those present).
	 */
	public static function sanitize_payoff( array $args ) {
		$out = array();
		if ( array_key_exists( 'payoff_score', $args ) ) {
			$v = $args['payoff_score'];
			if ( null === $v || '' === $v ) {
				$out['payoff_score'] = '';
			} elseif ( ! is_numeric( $v ) || (float) $v < 0 || (float) $v > 1000000 ) {
				return new WP_Error( 'spark_living_payoff_score', __( 'payoff_score must be a number of zero or more.', 'spark-living' ), array( 'status' => 400 ) );
			} else {
				$out['payoff_score'] = round( (float) $v, 6 );
			}
		}
		if ( array_key_exists( 'payoff_version', $args ) ) {
			$v = trim( (string) ( is_scalar( $args['payoff_version'] ) ? $args['payoff_version'] : '' ) );
			if ( '' !== $v && ! preg_match( '/^[A-Za-z0-9._ -]{1,40}$/', $v ) ) {
				return new WP_Error( 'spark_living_payoff_version', __( 'payoff_version must be up to 40 letters, digits, dots, dashes or spaces.', 'spark-living' ), array( 'status' => 400 ) );
			}
			$out['payoff_version'] = $v;
		}
		if ( array_key_exists( 'payoff_inputs', $args ) ) {
			$raw = $args['payoff_inputs'];
			if ( null === $raw || '' === $raw || array() === $raw ) {
				$out['payoff_inputs'] = array();
			} elseif ( ! is_array( $raw ) ) {
				return new WP_Error( 'spark_living_payoff_inputs', __( 'payoff_inputs must be an object.', 'spark-living' ), array( 'status' => 400 ) );
			} else {
				$clean = array();
				// key => [min, max] (null = unbounded above).
				$numeric = array(
					'sessions_reaching' => array( 0, 100000000 ),
					'proximity'         => array( 0, 1 ),
					'expected_lift'     => array( 0, 10 ),
					'days_to_result'    => array( 0, 100000 ),
					'sessions_14d'      => array( 0, 100000000 ),
					'reach_share'       => array( 0, 1 ),
					'baseline_rate'     => array( 0, 1 ),
					'power_factor'      => array( 0, 1 ),
					'library_n'         => array( 0, 100000 ),
				);
				foreach ( $numeric as $k => $range ) {
					if ( ! array_key_exists( $k, $raw ) || null === $raw[ $k ] || '' === $raw[ $k ] ) {
						continue;
					}
					if ( ! is_numeric( $raw[ $k ] ) || (float) $raw[ $k ] < $range[0] || (float) $raw[ $k ] > $range[1] ) {
						return new WP_Error( 'spark_living_payoff_inputs', sprintf( /* translators: %s: field */ __( 'payoff_inputs.%s is not a valid number.', 'spark-living' ), $k ), array( 'status' => 400 ) );
					}
					$clean[ $k ] = round( (float) $raw[ $k ], 6 );
				}
				foreach ( array( 'traffic_class', 'change_type' ) as $k ) {
					if ( isset( $raw[ $k ] ) && '' !== (string) $raw[ $k ] ) {
						$val = sanitize_key( (string) $raw[ $k ] );
						if ( '' === $val || strlen( $val ) > 40 ) {
							return new WP_Error( 'spark_living_payoff_inputs', sprintf( /* translators: %s: field */ __( 'payoff_inputs.%s is not valid.', 'spark-living' ), $k ), array( 'status' => 400 ) );
						}
						$clean[ $k ] = $val;
					}
				}
				$out['payoff_inputs'] = $clean;
			}
		}
		return $out;
	}

	/**
	 * The plugin's own figures for a suggestion's days to result, stored next to
	 * the agent's. Days to result: the days until each version reaches 100
	 * sessions at the stated traffic (7 at the least); the plugin works from its
	 * own rules (50/50 split, 10 percent holdout, 14 to 42 day stop).
	 *
	 * @param int   $sessions_14d Sessions in 14 days (the whole site for a sitewide test).
	 * @param array $inputs       payoff_inputs as stored.
	 * @return array
	 */
	public static function payoff_check( int $sessions_14d, array $inputs = array() ): array {
		$days      = Spark_Living_Stats::projected_days( (float) $sessions_14d );
		$result    = null === $days ? null : max( Spark_Living_Stats::MIN_DAYS, $days );
		$reachable = Spark_Living_Stats::reachable( (float) $sessions_14d );
		$agent     = isset( $inputs['days_to_result'] ) && is_numeric( $inputs['days_to_result'] ) ? (float) $inputs['days_to_result'] : null;
		return array(
			'sessions_14d'         => $sessions_14d,
			'days_to_result'       => $result,
			'stop_days'            => Spark_Living_Stats::stop_days( (float) $sessions_14d ),
			'reachable'            => $reachable,
			'traffic_class'        => $reachable ? 'decidable' : 'below_minimum',
			'agent_days_to_result' => $agent,
			'agrees'               => ( null === $agent || null === $result ) ? null : abs( $agent - $result ) <= 1.0,
			'computed_at'          => Spark_Living_Util::mysql_utc(),
		);
	}

	/**
	 * Edit the payoff fields (and refresh the traffic count or the priority) of a
	 * suggestion that has not started. PATCH /suggestions/{id}.
	 *
	 * @param int    $id   Experiment ID.
	 * @param array  $args payoff_score, payoff_inputs, payoff_version, sessions_14d with sessions_as_of, priority.
	 * @param string $by   Who is editing.
	 * @return array|WP_Error The updated experiment.
	 */
	public static function update_suggestion( int $id, array $args, string $by = '' ) {
		$exp = self::expect( $id, array( Spark_Living_Store::STATUS_SUGGESTED, Spark_Living_Store::STATUS_QUEUED ) );
		if ( is_wp_error( $exp ) ) {
			return $exp;
		}
		$by     = Spark_Living_Gate::clean_by( $by );
		$fields = self::sanitize_payoff( $args );
		if ( is_wp_error( $fields ) ) {
			return $fields;
		}
		if ( array_key_exists( 'sessions_14d', $args ) || array_key_exists( 'sessions_as_of', $args ) ) {
			$s = $args['sessions_14d'] ?? null;
			if ( null === $s || '' === $s || ! is_numeric( $s ) || (float) $s < 0 || (float) $s !== floor( (float) $s ) ) {
				return new WP_Error( 'spark_living_sessions_invalid', __( 'sessions_14d must be a whole number of zero or more.', 'spark-living' ), array( 'status' => 400 ) );
			}
			$as_of = self::sanitize_date( $args['sessions_as_of'] ?? '' );
			if ( '' === $as_of || $as_of > gmdate( 'Y-m-d', time() + DAY_IN_SECONDS ) ) {
				return new WP_Error( 'spark_living_sessions_as_of', __( 'Send sessions_as_of (YYYY-MM-DD, not in the future) together with sessions_14d.', 'spark-living' ), array( 'status' => 400 ) );
			}
			$fields['sessions_14d']   = (int) $s;
			$fields['sessions_as_of'] = $as_of;
		}
		if ( isset( $args['priority'] ) && '' !== $args['priority'] ) {
			if ( ! is_numeric( $args['priority'] ) || (float) $args['priority'] < 1 || (float) $args['priority'] !== floor( (float) $args['priority'] ) ) {
				return new WP_Error( 'spark_living_priority', __( 'priority must be a whole number of 1 or more (1 is first).', 'spark-living' ), array( 'status' => 400 ) );
			}
			$fields['priority'] = (int) $args['priority'];
		}
		if ( ! $fields ) {
			return new WP_Error( 'spark_living_nothing', __( 'Send at least one of payoff_score, payoff_inputs, payoff_version, sessions_14d with sessions_as_of, priority.', 'spark-living' ), array( 'status' => 400 ) );
		}
		$inputs = array_key_exists( 'payoff_inputs', $fields ) ? $fields['payoff_inputs'] : $exp['payoff_inputs'];
		$sess   = array_key_exists( 'sessions_14d', $fields ) ? (int) $fields['sessions_14d'] : (int) $exp['sessions_14d'];
		$fields['payoff_check'] = self::payoff_check( $sess, is_array( $inputs ) ? $inputs : array() );
		$before = array(
			'payoff_score'   => $exp['payoff_score'],
			'payoff_version' => $exp['payoff_version'],
			'sessions_14d'   => $exp['sessions_14d'],
			'priority'       => $exp['priority'],
		);
		Spark_Living_Store::update( $id, $fields );
		$new = (array) Spark_Living_Store::get( $id );
		Spark_Living_Ledger::record(
			array(
				'kind'         => 'suggestion_updated',
				'subject_type' => 'test',
				'subject_id'   => (string) $id,
				'summary'      => sprintf( /* translators: %s: test name */ __( 'Suggestion updated: "%s".', 'spark-living' ), $exp['name'] ),
				'before'       => $before,
				'after'        => array(
					'payoff_score'   => $new['payoff_score'],
					'payoff_version' => $new['payoff_version'],
					'sessions_14d'   => $new['sessions_14d'],
					'priority'       => $new['priority'],
				),
				'proposed_by'  => '' !== $by ? $by : 'owner',
				'evidence'     => array( 'fields' => array_keys( $fields ), 'payoff_check' => $new['payoff_check'] ),
			)
		);
		return $new;
	}

	/**
	 * Rank of a suggestion by its Goal Gate verdict: pass 0, not checked (or a
	 * verdict recorded against an older charter) 1, hold 2, fail 3.
	 *
	 * @param array $exp Experiment.
	 * @return int
	 */
	public static function gate_rank( array $exp ): int {
		$v = (string) $exp['gate_verdict'];
		if ( '' === $v || Spark_Living_Gate::is_stale( $exp ) ) {
			return 1;
		}
		$map = array( 'pass' => 0, 'hold' => 2, 'fail' => 3 );
		return $map[ $v ] ?? 1;
	}

	/**
	 * A selector in one comparable shape.
	 *
	 * @param string $selector CSS selector.
	 * @return string
	 */
	private static function norm_selector( string $selector ): string {
		$s = strtolower( trim( preg_replace( '/\s+/', ' ', $selector ) ) );
		return (string) preg_replace( '/\s*([>+~,])\s*/', '$1', $s );
	}

	/**
	 * Do two tests cover some of the same pages and devices?
	 *
	 * @param array $a Experiment.
	 * @param array $b Experiment.
	 * @return bool
	 */
	private static function areas_overlap( array $a, array $b ): bool {
		if ( 'all' !== $a['device'] && 'all' !== $b['device'] && $a['device'] !== $b['device'] ) {
			return false;
		}
		if ( 'sitewide' === $a['scope'] || 'sitewide' === $b['scope'] ) {
			return true;
		}
		// An unstated page means "anywhere". "/" is the homepage, a page in its own right.
		$pa = (string) $a['page'];
		$pb = (string) $b['page'];
		$pa = ( '' === $pa || '/' === $pa ) ? $pa : rtrim( $pa, '/' );
		$pb = ( '' === $pb || '/' === $pb ) ? $pb : rtrim( $pb, '/' );
		return '' === $pa || '' === $pb || $pa === $pb;
	}

	/**
	 * Is the element this test changes already held by something else? A shipped
	 * winner on the same element and the same pages and devices holds it for good
	 * (until it is reverted); a running test holds it while it runs. One test can
	 * touch a given element at a time.
	 *
	 * @param array $exp             Experiment.
	 * @param bool  $include_running Count the running test (true when starting, false when queueing: a queued test waits behind it).
	 * @return array|null The experiment that holds the element.
	 */
	public static function selector_conflict( array $exp, bool $include_running = true ): ?array {
		if ( 'selector' !== ( $exp['element_type'] ?? '' ) ) {
			return null;
		}
		$sel = self::norm_selector( (string) $exp['target'] );
		if ( '' === $sel ) {
			return null;
		}
		foreach ( Spark_Living_Store::all() as $other ) {
			if ( (int) $other['id'] === (int) $exp['id'] || 'selector' !== $other['element_type'] ) {
				continue;
			}
			$holds = $other['promoted'] || ( $include_running && Spark_Living_Store::STATUS_RUNNING === $other['status'] );
			if ( ! $holds || self::norm_selector( (string) $other['target'] ) !== $sel || ! self::areas_overlap( $exp, $other ) ) {
				continue;
			}
			return $other;
		}
		return null;
	}

	/**
	 * Suggested tests: Goal Gate verdict first (pass, then not checked, then hold,
	 * then fail), then payoff score, then the old priority, then oldest first.
	 *
	 * @return array[]
	 */
	public static function suggestions(): array {
		$rows = Spark_Living_Store::all(
			array(
				array(
					'key'   => '_spark_living_status',
					'value' => Spark_Living_Store::STATUS_SUGGESTED,
				),
			)
		);
		usort(
			$rows,
			static function ( array $a, array $b ): int {
				// Goal Gate verdict first (pass, not checked, hold, fail), then payoff score (highest first, unscored last), then the old priority.
				$ka = array( self::gate_rank( $a ), null === $a['payoff_score'] ? 1 : 0, -1 * (float) ( $a['payoff_score'] ?? 0 ), $a['priority'], $a['id'] );
				$kb = array( self::gate_rank( $b ), null === $b['payoff_score'] ? 1 : 0, -1 * (float) ( $b['payoff_score'] ?? 0 ), $b['priority'], $b['id'] );
				return $ka <=> $kb;
			}
		);
		return $rows;
	}

	/**
	 * Queued tests in the order they will start.
	 *
	 * @return array[]
	 */
	public static function queue_list(): array {
		$rows = Spark_Living_Store::all(
			array(
				array(
					'key'   => '_spark_living_status',
					'value' => Spark_Living_Store::STATUS_QUEUED,
				),
			)
		);
		usort(
			$rows,
			static function ( array $a, array $b ): int {
				return array( $a['queue_order'], $a['id'] ) <=> array( $b['queue_order'], $b['id'] );
			}
		);
		return $rows;
	}

	/**
	 * Fetch a test that must be in one of the given statuses.
	 *
	 * @param int      $id       Experiment ID.
	 * @param string[] $statuses Allowed statuses.
	 * @return array|WP_Error
	 */
	private static function expect( int $id, array $statuses ) {
		$exp = Spark_Living_Store::get( $id );
		if ( ! $exp ) {
			return new WP_Error( 'spark_living_missing', __( 'Test not found.', 'spark-living' ), array( 'status' => 404 ) );
		}
		if ( ! in_array( $exp['status'], $statuses, true ) ) {
			return new WP_Error( 'spark_living_state', __( 'That test is not in the right state for this action.', 'spark-living' ), array( 'status' => 409 ) );
		}
		return $exp;
	}

	/**
	 * Suggested to queued, at the end of the line. Never starts anything.
	 *
	 * @param int    $id Experiment ID.
	 * @param string $by Who is queueing it: empty or owner for a person; "agent:..." (or any caller that cannot manage options) is checked against the Goal Gate, the approved charter and the autonomy level; "engine:auto-pick" is the nightly job.
	 * @param array  $extra_evidence Extra evidence for the ledger row.
	 * @return array|WP_Error The updated experiment.
	 */
	public static function queue( int $id, string $by = '', array $extra_evidence = array() ) {
		self::$last_change_id = 0;
		$exp = self::expect( $id, array( Spark_Living_Store::STATUS_SUGGESTED ) );
		if ( is_wp_error( $exp ) ) {
			return $exp;
		}
		$by    = Spark_Living_Gate::clean_by( $by );
		$auto  = ( 'engine:auto-pick' === $by );
		$agent = ! $auto && Spark_Living_Gate::acts_as_agent( $by );
		$clash = self::selector_conflict( $exp, false );
		if ( $clash ) {
			return new WP_Error( 'spark_living_selector_in_use', sprintf( /* translators: 1: selector, 2: test name, 3: test id */ __( 'Not queued: the element %1$s already carries the shipped winner of "%2$s" (test %3$d). Only one test can touch a given element at a time; revert that winner first.', 'spark-living' ), (string) $exp['target'], $clash['name'], (int) $clash['id'] ), array( 'status' => 409 ) );
		}
		if ( $agent ) {
			// An agent may queue only what the Goal Gate passed against the current charter, within the autonomy level.
			$ok = Spark_Living_Gate::check_queue( $exp, $by );
			if ( is_wp_error( $ok ) ) {
				self::$last_change_id = Spark_Living_Ledger::record(
					array(
						'kind'            => 'queue_attempt',
						'subject_type'    => 'test',
						'subject_id'      => (string) $id,
						'summary'         => sprintf( /* translators: 1: actor, 2: test name */ __( '%1$s tried to queue "%2$s" and was refused.', 'spark-living' ), '' !== $by ? $by : __( 'A caller without the manage-options permission', 'spark-living' ), $exp['name'] ),
						'before'          => array( 'status' => 'suggested' ),
						'proposed_by'     => $by,
						'gate_verdict'    => in_array( $exp['gate_verdict'], Spark_Living_Ledger::VERDICTS, true ) ? $exp['gate_verdict'] : 'na',
						'gate_reasons'    => $ok->get_error_message(),
						'gate_by'         => (string) $exp['gate_by'],
						'charter_version' => (int) $exp['gate_charter_version'],
						'evidence'        => array(
							'refused'        => $ok->get_error_code(),
							'autonomy_level' => Spark_Living_Charter::autonomy(),
							'risk_tier'      => (int) $exp['tier'],
						),
						'status'          => 'failed',
					)
				);
				return $ok;
			}
		}
		$order = 0;
		foreach ( self::queue_list() as $q ) {
			$order = max( $order, (int) $q['queue_order'] );
		}
		Spark_Living_Store::update(
			$id,
			array(
				'status'      => Spark_Living_Store::STATUS_QUEUED,
				'queued_at'   => Spark_Living_Util::mysql_utc(),
				'queue_order' => $order + 1,
			)
		);
		self::$last_change_id = Spark_Living_Ledger::record(
			array(
				'kind'            => 'test_queued',
				'subject_type'    => 'test',
				'subject_id'      => (string) $id,
				'summary'         => sprintf( /* translators: %s: test name */ __( 'Test queued: "%s".', 'spark-living' ), $exp['name'] ),
				'before'          => array( 'status' => 'suggested' ),
				'after'           => array(
					'status'      => 'queued',
					'queue_order' => $order + 1,
				),
				'proposed_by'     => ( $agent || $auto ) ? ( '' !== $by ? $by : 'agent' ) : ( '' !== $by ? $by : 'owner' ),
				'gate_verdict'    => ( $agent || $auto ) ? 'pass' : 'na',
				'gate_reasons'    => ( $agent || $auto ) ? (string) $exp['gate_reasons'] : '',
				'gate_by'         => ( $agent || $auto ) ? (string) $exp['gate_by'] : '',
				'charter_version' => ( $agent || $auto ) ? (int) $exp['gate_charter_version'] : Spark_Living_Charter::version(),
				'evidence'        => $extra_evidence,
				'undo'            => array(
					'action'        => 'unqueue',
					'experiment_id' => $id,
				),
			)
		);
		return (array) Spark_Living_Store::get( $id );
	}

	/**
	 * Queued back to suggested.
	 *
	 * @param int $id Experiment ID.
	 * @return array|WP_Error
	 */
	public static function unqueue( int $id, string $by = '', array $opts = array() ) {
		self::$last_change_id = 0;
		$exp = self::expect( $id, array( Spark_Living_Store::STATUS_QUEUED ) );
		if ( is_wp_error( $exp ) ) {
			return $exp;
		}
		$by = Spark_Living_Gate::clean_by( $by );
		Spark_Living_Store::update(
			$id,
			array(
				'status'      => Spark_Living_Store::STATUS_SUGGESTED,
				'queued_at'   => '',
				'queue_order' => 0,
			)
		);
		self::$last_change_id = Spark_Living_Ledger::record(
			array(
				'kind'         => 'test_unqueued',
				'subject_type' => 'test',
				'subject_id'   => (string) $id,
				'summary'      => isset( $opts['undo_of'] )
					? sprintf( /* translators: 1: test name, 2: change id */ __( 'Undo: "%1$s" taken off the queue and back in Suggested tests (undo of change #%2$d).', 'spark-living' ), $exp['name'], (int) $opts['undo_of'] )
					: sprintf( /* translators: %s: test name */ __( 'Test taken off the queue: "%s".', 'spark-living' ), $exp['name'] ),
				'before'       => array( 'status' => 'queued' ),
				'after'        => array( 'status' => 'suggested' ),
				'proposed_by'  => '' !== $by ? $by : 'owner',
				'evidence'     => isset( $opts['undo_of'] ) ? array( 'undo_of' => (int) $opts['undo_of'] ) : array(),
			)
		);
		return (array) Spark_Living_Store::get( $id );
	}

	/**
	 * Suggested (or queued) to dismissed. The record is kept.
	 *
	 * @param int $id Experiment ID.
	 * @return array|WP_Error
	 */
	public static function dismiss( int $id, string $by = '' ) {
		self::$last_change_id = 0;
		$exp = self::expect( $id, array( Spark_Living_Store::STATUS_SUGGESTED, Spark_Living_Store::STATUS_QUEUED ) );
		if ( is_wp_error( $exp ) ) {
			return $exp;
		}
		$by = Spark_Living_Gate::clean_by( $by );
		Spark_Living_Store::update(
			$id,
			array(
				'status'       => Spark_Living_Store::STATUS_DISMISSED,
				'dismissed_at' => Spark_Living_Util::mysql_utc(),
				'queued_at'    => '',
				'queue_order'  => 0,
			)
		);
		self::$last_change_id = Spark_Living_Ledger::record(
			array(
				'kind'         => 'test_dismissed',
				'subject_type' => 'test',
				'subject_id'   => (string) $id,
				'summary'      => sprintf( /* translators: %s: test name */ __( 'Test dismissed: "%s".', 'spark-living' ), $exp['name'] ),
				'before'       => array( 'status' => $exp['status'] ),
				'after'        => array( 'status' => 'dismissed' ),
				'proposed_by'  => '' !== $by ? $by : 'owner',
			)
		);
		return (array) Spark_Living_Store::get( $id );
	}

	/**
	 * Whole days between the date the count was measured and today (UTC).
	 *
	 * @param string $as_of YYYY-MM-DD.
	 * @return int|null Null when there is no valid date.
	 */
	public static function age_days( string $as_of ): ?int {
		$ts = '' === $as_of ? 0 : (int) strtotime( $as_of . ' 00:00:00 UTC' );
		if ( ! $ts ) {
			return null;
		}
		return (int) floor( ( strtotime( gmdate( 'Y-m-d' ) . ' 00:00:00 UTC' ) - $ts ) / DAY_IN_SECONDS );
	}

	/**
	 * The traffic facts for a suggestion or queued test (0.4.0: days to a result,
	 * not a fixed session count).
	 *
	 * @param array $exp Experiment.
	 * @return array{sessions: int, as_of: string, age_days: int|null, meets_min: bool, reachable: bool, fresh: bool, min: int, max_age_days: int, projected_days: int|null, days_to_result: int|null, stop_days: int, over_limit: bool, scope: string}
	 */
	public static function traffic( array $exp ): array {
		$min  = Spark_Living_Stats::ELIGIBILITY_SESSIONS;
		$age  = self::age_days( (string) $exp['sessions_as_of'] );
		$days = Spark_Living_Stats::projected_days( (float) $exp['sessions_14d'] );
		$ok   = Spark_Living_Stats::reachable( (float) $exp['sessions_14d'] );
		return array(
			'sessions'       => (int) $exp['sessions_14d'],
			'as_of'          => (string) $exp['sessions_as_of'],
			'age_days'       => $age,
			'meets_min'      => $ok, // Kept under its old name: can a result be reached within 42 days?
			'reachable'      => $ok,
			'fresh'          => ( null !== $age && $age <= self::MAX_AGE_DAYS ),
			'min'            => $min,
			'max_age_days'   => self::MAX_AGE_DAYS,
			'projected_days' => $days,
			'days_to_result' => null === $days ? null : max( Spark_Living_Stats::MIN_DAYS, $days ),
			'stop_days'      => Spark_Living_Stats::stop_days( (float) $exp['sessions_14d'] ),
			'over_limit'     => ! $ok,
			'scope'          => (string) $exp['scope'],
		);
	}

	/**
	 * Would the nightly job start this test right now (ignoring whether
	 * another test is running)? The traffic gate (not the Goal Gate).
	 *
	 * @param array $exp Queued experiment.
	 * @return array{ok: bool, code: string, message: string}
	 */
	public static function gate( array $exp ): array {
		$t = self::traffic( $exp );
		if ( ! $t['reachable'] ) {
			return array(
				'ok'      => false,
				'code'    => 'below_minimum',
				'message' => __( 'Waiting: at this traffic a result would take more than 42 days', 'spark-living' ),
			);
		}
		if ( ! $t['fresh'] ) {
			return array(
				'ok'      => false,
				'code'    => 'out_of_date',
				'message' => __( 'Waiting: traffic count is out of date', 'spark-living' ),
			);
		}
		return array(
			'ok'      => true,
			'code'    => 'ready',
			'message' => '',
		);
	}

	/**
	 * Nightly: when nothing is running, start the first queued test if its
	 * gate is open. Strictly first in line: a blocked head is not skipped.
	 * Never forces a start.
	 *
	 * @return array{started: bool, id: int, reason: string}|null Null when the queue is empty or a test is running.
	 */
	public static function start_next(): ?array {
		if ( Spark_Living_Store::get_running() ) {
			return null;
		}
		$queue = self::queue_list();
		if ( ! $queue ) {
			return null;
		}
		$head = $queue[0];
		$gate = self::gate( $head );
		if ( ! $gate['ok'] ) {
			return array(
				'started' => false,
				'id'      => (int) $head['id'],
				'reason'  => $gate['code'],
			);
		}
		$started = Spark_Living_Store::start(
			(int) $head['id'],
			array(
				'forced_start'       => false,
				'start_sessions_14d' => (int) $head['sessions_14d'],
				'by'                 => 'engine',
			)
		);
		if ( is_wp_error( $started ) ) {
			return array(
				'started' => false,
				'id'      => (int) $head['id'],
				'reason'  => $started->get_error_code(),
			);
		}
		return array(
			'started' => true,
			'id'      => (int) $head['id'],
			'reason'  => 'started',
		);
	}

	/**
	 * What the nightly job would pick for itself, and why not when it would not
	 * (0.4.0). Reads only; writes nothing. Used by auto_pick() and GET /state.
	 *
	 * @return array{autonomy: string, charter_approved: bool, would_pick: int|null, reason: string, skipped: array[]}
	 */
	public static function auto_pick_plan(): array {
		$level = Spark_Living_Charter::autonomy();
		$out   = array(
			'autonomy'         => $level,
			'charter_approved' => Spark_Living_Charter::is_approved(),
			'would_pick'       => null,
			'reason'           => '',
			'skipped'          => array(),
		);
		if ( 'suggest' === $level ) {
			$out['reason'] = 'Autonomy level is "suggest": the nightly job never picks a test; a person queues them.';
			return $out;
		}
		if ( ! $out['charter_approved'] ) {
			$out['reason'] = 'The charter is empty or not approved: nothing is picked until a person approves the site goals.';
			return $out;
		}
		if ( Spark_Living_Store::get_running() ) {
			$out['reason'] = 'A test is running.';
			return $out;
		}
		if ( self::queue_list() ) {
			$out['reason'] = 'A test is already queued.';
			return $out;
		}
		$best = null;
		foreach ( self::suggestions() as $exp ) {
			$why = '';
			if ( 'pass' !== (string) $exp['gate_verdict'] ) {
				$why = '' === (string) $exp['gate_verdict'] ? 'no Goal Gate verdict' : 'Goal Gate verdict is ' . $exp['gate_verdict'];
			} elseif ( Spark_Living_Gate::is_stale( $exp ) ) {
				$why = 'Goal Gate verdict is against an older charter version';
			} elseif ( (int) $exp['tier'] >= 3 || ( 'tier1' === $level && (int) $exp['tier'] > 1 ) ) {
				$why = 'risk tier ' . (int) $exp['tier'] . ' is not allowed at autonomy "' . $level . '"';
			} elseif ( null === $exp['payoff_score'] ) {
				$why = 'no payoff score recorded';
			} else {
				$g = self::gate( $exp );
				if ( ! $g['ok'] ) {
					$why = 'traffic gate: ' . $g['code'];
				} elseif ( self::selector_conflict( $exp, true ) ) {
					$why = 'its element is held by another test';
				}
			}
			if ( '' !== $why ) {
				$out['skipped'][] = array( 'id' => (int) $exp['id'], 'reason' => $why );
				continue;
			}
			if ( null === $best || (float) $exp['payoff_score'] > (float) $best['payoff_score'] ) {
				$best = $exp; // suggestions() is sorted, so a tie keeps the better-placed one.
			}
		}
		if ( ! $best ) {
			$out['reason'] = 'No suggestion qualifies.';
			return $out;
		}
		$out['would_pick'] = (int) $best['id'];
		$out['reason']     = 'Highest payoff score among the suggestions that passed the Goal Gate against the current charter, are allowed at this autonomy level and can reach a result within 42 days.';
		return $out;
	}

	/**
	 * Nightly (0.4.0): at autonomy tier1 or full, when nothing is running and
	 * nothing is queued, queue the best qualifying suggestion. It is recorded
	 * in the ledger as proposed by engine:auto-pick, then started by start_next()
	 * on the usual path. At "suggest", or while the charter is unapproved, never.
	 *
	 * @return array|null The queued experiment, or null when nothing was picked.
	 */
	public static function auto_pick(): ?array {
		$plan = self::auto_pick_plan();
		if ( null === $plan['would_pick'] ) {
			return null;
		}
		$exp  = (array) Spark_Living_Store::get( (int) $plan['would_pick'] );
		$done = self::queue(
			(int) $plan['would_pick'],
			'engine:auto-pick',
			array(
				'auto_pick'    => true,
				'payoff_score' => $exp['payoff_score'],
				'autonomy'     => $plan['autonomy'],
				'skipped'      => $plan['skipped'],
				'rule'         => $plan['reason'],
			)
		);
		return is_wp_error( $done ) ? null : $done;
	}

	/**
	 * Shape one suggestion or queued test for REST.
	 *
	 * @param array $exp      Experiment.
	 * @param int   $position 1-based place in the queue (0 when not queued).
	 * @return array
	 */
	public static function present( array $exp, int $position = 0 ): array {
		$out                   = Spark_Living_Rest::present_experiment( $exp );
		$out['traffic']        = self::traffic( $exp );
		$out['traffic_gate']   = self::gate( $exp );
		$out['gate']           = $out['traffic_gate']; // Deprecated alias (0.4.0): this is the traffic check, not the Goal Gate. Removed after one version.
		$out['goal_gate']      = Spark_Living_Gate::present( $exp );
		$out['payoff']         = array(
			'score'        => $exp['payoff_score'],
			'inputs'       => $exp['payoff_inputs'],
			'version'      => $exp['payoff_version'],
			'plugin_check' => $exp['payoff_check'] ? $exp['payoff_check'] : self::payoff_check( (int) $exp['sessions_14d'], (array) $exp['payoff_inputs'] ),
		);
		$out['queue_position'] = $position;
		return $out;
	}

	/**
	 * Suggestions and queue, presented, for GET /state and GET /suggestions.
	 *
	 * @return array{suggestions: array[], queue: array[]}
	 */
	public static function overview(): array {
		$queue = array();
		foreach ( self::queue_list() as $i => $exp ) {
			$queue[] = self::present( $exp, $i + 1 );
		}
		$suggestions = array();
		foreach ( self::suggestions() as $exp ) {
			$suggestions[] = self::present( $exp );
		}
		return array(
			'suggestions' => $suggestions,
			'queue'       => $queue,
		);
	}
}
