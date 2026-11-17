<?php
/**
 * Spark Living: preview of a test that is not running yet (0.4.0).
 *
 * A browser that visits a page with ?sl_test=1&sl_exp=<test id>&sl_force=B sees
 * that test's challenger applied, for that browser only. Nothing is recorded
 * (test-visit mode records nothing). It works only for a signed-in administrator
 * (or a user with the build capability), or for a visitor who carries a short
 * lived signed token (&sl_pt=...) issued by POST /suggestions/{id}/preview-token.
 * For anyone else the parameter is ignored.
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Spark_Living_Preview {

	/** Seconds a preview token stays valid. */
	public const TTL = 1800;

	/** Statuses a preview may show (a test that is not running or finished). */
	public const STATUSES = array( 'suggested', 'queued', 'draft', 'awaiting_approval' );

	/**
	 * Signature over a test id and an expiry time.
	 *
	 * @param int $id  Experiment ID.
	 * @param int $exp Expiry (unix time).
	 * @return string
	 */
	private static function sig( int $id, int $exp ): string {
		return substr( hash_hmac( 'sha256', 'sl-preview|' . $id . '|' . $exp, wp_salt( 'auth' ) ), 0, 32 );
	}

	/**
	 * Make a token for one test, valid for 30 minutes.
	 *
	 * @param int      $id  Experiment ID.
	 * @param int|null $now Unix time (tests only).
	 * @return array{token: string, expires_at: string, expires_in: int}
	 */
	public static function make_token( int $id, ?int $now = null ): array {
		$now = $now ?? time();
		$exp = $now + self::TTL;
		return array(
			'token'      => $id . '.' . $exp . '.' . self::sig( $id, $exp ),
			'expires_at' => Spark_Living_Util::mysql_utc( $exp ),
			'expires_in' => self::TTL,
		);
	}

	/**
	 * Is this token valid for this test right now?
	 *
	 * @param string   $token Token.
	 * @param int      $id    Experiment ID the preview is for.
	 * @param int|null $now   Unix time (tests only).
	 * @return bool
	 */
	public static function verify( string $token, int $id, ?int $now = null ): bool {
		if ( ! preg_match( '/^(\d{1,10})\.(\d{9,11})\.([a-f0-9]{32})$/', $token, $m ) ) {
			return false;
		}
		if ( (int) $m[1] !== $id || (int) $m[2] < ( $now ?? time() ) ) {
			return false;
		}
		return hash_equals( self::sig( (int) $m[1], (int) $m[2] ), $m[3] );
	}

	/**
	 * The test this request previews, or null (the usual case). Never returns
	 * anything unless the request asks for test-visit mode in the address and is
	 * either signed in with permission or carries a valid token for that test.
	 *
	 * @return array|null Experiment.
	 */
	public static function requested_test(): ?array {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended
		if ( ! isset( $_GET['sl_test'], $_GET['sl_exp'] ) || '1' !== (string) wp_unslash( $_GET['sl_test'] ) ) {
			return null;
		}
		$id = absint( wp_unslash( $_GET['sl_exp'] ) );
		if ( $id <= 0 ) {
			return null;
		}
		$exp = Spark_Living_Store::get( $id );
		if ( ! $exp || ! in_array( $exp['status'], self::STATUSES, true ) || 'selector' !== $exp['element_type'] ) {
			return null;
		}
		$allowed = is_user_logged_in() && Spark_Living_Caps::can_build();
		if ( ! $allowed && isset( $_GET['sl_pt'] ) ) {
			$allowed = self::verify( sanitize_text_field( wp_unslash( $_GET['sl_pt'] ) ), $id );
		}
		// phpcs:enable WordPress.Security.NonceVerification.Recommended
		return $allowed ? $exp : null;
	}
}
