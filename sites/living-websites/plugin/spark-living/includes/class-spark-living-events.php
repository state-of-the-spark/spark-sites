<?php
/**
 * Spark Living: event collection (REST endpoint, Gravity Forms hook, staff cookie).
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Spark_Living_Events {

	private const RATE_PER_VISITOR = 60;   // Events per visitor per minute.
	private const RATE_GLOBAL      = 3000; // Events per site per minute.

	/**
	 * Hook everything in.
	 */
	public static function init(): void {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
		add_action( 'gform_after_submission', array( __CLASS__, 'on_gform_submission' ), 10, 2 );
		add_action( 'wp_login', array( __CLASS__, 'set_staff_cookie' ), 10, 2 );
		add_action( 'wp_logout', array( __CLASS__, 'clear_staff_cookie' ) );
	}

	/**
	 * Register the public event route. The route is intentionally nonce-free
	 * (cached pages cannot carry a valid nonce); it is protected by input
	 * validation, a whitelist of event types and rate limits instead.
	 */
	public static function register_routes(): void {
		register_rest_route(
			'spark-living/v1',
			'/event',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'handle_event' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	/**
	 * Build a no-cache response.
	 *
	 * @param array $data   Body.
	 * @param int   $status HTTP status.
	 * @return WP_REST_Response
	 */
	private static function respond( array $data, int $status = 202 ): WP_REST_Response {
		$response = new WP_REST_Response( $data, $status );
		$response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
		$response->header( 'Pragma', 'no-cache' );
		$response->header( 'X-Robots-Tag', 'noindex' );
		return $response;
	}

	/**
	 * Count a hit in a transient bucket; true while under the limit.
	 *
	 * @param string $key   Bucket key.
	 * @param int    $limit Limit per minute.
	 * @return bool
	 */
	private static function under_limit( string $key, int $limit ): bool {
		$count = (int) get_transient( $key );
		if ( $count >= $limit ) {
			return false;
		}
		set_transient( $key, $count + 1, MINUTE_IN_SECONDS );
		return true;
	}

	/**
	 * POST /spark-living/v1/event
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function handle_event( WP_REST_Request $request ): WP_REST_Response {
		// Bots and staff are accepted silently and never stored.
		if ( Spark_Living_Util::is_bot( Spark_Living_Util::user_agent() ) || Spark_Living_Util::has_staff_cookie() ) {
			return self::respond( array( 'ok' => true, 'stored' => false ) );
		}

		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$decoded = json_decode( (string) $request->get_body(), true ); // sendBeacon may send text/plain.
			$params  = is_array( $decoded ) ? $decoded : $request->get_body_params();
		}

		$type    = isset( $params['event_type'] ) ? sanitize_key( (string) $params['event_type'] ) : '';
		$exp_id  = isset( $params['experiment_id'] ) ? absint( $params['experiment_id'] ) : -1;
		$variant = isset( $params['variant'] ) ? strtoupper( substr( sanitize_text_field( (string) $params['variant'] ), 0, 1 ) ) : '';
		$vid     = isset( $params['visitor_id'] ) ? sanitize_text_field( (string) $params['visitor_id'] ) : '';
		$sid     = isset( $params['session_id'] ) ? sanitize_text_field( (string) $params['session_id'] ) : '';

		$valid = in_array( $type, Spark_Living_Metrics::CLIENT_TYPES, true )
			&& $exp_id >= 0
			&& in_array( $variant, array( 'A', 'B', 'H', 'L' ), true )
			&& 1 === preg_match( '/^[a-f0-9]{16,32}$/', $vid )
			&& 1 === preg_match( '/^[a-f0-9]{16,32}$/', $sid );
		if ( ! $valid ) {
			return self::respond( array( 'ok' => false, 'error' => 'invalid' ), 400 );
		}

		if ( ! self::under_limit( 'spark_living_rl_g', self::RATE_GLOBAL )
			|| ! self::under_limit( 'spark_living_rl_' . substr( md5( $vid ), 0, 16 ), self::RATE_PER_VISITOR ) ) {
			return self::respond( array( 'ok' => false, 'error' => 'rate_limited' ), 429 );
		}

		if ( ! self::experiment_accepts( $exp_id, $variant ) ) {
			return self::respond( array( 'ok' => true, 'stored' => false ) );
		}

		// One exposure and one form_start per session per experiment.
		if ( in_array( $type, array( 'exposure', 'form_start' ), true ) && Spark_Living_Metrics::has_event( $exp_id, $sid, $type ) ) {
			return self::respond( array( 'ok' => true, 'stored' => false ) );
		}

		$stored = Spark_Living_Metrics::insert_event( $exp_id, $variant, $vid, $sid, $type );
		return self::respond( array( 'ok' => true, 'stored' => $stored ) );
	}

	/**
	 * Is this experiment/variant pair one the site is currently measuring?
	 * exp 0 is "site watch" (promoted winners, no running test): variants H or L.
	 *
	 * @param int    $exp_id  Experiment ID.
	 * @param string $variant Variant.
	 * @return bool
	 */
	private static function experiment_accepts( int $exp_id, string $variant ): bool {
		if ( 0 === $exp_id ) {
			return in_array( $variant, array( 'H', 'L' ), true ) && ! Spark_Living_Store::get_running() && (bool) Spark_Living_Store::get_promoted();
		}
		$exp = Spark_Living_Store::get( $exp_id );
		return $exp
			&& Spark_Living_Store::STATUS_RUNNING === $exp['status']
			&& in_array( $variant, array( 'A', 'B', 'H' ), true );
	}

	/**
	 * Server-side form_submit from Gravity Forms. Uses the visitor's cookies;
	 * does nothing when the cookies are missing, the visitor is staff or a bot.
	 * The hook only fires when Gravity Forms is active, so no guard is needed
	 * beyond the cookie checks; the function stays inert otherwise.
	 *
	 * @param array $entry Entry (unused).
	 * @param array $form  Form (unused).
	 */
	public static function on_gform_submission( $entry = array(), $form = array() ): void {
		unset( $entry, $form );
		if ( Spark_Living_Util::is_bot( Spark_Living_Util::user_agent() ) || Spark_Living_Util::has_staff_cookie() ) {
			return;
		}
		$c = Spark_Living_Util::read_cookies();
		if ( '' === $c['vid'] || '' === $c['sid'] || $c['exp'] < 0 || '' === $c['label'] ) {
			return;
		}
		if ( ! self::experiment_accepts( $c['exp'], $c['label'] ) ) {
			return;
		}
		Spark_Living_Metrics::insert_event( $c['exp'], $c['label'], $c['vid'], $c['sid'], 'form_submit' );
	}

	/**
	 * Mark staff browsers so cached pages never assign or count them.
	 *
	 * @param string  $user_login Login (unused).
	 * @param WP_User $user       User.
	 */
	public static function set_staff_cookie( $user_login, $user ): void {
		unset( $user_login );
		if ( $user instanceof WP_User && user_can( $user, 'edit_posts' ) && ! headers_sent() ) {
			setcookie( Spark_Living_Util::COOKIE_STAFF, '1', time() + 14 * DAY_IN_SECONDS, COOKIEPATH ? COOKIEPATH : '/', COOKIE_DOMAIN, is_ssl(), false );
		}
	}

	/**
	 * Remove the staff cookie on logout.
	 */
	public static function clear_staff_cookie(): void {
		if ( ! headers_sent() ) {
			setcookie( Spark_Living_Util::COOKIE_STAFF, '', time() - YEAR_IN_SECONDS, COOKIEPATH ? COOKIEPATH : '/', COOKIE_DOMAIN, is_ssl(), false );
		}
	}
}
