<?php
/**
 * Spark Living: small shared helpers (sanitizers, cookie reader, bot check).
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Spark_Living_Util {

	public const COOKIE_VISITOR    = 'spark_living';
	public const COOKIE_ASSIGNMENT = 'spark_living_a';
	public const COOKIE_SESSION    = 'spark_living_sid';
	public const COOKIE_STAFF      = 'spark_living_staff';

	/**
	 * User-agent bot check. An empty user agent counts as a bot.
	 * The JavaScript copy in assets/js/living.js uses the same pattern.
	 *
	 * @param string $ua User agent.
	 * @return bool
	 */
	public static function is_bot( string $ua ): bool {
		if ( '' === trim( $ua ) ) {
			return true;
		}
		return (bool) preg_match(
			'/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|python|curl|wget|httpclient|java\/|go-http|node-fetch|axios|phantom|selenium|puppeteer|playwright/i',
			$ua
		);
	}

	/**
	 * Current request's user agent, sanitized.
	 *
	 * @return string
	 */
	public static function user_agent(): string {
		return isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '';
	}

	/**
	 * UTC timestamp string for the database.
	 *
	 * @param int|null $ts Unix time; now when null.
	 * @return string
	 */
	public static function mysql_utc( ?int $ts = null ): string {
		return gmdate( 'Y-m-d H:i:s', $ts ?? time() );
	}

	/**
	 * Unix time for a UTC MySQL datetime string.
	 *
	 * @param string $mysql Datetime.
	 * @return int
	 */
	public static function to_ts( string $mysql ): int {
		if ( '' === $mysql ) {
			return 0;
		}
		return (int) strtotime( $mysql . ' UTC' );
	}

	/**
	 * Does the visitor carry the staff cookie (set at login for edit_posts users)?
	 *
	 * @return bool
	 */
	public static function has_staff_cookie(): bool {
		return isset( $_COOKIE[ self::COOKIE_STAFF ] ) && '1' === $_COOKIE[ self::COOKIE_STAFF ];
	}

	/**
	 * Read and validate the three Spark Living cookies.
	 *
	 * @return array{vid: string, bucket: int, sid: string, exp: int, label: string}
	 */
	public static function read_cookies(): array {
		$out = array(
			'vid'    => '',
			'bucket' => -1,
			'sid'    => '',
			'exp'    => -1,
			'label'  => '',
		);

		$raw = isset( $_COOKIE[ self::COOKIE_VISITOR ] ) ? sanitize_text_field( wp_unslash( $_COOKIE[ self::COOKIE_VISITOR ] ) ) : '';
		if ( preg_match( '/^([a-f0-9]{16,32})\.(\d{1,4})$/', $raw, $m ) ) {
			$out['vid']    = $m[1];
			$out['bucket'] = (int) $m[2];
		}

		$sid = isset( $_COOKIE[ self::COOKIE_SESSION ] ) ? sanitize_text_field( wp_unslash( $_COOKIE[ self::COOKIE_SESSION ] ) ) : '';
		if ( preg_match( '/^[a-f0-9]{16,32}$/', $sid ) ) {
			$out['sid'] = $sid;
		}

		$a = isset( $_COOKIE[ self::COOKIE_ASSIGNMENT ] ) ? sanitize_text_field( wp_unslash( $_COOKIE[ self::COOKIE_ASSIGNMENT ] ) ) : '';
		if ( preg_match( '/^(\d{1,10}):([ABHL])$/', $a, $m ) ) {
			$out['exp']   = (int) $m[1];
			$out['label'] = $m[2];
		}

		return $out;
	}

	/**
	 * Validate a CSS selector used by the selector-swap engine. Returns an empty
	 * string when the selector is not acceptable.
	 *
	 * @param mixed $selector Raw selector.
	 * @return string
	 */
	public static function sanitize_selector( $selector ): string {
		$selector = trim( (string) $selector );
		if ( '' === $selector || strlen( $selector ) > 200 ) {
			return '';
		}
		if ( preg_match( '/[{};\\\\<@]|\/\*/', $selector ) ) {
			return '';
		}
		if ( ! preg_match( '/^[A-Za-z0-9\s\.\#\-\_\>\+\~\,\:\[\]\=\"\'\(\)\*\^\$\|]+$/', $selector ) ) {
			return '';
		}
		return $selector;
	}

	/**
	 * Allow http, https, tel, mailto, root-relative paths and fragments.
	 *
	 * @param mixed $url Raw URL.
	 * @return string
	 */
	public static function sanitize_href( $url ): string {
		$url = trim( (string) $url );
		if ( '' === $url ) {
			return '';
		}
		if ( preg_match( '/^(#|\/(?!\/))/', $url ) ) {
			return esc_url_raw( $url );
		}
		return esc_url_raw( $url, array( 'http', 'https', 'tel', 'mailto' ) );
	}

	/**
	 * A single CSS class name.
	 *
	 * @param mixed $class_name Raw class.
	 * @return string
	 */
	public static function sanitize_class( $class_name ): string {
		$class_name = trim( (string) $class_name );
		return preg_match( '/^[A-Za-z_][A-Za-z0-9_-]{0,60}$/', $class_name ) ? $class_name : '';
	}

	/**
	 * Inline style declarations: simple "property: value" pairs only.
	 *
	 * @param mixed $css Raw declarations.
	 * @return string
	 */
	public static function sanitize_style( $css ): string {
		$clean = array();
		foreach ( explode( ';', (string) $css ) as $decl ) {
			$decl = trim( $decl );
			if ( '' === $decl || false === strpos( $decl, ':' ) ) {
				continue;
			}
			list( $prop, $value ) = array_map( 'trim', explode( ':', $decl, 2 ) );
			$prop                 = strtolower( $prop );
			if ( ! preg_match( '/^-?[a-z][a-z-]{1,40}$/', $prop ) ) {
				continue;
			}
			if ( '' === $value || strlen( $value ) > 120 ) {
				continue;
			}
			if ( preg_match( '/[{}<>\\\\]|url\s*\(|expression|javascript:|@import|\/\*/i', $value ) ) {
				continue;
			}
			$clean[] = $prop . ':' . $value;
		}
		return $clean ? implode( ';', $clean ) . ';' : '';
	}

	/**
	 * Sanitize the CSS snippet a challenger may carry (visibility / CSS variant).
	 *
	 * The snippet is applied only while that variant is active, by a style
	 * element the head script creates from a text node. It is still stripped:
	 * every `<`, backslash (CSS escapes could rebuild a blocked word), `@import`,
	 * `url(`, `expression` and `javascript:` is removed, repeatedly, so a word
	 * cannot be rebuilt from the pieces left after a removal. Capped at 2000
	 * characters.
	 *
	 * @param mixed $css Raw CSS.
	 * @return string
	 */
	public static function sanitize_css( $css ): string {
		$css = (string) $css;
		// Control characters (including NUL) are never valid in a stylesheet.
		$css = (string) preg_replace( '/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $css );
		do {
			$before = $css;
			$css    = str_replace( array( '<', '\\' ), '', $css );
			$css    = (string) preg_replace( '/@\s*import|url\s*\(|expression|javascript\s*:/i', '', $css );
		} while ( $css !== $before );
		return trim( substr( $css, 0, 2000 ) );
	}

	/**
	 * The change type a test may declare (what is being tested).
	 *
	 * @param mixed $type Raw type.
	 * @return string One of Spark_Living_Store::CHANGE_TYPES, or an empty string.
	 */
	public static function sanitize_change_type( $type ): string {
		$type = strtolower( trim( sanitize_text_field( (string) $type ) ) );
		return in_array( $type, Spark_Living_Store::CHANGE_TYPES, true ) ? $type : '';
	}

	/**
	 * A short plain-text description of what one variant shows (a_label, b_label).
	 * Same sanitiser as the other text fields, capped at 200 characters.
	 *
	 * @param mixed $label Raw label.
	 * @return string
	 */
	public static function sanitize_label( $label ): string {
		$label = sanitize_text_field( (string) $label );
		return function_exists( 'mb_substr' ) ? mb_substr( $label, 0, 200 ) : substr( $label, 0, 200 );
	}

	/**
	 * Sanitize a list of selector-swap changes.
	 *
	 * Allowed ops: text, href, add_class, remove_class, style.
	 *
	 * @param mixed $changes Raw list of {op, value}.
	 * @return array<int, array{op: string, value: string}>
	 */
	public static function sanitize_changes( $changes ): array {
		$out = array();
		if ( ! is_array( $changes ) ) {
			return $out;
		}
		foreach ( array_slice( $changes, 0, 10 ) as $change ) {
			if ( ! is_array( $change ) || empty( $change['op'] ) ) {
				continue;
			}
			$op    = (string) $change['op'];
			$value = $change['value'] ?? '';
			switch ( $op ) {
				case 'text':
					$value = sanitize_text_field( (string) $value );
					break;
				case 'href':
					$value = self::sanitize_href( $value );
					break;
				case 'add_class':
				case 'remove_class':
					$value = self::sanitize_class( $value );
					break;
				case 'style':
					$value = self::sanitize_style( $value );
					break;
				default:
					continue 2;
			}
			if ( '' === $value && 'text' !== $op ) {
				continue;
			}
			$out[] = array(
				'op'    => $op,
				'value' => $value,
			);
		}
		return $out;
	}

	/**
	 * Flush page caches so cached pages stop carrying stale allocation weights
	 * or a stale live set. Every call is guarded, so this is safe on any host.
	 * Called after the nightly job changes weights, concludes a test or reverts
	 * a winner, and when a test starts or ends.
	 */
	public static function flush_page_cache(): void {
		if ( function_exists( 'wp_cache_flush' ) ) {
			wp_cache_flush();
		}
		// Batcache (Pressable page cache): clear the home URL.
		if ( function_exists( 'batcache_clear_url' ) ) {
			batcache_clear_url( home_url( '/' ) );
		}
		// Common cache plugins.
		if ( function_exists( 'rocket_clean_domain' ) ) {
			rocket_clean_domain();
		}
		if ( function_exists( 'w3tc_flush_all' ) ) {
			w3tc_flush_all();
		}
		if ( function_exists( 'wp_cache_clear_cache' ) ) {
			wp_cache_clear_cache();
		}
		if ( function_exists( 'sg_cachepress_purge_cache' ) ) {
			sg_cachepress_purge_cache();
		}
		if ( function_exists( 'wpfc_clear_all_cache' ) ) {
			wpfc_clear_all_cache( true );
		}
		if ( has_action( 'litespeed_purge_all' ) ) {
			do_action( 'litespeed_purge_all' ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound
		}
		/**
		 * Lets a site add its own purge (for example a host-specific cache plugin).
		 */
		do_action( 'spark_living_flush_cache' );
	}
}
