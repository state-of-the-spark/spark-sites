<?php
/**
 * Spark Living: suggested tests and the queue (0.2.0).
 *
 * A suggestion is a fully specified test that has not been queued: a
 * `living_experiment` post with status `suggested`. Queueing it moves it to
 * status `queued` (ordered by `queue_order`). The plugin still runs one test at
 * a time; when nothing is running, the nightly job starts the first queued
 * test, but only if its stored traffic count passes the gate (100 sessions or
 * more, measured no more than 21 days ago). A failed gate leaves the test
 * queued. The queue never force-starts anything.
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
		if ( isset( $args['tier'] ) && 2 === (int) $args['tier'] ) {
			return new WP_Error( 'spark_living_tier2', __( 'Tier 2 tests need owner approval and cannot be suggested for the queue.', 'spark-living' ), array( 'status' => 400 ) );
		}

		$page = self::sanitize_page( $args['page'] ?? '' );
		if ( '' === $page ) {
			return new WP_Error( 'spark_living_page', __( 'page must be a post ID or an http(s) URL or path.', 'spark-living' ), array( 'status' => 400 ) );
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
				'tier'         => 1,
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
			array(
				'status'         => Spark_Living_Store::STATUS_SUGGESTED,
				'page'           => $page,
				'rationale'      => $rationale,
				'evidence'       => $evidence,
				'priority'       => $priority,
				'suggested_by'   => self::text( $args['suggested_by'] ?? '', 80 ),
				'suggested_at'   => Spark_Living_Util::mysql_utc(),
				'sessions_14d'   => (int) $sessions,
				'sessions_as_of' => $as_of,
			)
		);
		return (int) $id;
	}

	/**
	 * Suggested tests, best priority first (ties: oldest first).
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
				return array( $a['priority'], $a['id'] ) <=> array( $b['priority'], $b['id'] );
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
	 * @param int $id Experiment ID.
	 * @return array|WP_Error The updated experiment.
	 */
	public static function queue( int $id ) {
		$exp = self::expect( $id, array( Spark_Living_Store::STATUS_SUGGESTED ) );
		if ( is_wp_error( $exp ) ) {
			return $exp;
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
		return (array) Spark_Living_Store::get( $id );
	}

	/**
	 * Queued back to suggested.
	 *
	 * @param int $id Experiment ID.
	 * @return array|WP_Error
	 */
	public static function unqueue( int $id ) {
		$exp = self::expect( $id, array( Spark_Living_Store::STATUS_QUEUED ) );
		if ( is_wp_error( $exp ) ) {
			return $exp;
		}
		Spark_Living_Store::update(
			$id,
			array(
				'status'      => Spark_Living_Store::STATUS_SUGGESTED,
				'queued_at'   => '',
				'queue_order' => 0,
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
	public static function dismiss( int $id ) {
		$exp = self::expect( $id, array( Spark_Living_Store::STATUS_SUGGESTED, Spark_Living_Store::STATUS_QUEUED ) );
		if ( is_wp_error( $exp ) ) {
			return $exp;
		}
		Spark_Living_Store::update(
			$id,
			array(
				'status'       => Spark_Living_Store::STATUS_DISMISSED,
				'dismissed_at' => Spark_Living_Util::mysql_utc(),
				'queued_at'    => '',
				'queue_order'  => 0,
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
	 * The traffic facts for a suggestion or queued test.
	 *
	 * @param array $exp Experiment.
	 * @return array{sessions: int, as_of: string, age_days: int|null, meets_min: bool, fresh: bool, min: int, max_age_days: int}
	 */
	public static function traffic( array $exp ): array {
		$min = Spark_Living_Stats::ELIGIBILITY_SESSIONS;
		$age = self::age_days( (string) $exp['sessions_as_of'] );
		return array(
			'sessions'     => (int) $exp['sessions_14d'],
			'as_of'        => (string) $exp['sessions_as_of'],
			'age_days'     => $age,
			'meets_min'    => (int) $exp['sessions_14d'] >= $min,
			'fresh'        => ( null !== $age && $age <= self::MAX_AGE_DAYS ),
			'min'          => $min,
			'max_age_days' => self::MAX_AGE_DAYS,
		);
	}

	/**
	 * Would the nightly job start this test right now (ignoring whether
	 * another test is running)?
	 *
	 * @param array $exp Queued experiment.
	 * @return array{ok: bool, code: string, message: string}
	 */
	public static function gate( array $exp ): array {
		$t = self::traffic( $exp );
		if ( ! $t['meets_min'] ) {
			return array(
				'ok'      => false,
				'code'    => 'below_minimum',
				'message' => __( 'Waiting: traffic count is below the minimum', 'spark-living' ),
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
	 * Shape one suggestion or queued test for REST.
	 *
	 * @param array $exp      Experiment.
	 * @param int   $position 1-based place in the queue (0 when not queued).
	 * @return array
	 */
	public static function present( array $exp, int $position = 0 ): array {
		$out                  = Spark_Living_Rest::present_experiment( $exp );
		$out['traffic']       = self::traffic( $exp );
		$out['gate']          = self::gate( $exp );
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
