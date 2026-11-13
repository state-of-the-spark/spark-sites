<?php
/**
 * Spark Living: REST API for the brain (the nightly agent).
 *
 * Every route requires manage_options. Authenticate with a WordPress
 * application password (HTTP Basic) over HTTPS.
 *
 *   GET  /wp-json/spark-living/v1/state
 *   GET  /wp-json/spark-living/v1/stats[?experiment_id=ID]
 *   GET  /wp-json/spark-living/v1/log[?per_page=50&page=1]
 *   POST /wp-json/spark-living/v1/tests
 *   POST /wp-json/spark-living/v1/tests/{id}/start   (needs sessions_14d >= 100, or force:true)
 *   POST /wp-json/spark-living/v1/tests/{id}/conclude
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Spark_Living_Rest {

	/**
	 * Hook everything in.
	 */
	public static function init(): void {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * Permission callback.
	 *
	 * @return bool
	 */
	public static function can_manage(): bool {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Register the brain routes.
	 */
	public static function register_routes(): void {
		$ns = 'spark-living/v1';

		register_rest_route(
			$ns,
			'/state',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'get_state' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
			)
		);
		register_rest_route(
			$ns,
			'/stats',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'get_stats' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
				'args'                => array(
					'experiment_id' => array(
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
					),
				),
			)
		);
		register_rest_route(
			$ns,
			'/log',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'get_log' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
				'args'                => array(
					'per_page' => array(
						'type'              => 'integer',
						'default'           => 50,
						'sanitize_callback' => 'absint',
					),
					'page'     => array(
						'type'              => 'integer',
						'default'           => 1,
						'sanitize_callback' => 'absint',
					),
				),
			)
		);
		register_rest_route(
			$ns,
			'/tests',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'create_test' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
			)
		);
		register_rest_route(
			$ns,
			'/tests/(?P<id>\d+)/start',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'start_test' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
			)
		);
		register_rest_route(
			$ns,
			'/tests/(?P<id>\d+)/conclude',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'conclude_test' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
			)
		);
	}

	/**
	 * Public-safe summary of an experiment for the brain.
	 *
	 * @param array $exp Experiment.
	 * @return array
	 */
	public static function present_experiment( array $exp ): array {
		unset( $exp['snapshot'] );
		return $exp;
	}

	/**
	 * GET /state
	 *
	 * @return WP_REST_Response
	 */
	public static function get_state(): WP_REST_Response {
		$running = Spark_Living_Store::get_running();
		$queue   = Spark_Living_Store::all(
			array(
				array(
					'key'     => '_spark_living_status',
					'value'   => array( Spark_Living_Store::STATUS_DRAFT, Spark_Living_Store::STATUS_AWAITING ),
					'compare' => 'IN',
				),
			)
		);
		$promoted = array();
		foreach ( Spark_Living_Store::get_promoted() as $exp ) {
			$promoted[] = self::present_experiment( $exp );
		}
		$tally = Spark_Living_Store::verdict_tally();

		return new WP_REST_Response(
			array(
				'plugin_version' => SPARK_LIVING_VERSION,
				'site'           => home_url(),
				'now_utc'        => Spark_Living_Util::mysql_utc(),
				'running'        => $running ? array_merge( self::present_experiment( $running ), array( 'live' => Spark_Living_Engine::snapshot( $running ) ) ) : null,
				'queued'         => array_map( array( __CLASS__, 'present_experiment' ), $queue ),
				'promoted'       => $promoted,
				'lift'           => Spark_Living_Engine::lift_summary(),
				'evolutions'     => $tally['evolved'],
				'tally'          => $tally,
				'rules'          => array(
					'min_days'       => Spark_Living_Stats::MIN_DAYS,
					'min_sessions'   => Spark_Living_Stats::MIN_SESSIONS,
					'hard_stop_days' => Spark_Living_Stats::HARD_STOP_DAYS,
					'win_p'          => Spark_Living_Stats::WIN_P,
					'lose_p'         => Spark_Living_Stats::LOSE_P,
					'floor'          => Spark_Living_Stats::FLOOR,
					'guard_p'        => Spark_Living_Stats::GUARD_P,
					'holdout'        => Spark_Living_Stats::HOLDOUT,
					'eligibility_sessions_14d' => Spark_Living_Stats::ELIGIBILITY_SESSIONS,
				),
			),
			200
		);
	}

	/**
	 * GET /stats
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function get_stats( WP_REST_Request $request ) {
		$id  = (int) $request->get_param( 'experiment_id' );
		$exp = $id > 0 ? Spark_Living_Store::get( $id ) : Spark_Living_Store::get_running();
		if ( ! $exp ) {
			return new WP_Error( 'spark_living_missing', __( 'No such test, and none is running.', 'spark-living' ), array( 'status' => 404 ) );
		}
		$snap = ( Spark_Living_Store::STATUS_CONCLUDED === $exp['status'] && ! empty( $exp['snapshot'] ) )
			? $exp['snapshot']
			: Spark_Living_Engine::snapshot( $exp );
		return new WP_REST_Response(
			array(
				'experiment' => self::present_experiment( $exp ),
				'stats'      => $snap,
			),
			200
		);
	}

	/**
	 * GET /log
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function get_log( WP_REST_Request $request ): WP_REST_Response {
		$data = Spark_Living_Store::log_entries( (int) $request->get_param( 'per_page' ), (int) $request->get_param( 'page' ) );
		$resp = new WP_REST_Response( $data['items'], 200 );
		$resp->header( 'X-WP-Total', (string) $data['total'] );
		return $resp;
	}

	/**
	 * POST /tests
	 *
	 * Body (JSON): name, element_type (block|selector), target, hypothesis,
	 * variants {A:{label,changes[]},B:{label,changes[],css}}, tier (1|2),
	 * device (all|mobile|desktop), start (bool). With start:true the same
	 * eligibility rule as POST /tests/{id}/start applies: send sessions_14d
	 * (or force:true as an administrator).
	 *
	 * Tier 2 tests (offer, price, guarantee, legal claim) are created as
	 * awaiting_approval and never start on their own.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function create_test( WP_REST_Request $request ) {
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = $request->get_params();
		}
		$wants_start = ! empty( $params['start'] );
		if ( $wants_start && Spark_Living_Store::get_running() ) {
			return new WP_Error( 'spark_living_busy', __( 'A test is already running. One test per site at a time.', 'spark-living' ), array( 'status' => 409 ) );
		}

		// Check eligibility before anything is written, so a refusal leaves no stray draft.
		$tier2 = ( isset( $params['tier'] ) && 2 === (int) $params['tier'] );
		$elig  = null;
		if ( $wants_start && ! $tier2 ) {
			$device = isset( $params['device'] ) ? sanitize_key( (string) $params['device'] ) : 'all';
			$elig   = Spark_Living_Store::check_eligibility( $params['sessions_14d'] ?? null, rest_sanitize_boolean( $params['force'] ?? false ), in_array( $device, Spark_Living_Store::DEVICES, true ) ? $device : 'all' );
			if ( is_wp_error( $elig ) ) {
				return $elig;
			}
		}

		$id = Spark_Living_Store::create( $params );
		if ( is_wp_error( $id ) ) {
			return $id;
		}

		$exp = Spark_Living_Store::get( $id );
		if ( $exp && 2 === $exp['tier'] ) {
			Spark_Living_Store::update( $id, array( 'status' => Spark_Living_Store::STATUS_AWAITING ) );
		} elseif ( $wants_start && is_array( $elig ) ) {
			$started = Spark_Living_Store::start(
				$id,
				array(
					'forced_start'       => $elig['forced'],
					'start_sessions_14d' => $elig['sessions'],
				)
			);
			if ( is_wp_error( $started ) ) {
				return $started;
			}
		}
		return new WP_REST_Response( self::present_experiment( (array) Spark_Living_Store::get( $id ) ), 201 );
	}

	/**
	 * POST /tests/{id}/start
	 *
	 * Body: sessions_14d (required, whole number: sessions in the last 14 days
	 * on the target page; for a device-scoped test, on that device). It must be
	 * 100 or more, otherwise the test is not started (422; 400 when missing).
	 * An administrator may send force:true to start below the bar; the start is
	 * then recorded on the experiment (forced_start, start_sessions_14d).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function start_test( WP_REST_Request $request ) {
		$id     = absint( $request['id'] );
		$params = $request->get_json_params();
		$params = is_array( $params ) ? $params : $request->get_params();

		$exp = Spark_Living_Store::get( $id );
		if ( ! $exp ) {
			return new WP_Error( 'spark_living_missing', __( 'Test not found.', 'spark-living' ), array( 'status' => 404 ) );
		}
		if ( ! in_array( $exp['status'], array( Spark_Living_Store::STATUS_DRAFT, Spark_Living_Store::STATUS_AWAITING ), true ) ) {
			return new WP_Error( 'spark_living_state', __( 'Only a draft test can be started.', 'spark-living' ), array( 'status' => 409 ) );
		}
		$elig = Spark_Living_Store::check_eligibility( $params['sessions_14d'] ?? null, rest_sanitize_boolean( $params['force'] ?? false ), (string) $exp['device'] );
		if ( is_wp_error( $elig ) ) {
			return $elig;
		}
		$started = Spark_Living_Store::start(
			$id,
			array(
				'forced_start'       => $elig['forced'],
				'start_sessions_14d' => $elig['sessions'],
			)
		);
		if ( is_wp_error( $started ) ) {
			return $started;
		}
		return new WP_REST_Response( self::present_experiment( (array) Spark_Living_Store::get( $id ) ), 200 );
	}

	/**
	 * POST /tests/{id}/conclude
	 *
	 * Body: verdict (ship_b | keep_a | no_difference), note (optional).
	 * Manual conclusion records the live numbers at the moment of the call.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function conclude_test( WP_REST_Request $request ) {
		$id      = absint( $request['id'] );
		$params  = $request->get_json_params();
		$params  = is_array( $params ) ? $params : $request->get_params();
		$verdict = isset( $params['verdict'] ) ? sanitize_key( (string) $params['verdict'] ) : '';
		$note    = isset( $params['note'] ) ? sanitize_textarea_field( (string) $params['note'] ) : '';

		if ( ! in_array( $verdict, array( 'ship_b', 'keep_a', 'no_difference' ), true ) ) {
			return new WP_Error( 'spark_living_verdict', __( 'verdict must be ship_b, keep_a or no_difference.', 'spark-living' ), array( 'status' => 400 ) );
		}
		$exp = Spark_Living_Store::get( $id );
		if ( ! $exp ) {
			return new WP_Error( 'spark_living_missing', __( 'Test not found.', 'spark-living' ), array( 'status' => 404 ) );
		}
		$log_id = Spark_Living_Engine::conclude( $id, $verdict, Spark_Living_Engine::snapshot( $exp ), 'rest', $note );
		if ( is_wp_error( $log_id ) ) {
			return $log_id;
		}
		return new WP_REST_Response(
			array(
				'experiment' => self::present_experiment( (array) Spark_Living_Store::get( $id ) ),
				'log_id'     => $log_id,
			),
			200
		);
	}
}
