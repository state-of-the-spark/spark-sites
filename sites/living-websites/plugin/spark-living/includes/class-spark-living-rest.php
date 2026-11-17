<?php
/**
 * Spark Living: REST API for the brain (the nightly agent).
 *
 * Authenticate with a WordPress application password (HTTP Basic) over HTTPS.
 * Who may call what (0.4.0): administrators (manage_options) may call everything.
 * A user with only the capability spark_living_gate may read and post a Goal
 * Gate verdict; a user with only spark_living_build may read, create and queue
 * suggestions, validate and preview a variant; neither may conclude a test,
 * edit or approve the charter, undo a change or read /results.
 *
 *   GET  /wp-json/spark-living/v1/state
 *   GET  /wp-json/spark-living/v1/stats[?experiment_id=ID]
 *   GET  /wp-json/spark-living/v1/log[?per_page=50&page=1]
 *   POST /wp-json/spark-living/v1/tests
 *   POST /wp-json/spark-living/v1/tests/{id}          (edit change_type, a_label, b_label only; allowed on a running test)
 *   POST /wp-json/spark-living/v1/tests/{id}/start   (needs sessions_14d >= 100, or force:true)
 *   POST /wp-json/spark-living/v1/tests/{id}/conclude
 *   GET  /wp-json/spark-living/v1/suggestions
 *   POST /wp-json/spark-living/v1/suggestions
 *   POST /wp-json/spark-living/v1/suggestions/{id}/queue
 *   POST /wp-json/spark-living/v1/suggestions/{id}/unqueue
 *   POST /wp-json/spark-living/v1/suggestions/{id}/dismiss
 *   PATCH /wp-json/spark-living/v1/suggestions/{id}         (0.4.0: payoff fields, traffic count, priority)
 *   POST /wp-json/spark-living/v1/suggestions/{id}/gate     (0.3.0: record a Goal Gate verdict; needs spark_living_gate)
 *   POST /wp-json/spark-living/v1/suggestions/{id}/preview-token (0.4.0)
 *   POST /wp-json/spark-living/v1/validate-variant           (0.4.0: writes nothing)
 *   POST /wp-json/spark-living/v1/charter/approve            (0.4.0: administrator only)
 *   GET  /wp-json/spark-living/v1/results                    (0.4.0: administrator only)
 *   GET  /wp-json/spark-living/v1/charter                    (0.3.0)
 *   PUT  /wp-json/spark-living/v1/charter
 *   GET  /wp-json/spark-living/v1/changes[?per_page=20&page=1&kind=&subject_id=]
 *   POST /wp-json/spark-living/v1/changes
 *   POST /wp-json/spark-living/v1/changes/{id}/undo
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
		return Spark_Living_Caps::can_admin();
	}

	/**
	 * Permission callback: read routes (an administrator, a Judge or a Builder login).
	 *
	 * @return bool
	 */
	public static function can_read(): bool {
		return Spark_Living_Caps::can_read();
	}

	/**
	 * Permission callback: create, queue, validate and preview (an administrator or a Builder login).
	 *
	 * @return bool
	 */
	public static function can_build(): bool {
		return Spark_Living_Caps::can_build();
	}

	/**
	 * Permission callback: record a Goal Gate verdict (an administrator or a Judge login).
	 *
	 * @return bool
	 */
	public static function can_gate(): bool {
		return Spark_Living_Caps::can_gate();
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
				'permission_callback' => array( __CLASS__, 'can_read' ),
			)
		);
		register_rest_route(
			$ns,
			'/stats',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'get_stats' ),
				'permission_callback' => array( __CLASS__, 'can_read' ),
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
				'permission_callback' => array( __CLASS__, 'can_read' ),
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
				'permission_callback' => array( __CLASS__, 'can_build' ),
			)
		);
		register_rest_route(
			$ns,
			'/tests/(?P<id>\d+)',
			array(
				'methods'             => WP_REST_Server::EDITABLE,
				'callback'            => array( __CLASS__, 'update_test' ),
				'permission_callback' => array( __CLASS__, 'can_build' ),
			)
		);
		register_rest_route(
			$ns,
			'/tests/(?P<id>\d+)/start',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'start_test' ),
				'permission_callback' => array( __CLASS__, 'can_build' ),
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
		register_rest_route(
			$ns,
			'/suggestions',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'get_suggestions' ),
					'permission_callback' => array( __CLASS__, 'can_read' ),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'create_suggestion' ),
					'permission_callback' => array( __CLASS__, 'can_build' ),
				),
			)
		);
		register_rest_route(
			$ns,
			'/suggestions/(?P<id>\d+)',
			array(
				'methods'             => 'PATCH,PUT',
				'callback'            => array( __CLASS__, 'patch_suggestion' ),
				'permission_callback' => array( __CLASS__, 'can_build' ),
			)
		);
		register_rest_route(
			$ns,
			'/suggestions/(?P<id>\d+)/preview-token',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'preview_token' ),
				'permission_callback' => array( __CLASS__, 'can_build' ),
			)
		);
		register_rest_route(
			$ns,
			'/validate-variant',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'validate_variant' ),
				'permission_callback' => array( __CLASS__, 'can_build' ),
			)
		);
		register_rest_route(
			$ns,
			'/results',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'get_results' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
			)
		);
		register_rest_route(
			$ns,
			'/charter/approve',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'approve_charter' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
			)
		);
		foreach ( array( 'queue', 'unqueue', 'dismiss' ) as $action ) {
			register_rest_route(
				$ns,
				'/suggestions/(?P<id>\d+)/' . $action,
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => static function ( WP_REST_Request $request ) use ( $action ) {
						return self::suggestion_action( $action, absint( $request['id'] ), self::body( $request ) );
					},
					'permission_callback' => array( __CLASS__, 'can_build' ),
				)
			);
		}
		register_rest_route(
			$ns,
			'/suggestions/(?P<id>\d+)/gate',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'record_gate' ),
				'permission_callback' => array( __CLASS__, 'can_gate' ),
			)
		);
		register_rest_route(
			$ns,
			'/charter',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'get_charter' ),
					'permission_callback' => array( __CLASS__, 'can_read' ),
				),
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( __CLASS__, 'put_charter' ),
					'permission_callback' => array( __CLASS__, 'can_manage' ),
				),
			)
		);
		register_rest_route(
			$ns,
			'/changes',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'get_changes' ),
					'permission_callback' => array( __CLASS__, 'can_read' ),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'post_change' ),
					'permission_callback' => array( __CLASS__, 'can_read' ),
				),
			)
		);
		register_rest_route(
			$ns,
			'/changes/(?P<id>\d+)/undo',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'undo_change' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
			)
		);
	}

	/**
	 * The JSON body of a request as an array (falls back to form params).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return array
	 */
	private static function body( WP_REST_Request $request ): array {
		$params = $request->get_json_params();
		return is_array( $params ) ? $params : (array) $request->get_params();
	}

	/**
	 * GET /charter
	 *
	 * @return WP_REST_Response
	 */
	public static function get_charter(): WP_REST_Response {
		return new WP_REST_Response( Spark_Living_Charter::get(), 200 );
	}

	/**
	 * PUT /charter
	 *
	 * Body (JSON): any of business_name, business_goal, primary_conversion
	 * {type, description, selector}, secondary_conversions [same shape],
	 * audience, brand {colors[], fonts[], button_shape, voice_notes},
	 * off_limits [], autonomy_level (suggest|tier1|full), speed_budget
	 * {load_ms, button_visible_ms, max_added_kb}, updated_by. Fields that are
	 * left out keep their value; brand, primary_conversion and speed_budget
	 * merge field by field. Unknown keys are dropped. The version goes up by
	 * one on every save and a charter_update ledger row is written.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function put_charter( WP_REST_Request $request ) {
		$body  = self::body( $request );
		$saved = Spark_Living_Charter::save( $body, Spark_Living_Gate::clean_by( $body['updated_by'] ?? '' ) );
		if ( is_wp_error( $saved ) ) {
			return $saved;
		}
		unset( $saved['change_id'] );
		return new WP_REST_Response( $saved, 200 );
	}

	/**
	 * GET /changes
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function get_changes( WP_REST_Request $request ): WP_REST_Response {
		$per_page = $request->get_param( 'per_page' ) ? (int) $request->get_param( 'per_page' ) : 20;
		$q        = Spark_Living_Ledger::query(
			array(
				'per_page'   => $per_page,
				'page'       => $request->get_param( 'page' ) ? (int) $request->get_param( 'page' ) : 1,
				'kind'       => (string) $request->get_param( 'kind' ),
				'subject_id' => (string) $request->get_param( 'subject_id' ),
			)
		);
		$resp     = new WP_REST_Response( $q['items'], 200 );
		$resp->header( 'X-WP-Total', (string) $q['total'] );
		$resp->header( 'X-WP-TotalPages', (string) max( 1, (int) ceil( $q['total'] / max( 1, min( 100, $per_page ) ) ) ) );
		return $resp;
	}

	/**
	 * POST /changes: an outside agent records a change (rows_removed, style_fix,
	 * ad_change, speed measurements and so on).
	 *
	 * Body (JSON): kind (required, one of the ledger kinds), summary (required,
	 * 300 characters), subject_type, subject_id, before_json or before,
	 * after_json or after, proposed_by, gate_verdict (pass|fail|hold|na),
	 * gate_reasons, gate_by, evidence_json or evidence, result_json or result,
	 * status (applied|failed). A posted row is never undoable (no undo payload is
	 * accepted) and is stamped with the current time and charter version.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function post_change( WP_REST_Request $request ) {
		$p    = self::body( $request );
		$kind = isset( $p['kind'] ) ? sanitize_key( (string) $p['kind'] ) : '';
		if ( ! in_array( $kind, Spark_Living_Ledger::KINDS, true ) ) {
			return new WP_Error( 'spark_living_change_kind', __( 'kind must be one of the ledger kinds.', 'spark-living' ), array( 'status' => 400, 'kinds' => Spark_Living_Ledger::KINDS ) );
		}
		if ( ! Spark_Living_Caps::can_gate() ) {
			// Only the Judge's login may put a verdict in the log; everyone else's rows carry no gate data.
			if ( in_array( $kind, Spark_Living_Ledger::GATE_KINDS, true ) ) {
				return new WP_Error( 'spark_living_gate_cap', __( 'Only a user with the spark_living_gate capability can post a gate_verdict row.', 'spark-living' ), array( 'status' => 403 ) );
			}
			$p['gate_verdict'] = 'na';
			unset( $p['gate_reasons'], $p['gate_by'] );
		}
		if ( '' === trim( (string) ( $p['summary'] ?? '' ) ) ) {
			return new WP_Error( 'spark_living_change_summary', __( 'summary is required: one plain sentence saying what changed.', 'spark-living' ), array( 'status' => 400 ) );
		}
		if ( isset( $p['gate_verdict'] ) && ! in_array( sanitize_key( (string) $p['gate_verdict'] ), Spark_Living_Ledger::VERDICTS, true ) ) {
			return new WP_Error( 'spark_living_change_verdict', __( 'gate_verdict must be pass, fail, hold or na.', 'spark-living' ), array( 'status' => 400 ) );
		}
		if ( isset( $p['status'] ) && ! in_array( sanitize_key( (string) $p['status'] ), array( 'applied', 'failed' ), true ) ) {
			return new WP_Error( 'spark_living_change_status', __( 'status must be applied or failed.', 'spark-living' ), array( 'status' => 400 ) );
		}
		unset( $p['undo'], $p['undo_json'], $p['created_at'], $p['undone_at'], $p['charter_version'], $p['id'] );
		$id = Spark_Living_Ledger::record( $p );
		if ( ! $id ) {
			return new WP_Error( 'spark_living_change_failed', __( 'The change could not be recorded.', 'spark-living' ), array( 'status' => 500 ) );
		}
		return new WP_REST_Response( Spark_Living_Ledger::get( $id ), 201 );
	}

	/**
	 * POST /changes/{id}/undo
	 *
	 * Body (optional): by. Works only for a queued test (takes it off the
	 * queue), a charter save (restores the previous charter) and a weights change
	 * (restores the previous weights). Anything else answers 409
	 * spark_living_not_undoable. The undo is recorded as a new row.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function undo_change( WP_REST_Request $request ) {
		$p    = self::body( $request );
		$done = Spark_Living_Ledger::undo( absint( $request['id'] ), Spark_Living_Gate::clean_by( $p['by'] ?? '' ) );
		if ( is_wp_error( $done ) ) {
			return $done;
		}
		return new WP_REST_Response( $done, 200 );
	}

	/**
	 * POST /suggestions/{id}/gate
	 *
	 * Body (JSON): verdict (pass|fail|hold, required), by (required, who judged
	 * it), reasons (600 characters; required for fail and hold), risk_tier
	 * (optional 1, 2 or 3; sets the test's tier), charter_version (optional, the
	 * version the judge read; default the current one).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function record_gate( WP_REST_Request $request ) {
		$exp = Spark_Living_Gate::record( absint( $request['id'] ), self::body( $request ) );
		if ( is_wp_error( $exp ) ) {
			return $exp;
		}
		$position = 0;
		foreach ( Spark_Living_Queue::queue_list() as $i => $q ) {
			if ( (int) $q['id'] === (int) $exp['id'] ) {
				$position = $i + 1;
			}
		}
		return new WP_REST_Response( Spark_Living_Queue::present( $exp, $position ), 200 );
	}

	/**
	 * PATCH /suggestions/{id}
	 *
	 * Body (JSON): any of payoff_score (number; null clears it), payoff_inputs
	 * {sessions_reaching, proximity, expected_lift, days_to_result, traffic_class,
	 * and optionally sessions_14d, reach_share, change_type, baseline_rate,
	 * power_factor, library_n}, payoff_version, sessions_14d with sessions_as_of
	 * (refresh the traffic count), priority, and by. Only for a suggested or
	 * queued test. The plugin works out days to result from its own rules and
	 * stores its figure beside the agent's (payoff.plugin_check).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function patch_suggestion( WP_REST_Request $request ) {
		$p    = self::body( $request );
		$done = Spark_Living_Queue::update_suggestion( absint( $request['id'] ), $p, Spark_Living_Gate::clean_by( $p['by'] ?? '' ) );
		if ( is_wp_error( $done ) ) {
			return $done;
		}
		return new WP_REST_Response( Spark_Living_Queue::present( $done, self::queue_position( (int) $done['id'] ) ), 200 );
	}

	/**
	 * Place of a test in the queue (0 when it is not queued).
	 *
	 * @param int $id Experiment ID.
	 * @return int
	 */
	private static function queue_position( int $id ): int {
		foreach ( Spark_Living_Queue::queue_list() as $i => $q ) {
			if ( (int) $q['id'] === $id ) {
				return $i + 1;
			}
		}
		return 0;
	}

	/**
	 * POST /suggestions/{id}/preview-token
	 *
	 * Issues a signed token, valid for 30 minutes and for this test only. A
	 * browser that opens a page of the site with
	 * ?sl_test=1&sl_exp={id}&sl_force=B&sl_pt={token} sees the challenger of
	 * this test that is not running yet, in that browser only; nothing is recorded.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function preview_token( WP_REST_Request $request ) {
		$id  = absint( $request['id'] );
		$exp = Spark_Living_Store::get( $id );
		if ( ! $exp ) {
			return new WP_Error( 'spark_living_missing', __( 'Test not found.', 'spark-living' ), array( 'status' => 404 ) );
		}
		if ( ! in_array( $exp['status'], Spark_Living_Preview::STATUSES, true ) ) {
			return new WP_Error( 'spark_living_state', __( 'Only a suggested, queued or draft test can be previewed; a running test is seen with ?sl_test=1&sl_force=B.', 'spark-living' ), array( 'status' => 409 ) );
		}
		if ( 'selector' !== $exp['element_type'] ) {
			return new WP_Error( 'spark_living_preview_block', __( 'A Living Block test cannot be previewed this way.', 'spark-living' ), array( 'status' => 400 ) );
		}
		$t = Spark_Living_Preview::make_token( $id );
		return new WP_REST_Response(
			array(
				'test_id'    => $id,
				'token'      => $t['token'],
				'expires_at' => $t['expires_at'],
				'expires_in' => $t['expires_in'],
				'query'      => 'sl_test=1&sl_exp=' . $id . '&sl_force=B&sl_pt=' . $t['token'],
			),
			200
		);
	}

	/**
	 * POST /validate-variant
	 *
	 * Body (JSON): selector, element_type or format (selector|block), changes
	 * [{op, value}], css, and the shorthands text, href, add_class, remove_class,
	 * style. Returns the cleaned variant, what was stripped and whether the
	 * selector is acceptable. Writes nothing.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function validate_variant( WP_REST_Request $request ): WP_REST_Response {
		return new WP_REST_Response( Spark_Living_Util::validate_variant( self::body( $request ) ), 200 );
	}

	/**
	 * GET /results[?per_page=20&page=1&outcome=&change_type=&scope=]
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function get_results( WP_REST_Request $request ): WP_REST_Response {
		$per_page = $request->get_param( 'per_page' ) ? (int) $request->get_param( 'per_page' ) : 20;
		$q        = Spark_Living_Results::query(
			array(
				'per_page'    => $per_page,
				'page'        => $request->get_param( 'page' ) ? (int) $request->get_param( 'page' ) : 1,
				'outcome'     => (string) $request->get_param( 'outcome' ),
				'change_type' => (string) $request->get_param( 'change_type' ),
				'scope'       => (string) $request->get_param( 'scope' ),
			)
		);
		$resp     = new WP_REST_Response( $q['items'], 200 );
		$resp->header( 'X-WP-Total', (string) $q['total'] );
		$resp->header( 'X-WP-TotalPages', (string) max( 1, (int) ceil( $q['total'] / max( 1, min( 100, $per_page ) ) ) ) );
		return $resp;
	}

	/**
	 * POST /charter/approve
	 *
	 * Administrator only, and refused when `by` starts with "agent:". Marks the
	 * current content of the charter approved. The version does not change.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function approve_charter( WP_REST_Request $request ) {
		$p  = self::body( $request );
		$by = Spark_Living_Gate::clean_by( $p['by'] ?? '' );
		if ( Spark_Living_Gate::is_agent( $by ) ) {
			return new WP_Error( 'spark_living_agent_cannot_approve', __( 'Refused: an agent cannot approve the site goals. A person approves them.', 'spark-living' ), array( 'status' => 403 ) );
		}
		$done = Spark_Living_Charter::approve( $by );
		if ( is_wp_error( $done ) ) {
			return $done;
		}
		return new WP_REST_Response( $done, 200 );
	}

	/**
	 * GET /suggestions
	 *
	 * @return WP_REST_Response
	 */
	public static function get_suggestions(): WP_REST_Response {
		return new WP_REST_Response( Spark_Living_Queue::overview(), 200 );
	}

	/**
	 * POST /suggestions
	 *
	 * Body (JSON): title, hypothesis, page (post ID or URL), device, element_type,
	 * target, variants (same format as POST /tests), change_type, a_label, b_label,
	 * rationale (up to 600 characters), evidence [{source, detail, as_of}],
	 * priority (1 is first), suggested_by, sessions_14d, sessions_as_of
	 * (YYYY-MM-DD), tier (1 or 2; 3 is refused), scope (page|sitewide; for a
	 * sitewide test sessions_14d is the whole site and page may be left out),
	 * payoff_score, payoff_inputs, payoff_version. Creates a test with status
	 * `suggested`. It never starts it.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function create_suggestion( WP_REST_Request $request ) {
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = $request->get_params();
		}
		$id = Spark_Living_Queue::create_suggestion( $params );
		if ( is_wp_error( $id ) ) {
			return $id;
		}
		return new WP_REST_Response( Spark_Living_Queue::present( (array) Spark_Living_Store::get( $id ) ), 201 );
	}

	/**
	 * POST /suggestions/{id}/queue | unqueue | dismiss
	 *
	 * @param string $action queue, unqueue or dismiss.
	 * @param int    $id     Experiment ID.
	 * @param array  $body   Request body; `by` names the actor. An actor that starts with "agent:" is checked against the Goal Gate and the charter autonomy level when queueing.
	 * @return WP_REST_Response|WP_Error
	 */
	private static function suggestion_action( string $action, int $id, array $body = array() ) {
		$by   = Spark_Living_Gate::clean_by( $body['by'] ?? '' );
		$done = 'queue' === $action ? Spark_Living_Queue::queue( $id, $by ) : ( 'unqueue' === $action ? Spark_Living_Queue::unqueue( $id, $by ) : Spark_Living_Queue::dismiss( $id, $by ) );
		if ( is_wp_error( $done ) ) {
			return $done;
		}
		$position = 0;
		foreach ( Spark_Living_Queue::queue_list() as $i => $q ) {
			if ( (int) $q['id'] === $id ) {
				$position = $i + 1;
			}
		}
		return new WP_REST_Response( Spark_Living_Queue::present( $done, $position ), 200 );
	}

	/**
	 * Public-safe summary of an experiment for the brain.
	 *
	 * @param array $exp Experiment.
	 * @return array
	 */
	public static function present_experiment( array $exp ): array {
		unset( $exp['snapshot'] );
		$exp['comparison'] = Spark_Living_Store::describe( $exp );
		if ( Spark_Living_Store::STATUS_RUNNING === $exp['status'] ) {
			$exp['schedule'] = Spark_Living_Engine::schedule( $exp );
		}
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
		$plan  = Spark_Living_Queue::overview();

		return new WP_REST_Response(
			array(
				'plugin_version' => SPARK_LIVING_VERSION,
				'site'           => home_url(),
				'now_utc'        => Spark_Living_Util::mysql_utc(),
				'running'        => $running ? array_merge( self::present_experiment( $running ), array( 'live' => Spark_Living_Engine::snapshot( $running ) ) ) : null,
					'sources'        => Spark_Living_Sources::for_rest(),
				'queued'         => array_map( array( __CLASS__, 'present_experiment' ), $queue ),
				'suggestions'    => $plan['suggestions'],
				'queue'          => $plan['queue'],
				'promoted'       => $promoted,
				'lift'           => Spark_Living_Engine::lift_summary(),
				'evolutions'     => $tally['evolved'],
				'tally'          => $tally,
				'charter'        => Spark_Living_Charter::get(),
				'auto_pick'      => Spark_Living_Queue::auto_pick_plan(),
				'results_count'  => Spark_Living_Results::count(),
				'changes'        => Spark_Living_Ledger::latest( 10 ),
				'speed'          => Spark_Living_Ledger::last_speed(),
				'rules'          => array(
					'min_exposures_before_shift' => Spark_Living_Engine::min_exposures(),
					'min_days'       => Spark_Living_Stats::MIN_DAYS,
					'min_sessions'   => Spark_Living_Stats::MIN_SESSIONS,
					'hard_stop_days' => Spark_Living_Stats::HARD_STOP_DAYS, // Deprecated alias of min_stop_days.
					'min_stop_days'  => Spark_Living_Stats::MIN_STOP_DAYS,
					'max_stop_days'  => Spark_Living_Stats::MAX_STOP_DAYS,
					'version_share'  => Spark_Living_Stats::VERSION_SHARE,
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
	 * Record a refused agent attempt in the ledger and return the refusal.
	 *
	 * @param WP_Error   $err  The refusal.
	 * @param int        $id   Experiment ID (0 when there is none yet).
	 * @param string     $by   Who asked.
	 * @param string     $name Test name, for the summary.
	 * @param array|null $exp  Experiment, when there is one.
	 * @return WP_Error
	 */
	private static function refuse_agent( WP_Error $err, int $id, string $by, string $name, ?array $exp = null ): WP_Error {
		Spark_Living_Ledger::record(
			array(
				'kind'            => 'queue_attempt',
				'subject_type'    => 'test',
				'subject_id'      => $id > 0 ? (string) $id : '',
				'summary'         => sprintf( /* translators: 1: actor, 2: test name */ __( '%1$s tried to start "%2$s" and was refused.', 'spark-living' ), '' !== $by ? $by : __( 'A caller without the manage-options permission', 'spark-living' ), $name ),
				'proposed_by'     => '' !== $by ? $by : 'agent',
				'gate_verdict'    => $exp && in_array( $exp['gate_verdict'], Spark_Living_Ledger::VERDICTS, true ) ? $exp['gate_verdict'] : 'na',
				'gate_reasons'    => $err->get_error_message(),
				'gate_by'         => $exp ? (string) $exp['gate_by'] : '',
				'charter_version' => $exp ? (int) $exp['gate_charter_version'] : Spark_Living_Charter::version(),
				'evidence'        => array( 'refused' => $err->get_error_code(), 'autonomy_level' => Spark_Living_Charter::autonomy(), 'charter_status' => Spark_Living_Charter::get()['status'] ),
				'status'          => 'failed',
			)
		);
		return $err;
	}

	/**
	 * POST /tests
	 *
	 * Body (JSON): name, element_type (block|selector), target, hypothesis,
	 * variants {A:{label,changes[]},B:{label,changes[],css}}, tier (1|2),
	 * device (all|mobile|desktop), change_type (wording|color|shape|placement|
 * visibility|style|block), a_label, b_label (what visitors in A and B see, plain
 * text), start (bool). With start:true the same
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
		// 0.4.0: an agent (by "agent:..." or a login without manage_options) goes through the same checks as the queue
		// route. A test that does not exist yet has no Goal Gate verdict, so this route is closed to agents.
		$by = Spark_Living_Gate::clean_by( $params['by'] ?? '' );
		if ( Spark_Living_Gate::acts_as_agent( $by ) ) {
			$probe = array_merge( Spark_Living_Store::get_defaults_for_probe(), array( 'tier' => ( isset( $params['tier'] ) && 2 === (int) $params['tier'] ) ? 2 : 1 ) );
			$no    = Spark_Living_Gate::check_queue( $probe, $by );
			return is_wp_error( $no ) ? self::refuse_agent( $no, 0, $by, (string) ( $params['name'] ?? '' ) ) : self::refuse_agent( new WP_Error( 'spark_living_agent_use_suggestions', __( 'Refused: agents create tests through POST /suggestions and the Goal Gate, not through POST /tests.', 'spark-living' ), array( 'status' => 403 ) ), 0, $by, (string) ( $params['name'] ?? '' ) );
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
			$scope  = isset( $params['scope'] ) && 'sitewide' === sanitize_key( (string) $params['scope'] ) ? 'sitewide' : 'page';
			$elig   = Spark_Living_Store::check_eligibility( $params['sessions_14d'] ?? null, rest_sanitize_boolean( $params['force'] ?? false ), in_array( $device, Spark_Living_Store::DEVICES, true ) ? $device : 'all', $scope );
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
					'by'                 => $params['by'] ?? '',
				)
			);
			if ( is_wp_error( $started ) ) {
				return $started;
			}
		}
		return new WP_REST_Response( self::present_experiment( (array) Spark_Living_Store::get( $id ) ), 201 );
	}

	/**
	 * POST /tests/{id}
	 *
	 * Body: any of change_type (wording, color, shape, placement, visibility,
	 * style, block), a_label, b_label (plain text, 200 characters). Only these
	 * three descriptive fields can be changed here, in any status including
	 * running; assignment, variants, weights, start time and counts are never
	 * touched. Send an empty string to clear a field.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update_test( WP_REST_Request $request ) {
		$id     = absint( $request['id'] );
		$params = $request->get_json_params();
		$params = is_array( $params ) ? $params : $request->get_params();

		$fields = array();
		foreach ( array( 'change_type', 'a_label', 'b_label' ) as $key ) {
			if ( array_key_exists( $key, $params ) ) {
				$fields[ $key ] = $params[ $key ];
			}
		}
		if ( ! $fields ) {
			return new WP_Error( 'spark_living_nothing', __( 'Send at least one of change_type, a_label, b_label.', 'spark-living' ), array( 'status' => 400 ) );
		}
		$done = Spark_Living_Store::update_descriptors( $id, $fields );
		if ( is_wp_error( $done ) ) {
			return $done;
		}
		return new WP_REST_Response( self::present_experiment( (array) Spark_Living_Store::get( $id ) ), 200 );
	}

	/**
	 * POST /tests/{id}/start
	 *
	 * Body: sessions_14d (required, whole number: sessions in the last 14 days
	 * on the target page; for a device-scoped test, on that device; for a sitewide
	 * test, on the whole site). It must be 75 or more (each version can then reach
	 * 100 sessions within 42 days), otherwise the test is not started (422; 400
	 * when missing). An agent (by "agent:..." or a login without manage_options)
	 * must also pass the Goal Gate, tier, autonomy and approved-charter checks.
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
		if ( ! in_array( $exp['status'], Spark_Living_Store::STARTABLE, true ) ) {
			return new WP_Error( 'spark_living_state', __( 'Only a draft, suggested or queued test can be started.', 'spark-living' ), array( 'status' => 409 ) );
		}
		$by = Spark_Living_Gate::clean_by( $params['by'] ?? '' );
		if ( Spark_Living_Gate::acts_as_agent( $by ) ) {
			$no = Spark_Living_Gate::check_queue( $exp, $by );
			if ( is_wp_error( $no ) ) {
				return self::refuse_agent( $no, $id, $by, (string) $exp['name'], $exp );
			}
			if ( rest_sanitize_boolean( $params['force'] ?? false ) ) {
				return self::refuse_agent( new WP_Error( 'spark_living_agent_no_force', __( 'Refused: an agent may not force a start. Only a person can start a test that cannot finish in time.', 'spark-living' ), array( 'status' => 403 ) ), $id, $by, (string) $exp['name'], $exp );
			}
		}
		$elig = Spark_Living_Store::check_eligibility( $params['sessions_14d'] ?? null, rest_sanitize_boolean( $params['force'] ?? false ), (string) $exp['device'], (string) $exp['scope'] );
		if ( is_wp_error( $elig ) ) {
			return $elig;
		}
		$started = Spark_Living_Store::start(
			$id,
			array(
				'forced_start'       => $elig['forced'],
				'start_sessions_14d' => $elig['sessions'],
				'by'                 => $params['by'] ?? '',
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
		$log_id = Spark_Living_Engine::conclude( $id, $verdict, Spark_Living_Engine::snapshot( $exp ), 'rest', $note, (string) ( $params['by'] ?? '' ) );
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
