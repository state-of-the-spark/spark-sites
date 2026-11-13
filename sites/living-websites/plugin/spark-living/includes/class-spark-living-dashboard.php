<?php
/**
 * Spark Living: dashboard. One view, shown at /living/ (404 for anyone without
 * manage_options), through the [spark_living_dashboard] shortcode, and in
 * wp-admin under "Living Websites".
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Spark_Living_Dashboard {

	/**
	 * Hook everything in.
	 */
	public static function init(): void {
		add_action( 'init', array( __CLASS__, 'add_rewrite' ) );
		add_filter( 'query_vars', array( __CLASS__, 'query_vars' ) );
		add_action( 'template_redirect', array( __CLASS__, 'maybe_render_front' ) );
		add_shortcode( 'spark_living_dashboard', array( __CLASS__, 'shortcode' ) );

		add_action( 'admin_menu', array( __CLASS__, 'admin_menu' ) );
		add_action( 'admin_post_spark_living_create', array( __CLASS__, 'handle_create' ) );
		add_action( 'admin_post_spark_living_start', array( __CLASS__, 'handle_start' ) );
		add_action( 'admin_post_spark_living_conclude', array( __CLASS__, 'handle_conclude' ) );
	}

	/**
	 * Rewrite rule for /living/. Flushed on activation and once per version.
	 */
	public static function add_rewrite(): void {
		add_rewrite_rule( '^living/?$', 'index.php?spark_living_dash=1', 'top' );
		if ( get_option( 'spark_living_rewrite_version' ) !== SPARK_LIVING_VERSION ) {
			flush_rewrite_rules( false );
			update_option( 'spark_living_rewrite_version', SPARK_LIVING_VERSION, false );
		}
	}

	/**
	 * Register the query var.
	 *
	 * @param string[] $vars Query vars.
	 * @return string[]
	 */
	public static function query_vars( array $vars ): array {
		$vars[] = 'spark_living_dash';
		return $vars;
	}

	/**
	 * Answer 404 and stop.
	 */
	private static function send_404(): void {
		global $wp_query;
		if ( $wp_query ) {
			$wp_query->set_404();
		}
		status_header( 404 );
		nocache_headers();
		$template = get_404_template();
		if ( $template ) {
			include $template;
		} else {
			echo 'Not found';
		}
		exit;
	}

	/**
	 * Front-end routing: /living/ and any page carrying the shortcode.
	 */
	public static function maybe_render_front(): void {
		$is_route     = (bool) get_query_var( 'spark_living_dash' );
		$is_shortcode = false;
		if ( ! $is_route && is_singular() ) {
			$post         = get_queried_object();
			$is_shortcode = $post instanceof WP_Post && has_shortcode( (string) $post->post_content, 'spark_living_dashboard' );
		}
		if ( ! $is_route && ! $is_shortcode ) {
			return;
		}

		if ( ! defined( 'DONOTCACHEPAGE' ) ) {
			define( 'DONOTCACHEPAGE', true );
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			self::send_404();
		}
		if ( ! $is_route ) {
			return; // The shortcode renders inside the theme.
		}

		nocache_headers();
		header( 'X-Robots-Tag: noindex, nofollow' );
		?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title><?php echo esc_html( sprintf( /* translators: %s: site name */ __( 'Living Website: %s', 'spark-living' ), get_bloginfo( 'name' ) ) ); ?></title>
</head>
<body class="sl-page">
<main>
		<?php echo self::render_view( false ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</main>
</body>
</html>
		<?php
		exit;
	}

	/**
	 * Shortcode callback.
	 *
	 * @return string
	 */
	public static function shortcode(): string {
		if ( ! current_user_can( 'manage_options' ) ) {
			return '';
		}
		return self::render_view( false );
	}

	/**
	 * Admin menu.
	 */
	public static function admin_menu(): void {
		add_menu_page(
			__( 'Living Websites', 'spark-living' ),
			__( 'Living Websites', 'spark-living' ),
			'manage_options',
			'spark-living',
			array( __CLASS__, 'render_admin_page' ),
			'dashicons-chart-line',
			58
		);
	}

	/**
	 * Percent text.
	 *
	 * @param float|null $v Fraction.
	 * @param int        $d Decimals.
	 * @return string
	 */
	private static function pct( ?float $v, int $d = 1 ): string {
		return null === $v ? "\u{2014}" : number_format_i18n( $v * 100, $d ) . '%';
	}

	/**
	 * Signed percent text for a lift fraction.
	 *
	 * @param float|null $v Fraction.
	 * @return string
	 */
	private static function lift( ?float $v ): string {
		if ( null === $v ) {
			return "\u{2014}";
		}
		return ( $v >= 0 ? '+' : '' ) . number_format_i18n( $v * 100, 1 ) . '%';
	}

	/**
	 * Date for display, in the site timezone.
	 *
	 * @param string $mysql_utc UTC datetime.
	 * @return string
	 */
	private static function date( string $mysql_utc ): string {
		$ts = Spark_Living_Util::to_ts( $mysql_utc );
		return $ts ? wp_date( get_option( 'date_format' ), $ts ) : "\u{2014}";
	}

	/**
	 * Human label for a verdict key.
	 *
	 * @param string $verdict Verdict.
	 * @return string
	 */
	private static function verdict_label( string $verdict ): string {
		$labels = array(
			'ship_b'        => __( 'Challenger won and shipped', 'spark-living' ),
			'keep_a'        => __( 'Current version won', 'spark-living' ),
			'no_difference' => __( 'No difference; kept current', 'spark-living' ),
			'guard_blocked' => __( 'Blocked by lead guard; kept current', 'spark-living' ),
			'reverted'      => __( 'Reverted after a drop in leads', 'spark-living' ),
		);
		return $labels[ $verdict ] ?? $verdict;
	}

	/**
	 * Human label for a test's device scope.
	 *
	 * @param string $device all, mobile or desktop.
	 * @return string
	 */
	private static function device_label( string $device ): string {
		if ( 'mobile' === $device ) {
			return __( 'Mobile only (viewport 980px or narrower).', 'spark-living' );
		}
		if ( 'desktop' === $device ) {
			return __( 'Desktop only (viewport wider than 980px).', 'spark-living' );
		}
		return __( 'All devices.', 'spark-living' );
	}

	/**
	 * The "started below the bar" note.
	 *
	 * @param int $sessions Sessions stated at start (0 when none was given).
	 * @return string
	 */
	private static function forced_label( int $sessions ): string {
		$bar = Spark_Living_Stats::ELIGIBILITY_SESSIONS;
		if ( $sessions > 0 ) {
			return sprintf( /* translators: 1: session bar, 2: sessions stated at start */ __( 'Started below the %1$d-session bar (%2$s sessions in the last 14 days).', 'spark-living' ), $bar, number_format_i18n( $sessions ) );
		}
		return sprintf( /* translators: %d: session bar */ __( 'Started below the %d-session bar (no session count given).', 'spark-living' ), $bar );
	}

	/**
	 * Inline CSS (plain, accessible, light and dark).
	 *
	 * @return string
	 */
	private static function css(): string {
		return '<style>
.sl-dash{--sl-bg:#ffffff;--sl-fg:#1b2a22;--sl-muted:#4a5a51;--sl-line:#c9d6cd;--sl-accent:#1f6b3a;--sl-card:#f4f8f5;--sl-warn:#8a4b00;max-width:60rem;margin:0 auto;padding:1rem 1rem 3rem;color:var(--sl-fg);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
body.sl-page{margin:0;background:#ffffff}
@media (prefers-color-scheme:dark){body.sl-page{background:#0f1a14}.sl-dash{--sl-bg:#0f1a14;--sl-fg:#e6efe9;--sl-muted:#a9bbb0;--sl-line:#2c4036;--sl-accent:#7fd39b;--sl-card:#16251c;--sl-warn:#f0b36a}}
.sl-dash h1{font-size:1.6rem;margin:0 0 .25rem}
.sl-dash h2{font-size:1.2rem;margin:2rem 0 .5rem;padding-top:1rem;border-top:1px solid var(--sl-line)}
.sl-dash p.sl-muted,.sl-dash .sl-muted{color:var(--sl-muted)}
.sl-dash table{border-collapse:collapse;width:100%;margin:.5rem 0}
.sl-dash caption{text-align:left;font-weight:600;padding:.25rem 0}
.sl-dash th,.sl-dash td{border:1px solid var(--sl-line);padding:.4rem .6rem;text-align:left}
.sl-dash td.sl-num,.sl-dash th.sl-num{text-align:right;font-variant-numeric:tabular-nums}
.sl-dash thead th{background:var(--sl-card)}
.sl-dash .sl-card{background:var(--sl-card);border:1px solid var(--sl-line);border-radius:6px;padding:.75rem 1rem;margin:.5rem 0}
.sl-dash .sl-verdict{font-weight:600}
.sl-dash ul.sl-tally{list-style:none;margin:.75rem 0;padding:0;display:flex;flex-wrap:wrap;gap:.5rem}
.sl-dash ul.sl-tally li{background:var(--sl-card);border:1px solid var(--sl-line);border-radius:6px;padding:.5rem .8rem;min-width:9rem}
.sl-dash ul.sl-tally li strong{display:block;font-size:1.5rem;line-height:1.2;font-variant-numeric:tabular-nums}
.sl-dash ul.sl-tally li.sl-evolved{border-color:var(--sl-accent)}
.sl-dash .sl-warn{color:var(--sl-warn);font-weight:600}
.sl-dash ol.sl-rings{list-style:none;margin:0;padding:0 0 0 1.25rem;border-left:3px solid var(--sl-accent)}
.sl-dash ol.sl-rings>li{position:relative;margin:0 0 1rem;padding:.25rem 0 .25rem .75rem}
.sl-dash ol.sl-rings>li::before{content:"";position:absolute;left:-1.7rem;top:.6rem;width:.75rem;height:.75rem;border-radius:50%;background:var(--sl-bg);border:3px solid var(--sl-accent)}
.sl-dash .sl-bar{display:inline-block;height:.6rem;background:var(--sl-accent);border-radius:3px;vertical-align:middle}
.sl-dash form label{display:block;margin:.5rem 0 .15rem;font-weight:600}
.sl-dash form input[type=text],.sl-dash form select,.sl-dash form textarea{width:100%;max-width:36rem}
/* Load animations (0.1.3): a vine grows to 75 percent of the width, a Spark burst grows out of its tip, and at that same moment bubbles rise through the evolved card. One timing value (--sl-stem) drives all three, so they cannot drift apart. Transform and opacity only. */
.sl-dash{--sl-vine:#238a4a;--sl-spark:#0ECAEB;--sl-stem:1.8s;--sl-burst-at:var(--sl-stem);--sl-burst-dur:.55s}
@media (prefers-color-scheme:dark){.sl-dash{--sl-vine:#7fd39b}}
.sl-dash .sl-vine{display:block;width:100%;height:auto;margin:.4rem 0 .6rem;overflow:visible}
.sl-vine .sl-stem{fill:none;stroke:var(--sl-vine);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1000 1000;stroke-dashoffset:1000;animation:sl-grow var(--sl-stem) cubic-bezier(.25,.6,.35,1) both}
.sl-vine .sl-tend{fill:none;stroke:var(--sl-vine);stroke-width:1.3;stroke-linecap:round;stroke-dasharray:30 100;stroke-dashoffset:30;animation:sl-grow .7s ease-out both}
.sl-vine .sl-leaf{fill:var(--sl-vine);fill-opacity:.9;transform-origin:0 0;animation:sl-unfurl .7s cubic-bezier(.2,.8,.3,1.15) both}
.sl-vine .sl-burst{fill:var(--sl-spark);transform-origin:0 0;animation:sl-burst var(--sl-burst-dur) cubic-bezier(.2,.9,.3,1.4) var(--sl-burst-at) both}
.sl-vine .sl-bscale{transform:scale(1)}
.sl-vine .sl-vein{fill:none;stroke:rgba(255,255,255,.55);stroke-width:.8;stroke-linecap:round}
@media (max-width:600px){.sl-vine .sl-stem{stroke-width:3.4}.sl-vine .sl-tend{stroke-width:2.2}.sl-vine .sl-bscale{transform:scale(1.5)}}
@keyframes sl-grow{to{stroke-dashoffset:0}}
@keyframes sl-unfurl{0%{transform:scale(0) rotate(-40deg);opacity:0}50%{opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
@keyframes sl-burst{0%{transform:scale(0) rotate(-30deg)}65%{transform:scale(1.18) rotate(5deg)}100%{transform:scale(1) rotate(0)}}
.sl-dash ul.sl-tally li.sl-evolved{position:relative;overflow:hidden;isolation:isolate}
.sl-evolved::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(to top,rgba(14,202,235,.34),rgba(14,202,235,.15) 50%,rgba(14,202,235,.02));opacity:.78;animation:sl-wash 2.6s ease-out calc(var(--sl-burst-at) + .1s) both}
.sl-evolved .sl-bub{--r:-110px;position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
.sl-evolved .sl-bub i{position:absolute;left:var(--x);top:100%;width:var(--s);height:var(--s);border-radius:50%;background:var(--sl-spark);opacity:0;animation:sl-rise var(--t) linear calc(var(--sl-burst-at) + var(--d)) both,sl-wob calc(var(--t) / 2.2) ease-in-out calc(var(--sl-burst-at) + var(--d)) infinite alternate both}
.sl-evolved .sl-bub i.r{background:rgba(14,202,235,.4);box-shadow:inset 0 0 0 1px rgba(160,240,252,.95)}
@keyframes sl-rise{0%{transform:translate3d(0,0,0);opacity:0}10%{opacity:var(--o)}80%{opacity:var(--o)}100%{transform:translate3d(0,var(--r),0);opacity:0}}
@keyframes sl-wob{from{translate:calc(var(--w) * -1) 0}to{translate:var(--w) 0}}
@keyframes sl-wash{0%{opacity:0}45%{opacity:1}100%{opacity:.78}}
@media (prefers-reduced-motion:reduce){.sl-vine .sl-stem,.sl-vine .sl-tend{animation:none;stroke-dashoffset:0}.sl-vine .sl-leaf,.sl-vine .sl-burst{animation:none}.sl-evolved::before{animation:none;opacity:.78}.sl-evolved .sl-bub{display:none}}
/* Data sources and Current versus Challenger (0.1.4). */
.sl-dash{--sl-live:#1f6b3a;--sl-grey:#7a8780;--sl-chal:#0b7a8f}
@media (prefers-color-scheme:dark){.sl-dash{--sl-live:#7fd39b;--sl-grey:#8d9c93;--sl-chal:#4fd3ea}}
.sl-dash .sl-sources{margin:1.25rem 0 .75rem}
.sl-dash .sl-sources h3{font-size:1rem;margin:0 0 .4rem}
.sl-dash ul.sl-src-list{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.6rem}
.sl-dash li.sl-src{display:flex;align-items:flex-start;gap:.6rem;background:var(--sl-card);border:1px solid var(--sl-line);border-radius:8px;padding:.55rem .8rem;flex:1 1 17rem;min-width:0;max-width:100%}
.sl-dash .sl-src-ico{flex:0 0 auto;box-sizing:border-box;width:24px;height:24px;padding:3px;margin-top:.1rem;background:#fff;border:1px solid var(--sl-line);border-radius:5px;display:flex;align-items:center;justify-content:center}
.sl-dash .sl-src-ico svg,.sl-dash .sl-src-ico img{display:block;width:16px;height:16px;object-fit:contain}
.sl-dash .sl-src-body{display:flex;flex-direction:column;gap:.1rem;min-width:0}
.sl-dash .sl-src-top{display:flex;flex-wrap:wrap;align-items:center;gap:.15rem .6rem}
.sl-dash .sl-src-name{font-size:.95rem}
.sl-dash .sl-src-state{display:inline-flex;align-items:center;gap:.35rem;font-size:.85rem;font-weight:600}
.sl-dash .sl-dot{display:inline-block;width:.65rem;height:.65rem;border-radius:50%;background:var(--sl-grey)}
.sl-dash li.sl-src-live .sl-dot{background:var(--sl-live);box-shadow:0 0 0 3px color-mix(in srgb,var(--sl-live) 25%,transparent)}
.sl-dash li.sl-src-paused .sl-src-state{color:var(--sl-muted)}
.sl-dash .sl-src-what,.sl-dash .sl-src-detail{font-size:.85rem;line-height:1.4;color:var(--sl-muted);overflow-wrap:anywhere}
.sl-dash p.sl-cmp-type{margin:.75rem 0 .4rem}
.sl-dash dl.sl-cmp{margin:0;display:grid;grid-template-columns:minmax(0,1fr);gap:.5rem}
.sl-dash .sl-cmp-row{display:grid;grid-template-columns:9.5rem minmax(0,1fr);gap:.2rem .9rem;align-items:baseline;padding:.5rem .75rem;border:1px solid var(--sl-line);border-left-width:5px;border-radius:6px;background:var(--sl-bg)}
.sl-dash .sl-cmp-a{border-left-color:var(--sl-grey)}
.sl-dash .sl-cmp-b{border-left-color:var(--sl-chal)}
.sl-dash .sl-cmp-row dt{margin:0;font-weight:700}
.sl-dash .sl-cmp-row dt .sl-muted{display:block;font-weight:400;font-size:.8rem}
.sl-dash .sl-cmp-row dd{margin:0;overflow-wrap:anywhere}
.sl-dash .sl-pill{display:inline-block;max-width:100%;padding:.2rem .85rem;border-radius:999px;border:1px solid var(--sl-line);background:var(--sl-card);font-weight:600;line-height:1.35}
.sl-dash .sl-cmp-b .sl-pill{border-color:var(--sl-chal);box-shadow:inset 0 0 0 1px var(--sl-chal)}
.sl-dash .sl-cmp-q{font-weight:600}
.sl-dash .sl-cmp-plain{font-style:italic}
.sl-dash .sl-sel{font-size:.8rem;opacity:.9}
@media (max-width:600px){.sl-dash table{display:block;max-width:100%;overflow-x:auto}.sl-dash .sl-cmp-row{grid-template-columns:minmax(0,1fr)}.sl-dash .sl-cmp-row dt .sl-muted{display:inline;margin-left:.4rem}.sl-dash li.sl-src{flex-basis:100%}}
.sl-dash a:focus,.sl-dash button:focus,.sl-dash input:focus,.sl-dash select:focus,.sl-dash textarea:focus{outline:3px solid var(--sl-accent);outline-offset:2px}
</style>';
	}

	/**
	 * The vine ornament: one inline SVG, static markup, animated by the CSS above.
	 *
	 * @return string
	 */
	private static function vine(): string {
		return '<svg class="sl-vine" viewBox="0 2 800 48" preserveAspectRatio="xMinYMid meet" aria-hidden="true" focusable="false"><path class="sl-stem" pathLength="1000" d="M4 30 C50 20, 100 38, 160 29 C220 20, 260 18, 320 28 C380 38, 430 40, 490 30 C530 23, 570 22, 600 27"/><path class="sl-tend" style="animation-delay:0.29s" d="M233.6 20.5c3 -8 10 -9 9 -3c-1 3 -5 2 -4 -1" pathLength="30"/><path class="sl-tend" style="animation-delay:0.71s" d="M466.1 34.4c-3 8 -10 9 -9 3c1 -3 5 -2 4 1" pathLength="30"/><g transform="translate(45.7 27.0) rotate(-41.8)"><g class="sl-leaf" style="animation-delay:0.03s"><path d="M0 0C4.8 5.9 13.6 7.1 22.0 2.2C14.1 -4.5 5.5 -5.0 0 0Z"/><path class="sl-vein" d="M0 0Q11.0 0.4 18.0 1.8"/></g></g><g transform="translate(117.4 31.6) rotate(48.6)"><g class="sl-leaf" style="animation-delay:0.12s"><path d="M0 0C6.4 -7.8 18.0 -9.4 29.0 -2.9C18.6 6.0 7.3 6.7 0 0Z"/><path class="sl-vein" d="M0 0Q14.5 -0.6 23.8 -2.3"/></g></g><g transform="translate(194.8 24.4) rotate(-46.8)"><g class="sl-leaf" style="animation-delay:0.22s"><path d="M0 0C5.5 6.8 15.5 8.1 25.0 2.5C16.0 -5.2 6.3 -5.7 0 0Z"/><path class="sl-vein" d="M0 0Q12.5 0.5 20.5 2.0"/></g></g><g transform="translate(272.5 22.2) rotate(59.3)"><g class="sl-leaf" style="animation-delay:0.32s"><path d="M0 0C6.8 -8.4 19.2 -10.0 31.0 -3.1C19.8 6.4 7.8 7.1 0 0Z"/><path class="sl-vein" d="M0 0Q15.5 -0.6 25.4 -2.5"/></g></g><g transform="translate(349.6 32.4) rotate(-53.7)"><g class="sl-leaf" style="animation-delay:0.44s"><path d="M0 0C5.7 7.0 16.1 8.4 26.0 2.6C16.6 -5.4 6.5 -6.0 0 0Z"/><path class="sl-vein" d="M0 0Q13.0 0.5 21.3 2.1"/></g></g><g transform="translate(427.3 36.4) rotate(53.9)"><g class="sl-leaf" style="animation-delay:0.59s"><path d="M0 0C6.4 -7.8 18.0 -9.4 29.0 -2.9C18.6 6.0 7.3 6.7 0 0Z"/><path class="sl-vein" d="M0 0Q14.5 -0.6 23.8 -2.3"/></g></g><g transform="translate(504.6 27.7) rotate(-59.8)"><g class="sl-leaf" style="animation-delay:0.81s"><path d="M0 0C4.4 5.4 12.4 6.5 20.0 2.0C12.8 -4.1 5.0 -4.6 0 0Z"/><path class="sl-vein" d="M0 0Q10.0 0.4 16.4 1.6"/></g></g><g transform="translate(600 27)"><g class="sl-burst"><g class="sl-bscale"><path d="M4.60 -1.88L4.94 -0.50L15.92 -2.68L15.31 -5.11ZM4.78 1.35L4.20 2.65L11.33 6.42L12.35 4.13ZM2.94 4.01L1.68 4.68L6.87 15.59L9.08 14.41ZM-0.15 4.97L-1.56 4.72L-3.41 12.11L-0.94 12.54ZM-3.18 3.82L-4.13 2.76L-12.46 9.54L-10.79 11.40ZM-4.86 1.06L-4.95 -0.37L-13.46 -0.31L-13.29 2.18ZM-4.48 -2.16L-3.68 -3.34L-13.38 -10.54L-14.78 -8.46ZM-2.20 -4.46L-0.84 -4.90L-2.68 -12.29L-5.06 -11.52ZM1.01 -4.87L2.35 -4.38L6.37 -13.85L4.02 -14.71Z"/><circle r="1.79"/></g></g></g></svg>';
	}

	/**
	 * Carbonation bubbles for the evolved card (decorative, hidden from assistive tech).
	 * The small script sets how far they rise to the card height; without it the CSS default is used.
	 *
	 * @return string
	 */
	private static function bubbles(): string {
		return '<span class="sl-bub" aria-hidden="true"><i style="--x:89%;--s:2px;--d:0.12s;--t:1.11s;--o:0.75;--w:4.7px"></i><i style="--x:73%;--s:3px;--d:0.52s;--t:1.36s;--o:0.73;--w:5.2px"></i><i class="r" style="--x:26%;--s:4px;--d:0.18s;--t:1.48s;--o:0.73;--w:2.3px"></i><i style="--x:47%;--s:4px;--d:0.71s;--t:1.56s;--o:0.42;--w:4.6px"></i><i style="--x:67%;--s:5px;--d:0.41s;--t:1.38s;--o:0.85;--w:6.5px"></i><i style="--x:35%;--s:3px;--d:0.61s;--t:1.20s;--o:0.43;--w:3.5px"></i><i style="--x:31%;--s:3px;--d:0.73s;--t:1.37s;--o:0.75;--w:6.4px"></i><i class="r" style="--x:29%;--s:2px;--d:0.34s;--t:1.33s;--o:0.58;--w:3.0px"></i><i style="--x:9%;--s:5px;--d:0.18s;--t:1.21s;--o:0.72;--w:6.6px"></i><i style="--x:19%;--s:4px;--d:0.21s;--t:1.16s;--o:0.55;--w:4.1px"></i><i style="--x:53%;--s:3px;--d:0.38s;--t:1.12s;--o:0.85;--w:4.3px"></i><i style="--x:62%;--s:5px;--d:0.40s;--t:1.34s;--o:0.63;--w:5.4px"></i><i class="r" style="--x:40%;--s:5px;--d:0.48s;--t:1.14s;--o:0.67;--w:3.8px"></i><i style="--x:40%;--s:3px;--d:0.57s;--t:1.61s;--o:0.41;--w:6.1px"></i><i style="--x:41%;--s:2px;--d:0.05s;--t:1.01s;--o:0.90;--w:3.1px"></i><i style="--x:17%;--s:4px;--d:0.25s;--t:1.39s;--o:0.43;--w:6.6px"></i><i style="--x:86%;--s:5px;--d:0.67s;--t:1.63s;--o:0.77;--w:3.4px"></i><i class="r" style="--x:27%;--s:2px;--d:0.02s;--t:0.95s;--o:0.69;--w:3.2px"></i><i style="--x:49%;--s:4px;--d:0.46s;--t:1.13s;--o:0.84;--w:3.2px"></i><i style="--x:86%;--s:3px;--d:0.03s;--t:1.32s;--o:0.35;--w:6.6px"></i><i style="--x:89%;--s:4px;--d:0.00s;--t:1.63s;--o:0.45;--w:6.8px"></i><i style="--x:67%;--s:4px;--d:0.11s;--t:1.12s;--o:0.46;--w:4.8px"></i><i class="r" style="--x:75%;--s:2px;--d:0.47s;--t:1.49s;--o:0.62;--w:2.2px"></i><i style="--x:89%;--s:2px;--d:0.04s;--t:1.47s;--o:0.84;--w:2.2px"></i><i style="--x:83%;--s:5px;--d:0.79s;--t:1.67s;--o:0.77;--w:4.1px"></i><i style="--x:71%;--s:3px;--d:0.66s;--t:1.25s;--o:0.48;--w:4.0px"></i><i style="--x:55%;--s:5px;--d:0.17s;--t:1.42s;--o:0.75;--w:3.7px"></i><i class="r" style="--x:43%;--s:4px;--d:0.07s;--t:1.18s;--o:0.89;--w:7.0px"></i><i style="--x:84%;--s:4px;--d:0.70s;--t:1.10s;--o:0.70;--w:2.7px"></i><i style="--x:55%;--s:3px;--d:0.54s;--t:1.66s;--o:0.62;--w:2.9px"></i></span><script>(function(){function f(){var b=document.querySelectorAll(".sl-evolved .sl-bub");for(var i=0;i<b.length;i++){b[i].style.setProperty("--r",-(b[i].offsetHeight+6)+"px");}}if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",f);}else{f();}})();</script>';
	}

	/**
	 * The dashboard body. Used by every surface.
	 *
	 * @param bool $admin_controls Show create/approve/conclude forms (wp-admin only).
	 * @return string HTML (every dynamic value is escaped here).
	 */
	public static function render_view( bool $admin_controls ): string {
		$running = Spark_Living_Store::get_running();
		$lift    = Spark_Living_Engine::lift_summary();
		$log     = Spark_Living_Store::log_entries( 100, 1 );
		$tally   = Spark_Living_Store::verdict_tally();

		ob_start();
		echo self::css(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		?>
<div class="sl-dash">
	<h1><?php esc_html_e( 'Living Website', 'spark-living' ); ?></h1>
	<p class="sl-muted"><?php echo esc_html( sprintf( /* translators: 1: site name, 2: number of evolutions */ _n( '%1$s has evolved %2$s time.', '%1$s has evolved %2$s times.', $tally['evolved'], 'spark-living' ), get_bloginfo( 'name' ), number_format_i18n( $tally['evolved'] ) ) ); ?></p>
	<?php echo self::vine(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	<p class="sl-muted"><?php esc_html_e( 'Evolved means a challenger won and shipped. Tests that ended with no difference, or where the original won, are counted separately.', 'spark-living' ); ?></p>
	<ul class="sl-tally" id="sl-tally" aria-label="<?php esc_attr_e( 'Test outcomes', 'spark-living' ); ?>">
		<li class="sl-evolved" data-sl-tally="evolved"><strong><?php echo esc_html( number_format_i18n( $tally['evolved'] ) ); ?></strong> <?php esc_html_e( 'evolved (challenger won and shipped)', 'spark-living' ); ?><?php echo self::bubbles(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></li>
		<li data-sl-tally="keep_a"><strong><?php echo esc_html( number_format_i18n( $tally['keep_a'] ) ); ?></strong> <?php esc_html_e( 'original won', 'spark-living' ); ?></li>
		<li data-sl-tally="no_difference"><strong><?php echo esc_html( number_format_i18n( $tally['no_difference'] ) ); ?></strong> <?php esc_html_e( 'no difference', 'spark-living' ); ?></li>
			<?php if ( $tally['guard_blocked'] > 0 ) : ?>
		<li data-sl-tally="guard_blocked"><strong><?php echo esc_html( number_format_i18n( $tally['guard_blocked'] ) ); ?></strong> <?php esc_html_e( 'blocked by the lead guard', 'spark-living' ); ?></li>
		<?php endif; ?>
			<?php if ( $tally['reverted'] > 0 ) : ?>
		<li data-sl-tally="reverted"><strong><?php echo esc_html( number_format_i18n( $tally['reverted'] ) ); ?></strong> <?php esc_html_e( 'shipped, then reverted', 'spark-living' ); ?></li>
		<?php endif; ?>
	</ul>

	<h2 id="sl-current"><?php esc_html_e( 'Current test', 'spark-living' ); ?></h2>
		<?php
		if ( $running ) {
			self::render_running( $running, $admin_controls );
		} else {
			echo '<p>' . esc_html__( 'No test is running right now. The next one starts as soon as the brain queues it.', 'spark-living' ) . '</p>';
			echo Spark_Living_Sources::render(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}
		if ( $admin_controls ) {
			self::render_queue();
		}
		?>

	<h2 id="sl-timeline"><?php esc_html_e( 'Test history', 'spark-living' ); ?></h2>
		<?php if ( empty( $log['items'] ) ) : ?>
	<p><?php esc_html_e( 'No test has concluded yet. Each finished test will appear here as a ring in the timeline, whatever the outcome.', 'spark-living' ); ?></p>
		<?php else : ?>
	<ol class="sl-rings">
			<?php foreach ( $log['items'] as $item ) : ?>
				<?php
				$numbers = is_array( $item['numbers'] ) ? $item['numbers'] : array();
				$rates   = isset( $numbers['rates'] ) && is_array( $numbers['rates'] ) ? $numbers['rates'] : array();
				?>
		<li>
			<strong><?php echo esc_html( self::date( (string) $item['ended'] ) ); ?></strong>:
			<?php echo esc_html( preg_replace( '/ \([a-z_]+\)$/', '', (string) $item['title'] ) ); ?>
			<br><span class="sl-verdict"><?php echo esc_html( self::verdict_label( (string) $item['verdict'] ) ); ?></span>
				<?php if ( '' !== $item['hypothesis'] ) : ?>
			<br><span class="sl-muted"><?php echo esc_html( $item['hypothesis'] ); ?></span>
			<?php endif; ?>
				<?php if ( isset( $rates['A'], $rates['B'] ) ) : ?>
			<br><span class="sl-muted"><?php echo esc_html( sprintf( /* translators: 1: rate A, 2: rate B */ __( 'Intent rate: current %1$s, challenger %2$s.', 'spark-living' ), self::pct( (float) $rates['A'] ), self::pct( (float) $rates['B'] ) ) ); ?></span>
			<?php endif; ?>
				<?php if ( ! empty( $item['note'] ) ) : ?>
			<br><span class="sl-muted"><?php echo esc_html( $item['note'] ); ?></span>
			<?php endif; ?>
				<?php if ( 'all' !== $item['device'] ) : ?>
			<br><span class="sl-muted"><?php echo esc_html( self::device_label( (string) $item['device'] ) ); ?></span>
			<?php endif; ?>
				<?php if ( $item['forced_start'] ) : ?>
			<br><span class="sl-warn"><?php echo esc_html( self::forced_label( (int) $item['start_sessions_14d'] ) ); ?></span>
			<?php endif; ?>
		</li>
		<?php endforeach; ?>
	</ol>
	<?php endif; ?>

	<h2 id="sl-lift"><?php esc_html_e( 'Cumulative lift versus the holdout', 'spark-living' ); ?></h2>
		<?php if ( ! $lift ) : ?>
	<p><?php esc_html_e( 'No winner has shipped yet, so there is nothing to compare. A permanent 10 percent of visitors always see the original; once a winner ships, this table shows living versus frozen.', 'spark-living' ); ?></p>
		<?php else : ?>
	<table>
		<caption><?php echo esc_html( sprintf( /* translators: %s: date */ __( 'Since the first live winner shipped on %s', 'spark-living' ), self::date( $lift['since'] ) ) ); ?></caption>
		<thead><tr>
			<th scope="col"><?php esc_html_e( 'Group', 'spark-living' ); ?></th>
			<th scope="col" class="sl-num"><?php esc_html_e( 'Sessions', 'spark-living' ); ?></th>
			<th scope="col" class="sl-num"><?php esc_html_e( 'Intent rate', 'spark-living' ); ?></th>
			<th scope="col" class="sl-num"><?php esc_html_e( 'Lead rate', 'spark-living' ); ?></th>
		</tr></thead>
		<tbody>
		<tr>
			<th scope="row"><?php esc_html_e( 'Living (sees shipped winners)', 'spark-living' ); ?></th>
			<td class="sl-num"><?php echo esc_html( number_format_i18n( $lift['counts']['living']['sessions'] ) ); ?></td>
			<td class="sl-num"><?php echo esc_html( self::pct( $lift['intent_rate']['living'] ) ); ?></td>
			<td class="sl-num"><?php echo esc_html( self::pct( $lift['lead_rate']['living'] ) ); ?></td>
		</tr>
		<tr>
			<th scope="row"><?php esc_html_e( 'Holdout (always the original)', 'spark-living' ); ?></th>
			<td class="sl-num"><?php echo esc_html( number_format_i18n( $lift['counts']['holdout']['sessions'] ) ); ?></td>
			<td class="sl-num"><?php echo esc_html( self::pct( $lift['intent_rate']['holdout'] ) ); ?></td>
			<td class="sl-num"><?php echo esc_html( self::pct( $lift['lead_rate']['holdout'] ) ); ?></td>
		</tr>
		</tbody>
	</table>
	<p><strong><?php esc_html_e( 'Lift in intent rate:', 'spark-living' ); ?></strong> <?php echo esc_html( self::lift( $lift['intent_lift'] ) ); ?>.
		<strong><?php esc_html_e( 'Lift in lead rate:', 'spark-living' ); ?></strong> <?php echo esc_html( self::lift( $lift['lead_lift'] ) ); ?>.
		<strong><?php esc_html_e( 'Probability living beats the holdout:', 'spark-living' ); ?></strong> <?php echo esc_html( self::pct( $lift['p_living_wins'], 0 ) ); ?>.</p>
	<p class="sl-muted"><?php esc_html_e( 'This is directional evidence. Do not quote a lift figure publicly until the holdout group is large enough for the probability to be stable.', 'spark-living' ); ?></p>
	<?php endif; ?>
</div>
		<?php
		return (string) ob_get_clean();
	}

	/**
	 * One side of the comparison. A wording test shows the text in quotes; on a
	 * button or link target each text is a small pill. Everything is escaped.
	 *
	 * @param string $text   Description.
	 * @param bool   $quoted Wrap in quotation marks.
	 * @param bool   $pill   Show as a pill.
	 * @return string
	 */
	private static function cmp_value( string $text, bool $quoted, bool $pill ): string {
		$shown = $quoted ? "\u{201C}" . $text . "\u{201D}" : $text;
		$class = $quoted ? 'sl-cmp-q' : 'sl-cmp-plain';
		if ( $pill && $quoted ) {
			return '<span class="sl-pill">' . esc_html( $shown ) . '</span>';
		}
		return '<span class="' . esc_attr( $quoted ? $class : '' ) . '">' . esc_html( $shown ) . '</span>';
	}

	/**
	 * "What is being tested", then the Current (A) and Challenger (B) rows.
	 *
	 * @param array $exp Running experiment.
	 * @return string HTML.
	 */
	private static function comparison( array $exp ): string {
		$d = Spark_Living_Store::describe( $exp );
		ob_start();
		?>
		<p class="sl-cmp-type"><strong><?php esc_html_e( 'What is being tested:', 'spark-living' ); ?></strong> <span class="sl-cmp-kind"><?php echo esc_html( $d['type_label'] ); ?></span></p>
		<dl class="sl-cmp">
			<div class="sl-cmp-row sl-cmp-a">
				<dt><?php esc_html_e( 'Current', 'spark-living' ); ?> <span class="sl-muted"><?php esc_html_e( 'variant A', 'spark-living' ); ?></span></dt>
				<dd><?php echo self::cmp_value( $d['current'], $d['current_quoted'], $d['pill'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></dd>
			</div>
			<div class="sl-cmp-row sl-cmp-b">
				<dt><?php esc_html_e( 'Challenger', 'spark-living' ); ?> <span class="sl-muted"><?php esc_html_e( 'variant B', 'spark-living' ); ?></span></dt>
				<dd><?php echo self::cmp_value( $d['challenger'], $d['challenger_quoted'], $d['pill'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></dd>
			</div>
		</dl>
		<?php
		return (string) ob_get_clean();
	}

	/**
	 * The running test block.
	 *
	 * @param array $exp            Experiment.
	 * @param bool  $admin_controls Show the manual conclude form.
	 */
	private static function render_running( array $exp, bool $admin_controls ): void {
		$snap = Spark_Living_Engine::snapshot( $exp );
		$dec  = $snap['decision'];
		$c    = $snap['counts'];
		$w    = $exp['weights'];
		?>
	<div class="sl-card">
		<p><strong><?php echo esc_html( $exp['name'] ); ?></strong>
			<span class="sl-muted sl-sel">(<?php echo esc_html( 'block' === $exp['element_type'] ? __( 'Living Block', 'spark-living' ) : $exp['target'] ); ?>)</span></p>
		<?php if ( '' !== $exp['hypothesis'] ) : ?>
		<p><?php echo esc_html( $exp['hypothesis'] ); ?></p>
		<?php endif; ?>
		<?php echo self::comparison( $exp ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		<p class="sl-muted"><?php echo esc_html( sprintf( /* translators: 1: days, 2: hard stop days, 3: start date */ __( 'Day %1$s of %2$d (started %3$s).', 'spark-living' ), number_format_i18n( floor( $snap['days_running'] ) + 1 ), Spark_Living_Stats::HARD_STOP_DAYS, self::date( (string) $exp['start_date'] ) ) ); ?></p>
		<p class="sl-muted"><?php echo esc_html( self::device_label( (string) $exp['device'] ) ); ?></p>
			<?php if ( $exp['forced_start'] ) : ?>
		<p class="sl-warn" id="sl-forced"><?php echo esc_html( self::forced_label( (int) $exp['start_sessions_14d'] ) ); ?></p>
		<?php endif; ?>
	</div>
		<?php echo Spark_Living_Sources::render(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	<table>
		<caption><?php esc_html_e( 'Live numbers', 'spark-living' ); ?></caption>
		<thead><tr>
			<th scope="col"><?php esc_html_e( 'Version', 'spark-living' ); ?></th>
			<th scope="col" class="sl-num"><?php esc_html_e( 'Traffic share', 'spark-living' ); ?></th>
			<th scope="col" class="sl-num"><?php esc_html_e( 'Sessions', 'spark-living' ); ?></th>
			<th scope="col" class="sl-num"><?php esc_html_e( 'Intent sessions', 'spark-living' ); ?></th>
			<th scope="col" class="sl-num"><?php esc_html_e( 'Intent rate', 'spark-living' ); ?></th>
			<th scope="col" class="sl-num"><?php esc_html_e( 'Leads', 'spark-living' ); ?></th>
		</tr></thead>
		<tbody>
		<?php foreach ( array( 'A', 'B' ) as $key ) : ?>
		<tr>
			<th scope="row"><?php echo esc_html( 'A' === $key ? __( 'A: current', 'spark-living' ) : __( 'B: challenger', 'spark-living' ) ); ?>
				<?php if ( ! empty( $exp['variants'][ $key ]['label'] ) ) : ?>
				<span class="sl-muted">(<?php echo esc_html( $exp['variants'][ $key ]['label'] ); ?>)</span>
				<?php endif; ?></th>
			<td class="sl-num"><?php echo esc_html( self::pct( (float) ( $w[ $key ] ?? 0.5 ), 0 ) ); ?></td>
			<td class="sl-num"><?php echo esc_html( number_format_i18n( $c[ $key ]['sessions'] ) ); ?></td>
			<td class="sl-num"><?php echo esc_html( number_format_i18n( $c[ $key ]['intent'] ) ); ?></td>
			<td class="sl-num"><?php echo esc_html( self::pct( $snap['rates'][ $key ] ) ); ?></td>
			<td class="sl-num"><?php echo esc_html( number_format_i18n( $c[ $key ]['leads'] ) ); ?></td>
		</tr>
		<?php endforeach; ?>
		<tr>
			<th scope="row"><?php esc_html_e( 'Holdout (original, always 10%)', 'spark-living' ); ?></th>
			<td class="sl-num"><?php echo esc_html( self::pct( Spark_Living_Stats::HOLDOUT, 0 ) ); ?></td>
			<td class="sl-num"><?php echo esc_html( number_format_i18n( $c['H']['sessions'] ) ); ?></td>
			<td class="sl-num"><?php echo esc_html( number_format_i18n( $c['H']['intent'] ) ); ?></td>
			<td class="sl-num"><?php echo esc_html( self::pct( $snap['rates']['H'] ) ); ?></td>
			<td class="sl-num"><?php echo esc_html( number_format_i18n( $c['H']['leads'] ) ); ?></td>
		</tr>
		</tbody>
	</table>
	<p><strong><?php esc_html_e( 'Probability the challenger beats the current version:', 'spark-living' ); ?></strong>
		<?php echo esc_html( self::pct( $dec['p_b_beats_a'], 1 ) ); ?>
		<span class="sl-muted"><?php esc_html_e( '(a win is called at 90% or more, a loss at 10% or less)', 'spark-living' ); ?></span></p>
	<p><strong><?php esc_html_e( 'Status:', 'spark-living' ); ?></strong> <?php echo esc_html( $dec['reason'] ); ?></p>
		<?php if ( $admin_controls ) : ?>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
		<input type="hidden" name="action" value="spark_living_conclude">
		<input type="hidden" name="experiment_id" value="<?php echo esc_attr( (string) $exp['id'] ); ?>">
		<?php wp_nonce_field( 'spark_living_conclude', 'spark_living_nonce' ); ?>
		<label for="sl-verdict"><?php esc_html_e( 'End this test now', 'spark-living' ); ?></label>
		<select id="sl-verdict" name="verdict">
			<option value="keep_a"><?php esc_html_e( 'Keep the current version (A)', 'spark-living' ); ?></option>
			<option value="ship_b"><?php esc_html_e( 'Ship the challenger (B)', 'spark-living' ); ?></option>
			<option value="no_difference"><?php esc_html_e( 'Call it no difference', 'spark-living' ); ?></option>
		</select>
		<p><button type="submit" class="button"><?php esc_html_e( 'End test', 'spark-living' ); ?></button></p>
	</form>
	<?php endif; ?>
		<?php
	}

	/**
	 * Draft and approval queue plus the create form (wp-admin only).
	 */
	private static function render_queue(): void {
		$queue = Spark_Living_Store::all(
			array(
				array(
					'key'     => '_spark_living_status',
					'value'   => array( Spark_Living_Store::STATUS_DRAFT, Spark_Living_Store::STATUS_AWAITING ),
					'compare' => 'IN',
				),
			)
		);
		?>
	<h2 id="sl-queue"><?php esc_html_e( 'Queued tests', 'spark-living' ); ?></h2>
		<?php if ( ! $queue ) : ?>
	<p><?php esc_html_e( 'Nothing is queued.', 'spark-living' ); ?></p>
		<?php else : ?>
	<ul>
			<?php foreach ( $queue as $exp ) : ?>
		<li>
				<?php echo esc_html( $exp['name'] ); ?>
			<span class="sl-muted">(<?php echo esc_html( Spark_Living_Store::STATUS_AWAITING === $exp['status'] ? __( 'Tier 2: needs owner approval', 'spark-living' ) : __( 'draft', 'spark-living' ) ); ?>; <?php echo esc_html( strtolower( rtrim( self::device_label( (string) $exp['device'] ), '.' ) ) ); ?>)</span>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline">
				<input type="hidden" name="action" value="spark_living_start">
				<input type="hidden" name="experiment_id" value="<?php echo esc_attr( (string) $exp['id'] ); ?>">
				<?php wp_nonce_field( 'spark_living_start', 'spark_living_nonce' ); ?>
				<label for="sl-sess-<?php echo esc_attr( (string) $exp['id'] ); ?>" style="display:inline;font-weight:400"><?php esc_html_e( 'Sessions, last 14 days:', 'spark-living' ); ?></label>
				<input type="number" min="0" step="1" id="sl-sess-<?php echo esc_attr( (string) $exp['id'] ); ?>" name="sessions_14d" style="width:6rem">
				<label style="display:inline;font-weight:400"><input type="checkbox" name="force" value="1"> <?php esc_html_e( 'Start anyway (below the bar)', 'spark-living' ); ?></label>
				<button type="submit" class="button"><?php echo esc_html( Spark_Living_Store::STATUS_AWAITING === $exp['status'] ? __( 'Approve and start', 'spark-living' ) : __( 'Start', 'spark-living' ) ); ?></button>
			</form>
		</li>
		<?php endforeach; ?>
	</ul>
	<?php endif; ?>

	<h2 id="sl-create"><?php esc_html_e( 'Create a selector test', 'spark-living' ); ?></h2>
	<p class="sl-muted"><?php esc_html_e( 'For Divi modules and any non-block element. For Living Block tests, use the Living Block in the editor and create the test with the REST API (see the README).', 'spark-living' ); ?></p>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
		<input type="hidden" name="action" value="spark_living_create">
		<?php wp_nonce_field( 'spark_living_create', 'spark_living_nonce' ); ?>
		<label for="sl-name"><?php esc_html_e( 'Name', 'spark-living' ); ?></label>
		<input type="text" id="sl-name" name="name" required>
		<label for="sl-hyp"><?php esc_html_e( 'Hypothesis', 'spark-living' ); ?></label>
		<textarea id="sl-hyp" name="hypothesis" rows="2"></textarea>
		<label for="sl-sel"><?php esc_html_e( 'CSS selector (for example .header-cta a)', 'spark-living' ); ?></label>
		<input type="text" id="sl-sel" name="target" required>
		<label for="sl-text"><?php esc_html_e( 'B: new text (optional)', 'spark-living' ); ?></label>
		<input type="text" id="sl-text" name="b_text">
		<label for="sl-href"><?php esc_html_e( 'B: new link (optional)', 'spark-living' ); ?></label>
		<input type="text" id="sl-href" name="b_href">
		<label for="sl-class"><?php esc_html_e( 'B: add CSS class (optional)', 'spark-living' ); ?></label>
		<input type="text" id="sl-class" name="b_class">
		<label for="sl-style"><?php esc_html_e( 'B: inline style (optional, for example background:#1f6b3a;color:#fff)', 'spark-living' ); ?></label>
		<input type="text" id="sl-style" name="b_style">
		<label for="sl-css"><?php esc_html_e( 'B: CSS snippet, applied only while B is active (optional; for a visibility test, for example a.et_pb_button[href="#contact"]{display:inline-block!important})', 'spark-living' ); ?></label>
		<textarea id="sl-css" name="b_css" rows="3"></textarea>
		<label for="sl-device"><?php esc_html_e( 'Device', 'spark-living' ); ?></label>
		<select id="sl-device" name="device">
			<option value="all"><?php esc_html_e( 'All devices', 'spark-living' ); ?></option>
			<option value="mobile"><?php esc_html_e( 'Mobile only (viewport 980px or narrower)', 'spark-living' ); ?></option>
			<option value="desktop"><?php esc_html_e( 'Desktop only (wider than 980px)', 'spark-living' ); ?></option>
		</select>
		<label for="sl-tier"><?php esc_html_e( 'Tier', 'spark-living' ); ?></label>
		<select id="sl-tier" name="tier">
			<option value="1"><?php esc_html_e( 'Tier 1: wording, color, order, form length', 'spark-living' ); ?></option>
			<option value="2"><?php esc_html_e( 'Tier 2: offer, price, guarantee or legal claim (needs approval)', 'spark-living' ); ?></option>
		</select>
		<p><button type="submit" class="button button-primary"><?php esc_html_e( 'Create test', 'spark-living' ); ?></button></p>
	</form>
		<?php
	}

	/**
	 * wp-admin page.
	 */
	public static function render_admin_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to view this page.', 'spark-living' ), '', array( 'response' => 403 ) );
		}
		$messages = array(
			'created'   => __( 'Test created.', 'spark-living' ),
			'started'   => __( 'Test started.', 'spark-living' ),
			'concluded' => __( 'Test ended and logged.', 'spark-living' ),
			'busy'      => __( 'A test is already running. One test per site at a time.', 'spark-living' ),
			'ineligible' => __( 'Not started: the target page needs at least 100 sessions in the last 14 days. Enter the number, or tick "Start anyway" to start below the bar (it is recorded).', 'spark-living' ),
			'invalid'   => __( 'That test could not be saved. Check the name, selector and at least one change or CSS snippet for B.', 'spark-living' ),
		);
		$code = isset( $_GET['sl_msg'] ) ? sanitize_key( wp_unslash( $_GET['sl_msg'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		echo '<div class="wrap">';
		if ( isset( $messages[ $code ] ) ) {
			$class = in_array( $code, array( 'busy', 'invalid', 'ineligible' ), true ) ? 'notice-error' : 'notice-success';
			echo '<div class="notice ' . esc_attr( $class ) . '"><p>' . esc_html( $messages[ $code ] ) . '</p></div>';
		}
		echo self::render_view( true ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo '</div>';
	}

	/**
	 * Redirect back to the admin page with a message code.
	 *
	 * @param string $code Message code.
	 */
	private static function back( string $code ): void {
		wp_safe_redirect( add_query_arg( array( 'page' => 'spark-living', 'sl_msg' => $code ), admin_url( 'admin.php' ) ) );
		exit;
	}

	/**
	 * Shared permission + nonce check for admin-post handlers.
	 *
	 * @param string $action Nonce action.
	 */
	private static function guard( string $action ): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to do that.', 'spark-living' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( $action, 'spark_living_nonce' );
	}

	/**
	 * Create a selector test from the admin form.
	 */
	public static function handle_create(): void {
		self::guard( 'spark_living_create' );

		$changes = array();
		$text    = isset( $_POST['b_text'] ) ? sanitize_text_field( wp_unslash( $_POST['b_text'] ) ) : '';
		$href    = isset( $_POST['b_href'] ) ? sanitize_text_field( wp_unslash( $_POST['b_href'] ) ) : '';
		$class   = isset( $_POST['b_class'] ) ? sanitize_text_field( wp_unslash( $_POST['b_class'] ) ) : '';
		$style   = isset( $_POST['b_style'] ) ? sanitize_text_field( wp_unslash( $_POST['b_style'] ) ) : '';
		if ( '' !== $text ) {
			$changes[] = array( 'op' => 'text', 'value' => $text );
		}
		if ( '' !== $href ) {
			$changes[] = array( 'op' => 'href', 'value' => $href );
		}
		if ( '' !== $class ) {
			$changes[] = array( 'op' => 'add_class', 'value' => $class );
		}
		if ( '' !== $style ) {
			$changes[] = array( 'op' => 'style', 'value' => $style );
		}
		// The CSS snippet is stripped by Spark_Living_Util::sanitize_css() inside Spark_Living_Store::create().
		$css    = isset( $_POST['b_css'] ) ? (string) wp_unslash( $_POST['b_css'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		$device = isset( $_POST['device'] ) ? sanitize_key( wp_unslash( $_POST['device'] ) ) : 'all';

		$id = Spark_Living_Store::create(
			array(
				'name'         => isset( $_POST['name'] ) ? sanitize_text_field( wp_unslash( $_POST['name'] ) ) : '',
				'hypothesis'   => isset( $_POST['hypothesis'] ) ? sanitize_textarea_field( wp_unslash( $_POST['hypothesis'] ) ) : '',
				'element_type' => 'selector',
				'target'       => isset( $_POST['target'] ) ? sanitize_text_field( wp_unslash( $_POST['target'] ) ) : '',
				'tier'         => isset( $_POST['tier'] ) ? absint( $_POST['tier'] ) : 1,
				'device'       => $device,
				'variants'     => array(
					'A' => array( 'label' => 'Current' ),
					'B' => array( 'label' => 'Challenger', 'changes' => $changes, 'css' => $css ),
				),
			)
		);
		if ( is_wp_error( $id ) ) {
			self::back( 'invalid' );
		}
		$exp = Spark_Living_Store::get( $id );
		if ( $exp && 2 === $exp['tier'] ) {
			Spark_Living_Store::update( $id, array( 'status' => Spark_Living_Store::STATUS_AWAITING ) );
		}
		self::back( 'created' );
	}

	/**
	 * Start (or approve and start) a queued test.
	 */
	public static function handle_start(): void {
		self::guard( 'spark_living_start' );
		$id  = isset( $_POST['experiment_id'] ) ? absint( $_POST['experiment_id'] ) : 0;
		$exp = Spark_Living_Store::get( $id );
		if ( ! $exp ) {
			self::back( 'invalid' );
		}
		$sessions = isset( $_POST['sessions_14d'] ) ? sanitize_text_field( wp_unslash( $_POST['sessions_14d'] ) ) : '';
		$elig     = Spark_Living_Store::check_eligibility( '' === $sessions ? null : $sessions, ! empty( $_POST['force'] ), (string) $exp['device'] );
		if ( is_wp_error( $elig ) ) {
			self::back( 'ineligible' );
		}
		$started = Spark_Living_Store::start(
			$id,
			array(
				'forced_start'       => $elig['forced'],
				'start_sessions_14d' => $elig['sessions'],
			)
		);
		self::back( is_wp_error( $started ) ? 'busy' : 'started' );
	}

	/**
	 * End the running test by hand.
	 */
	public static function handle_conclude(): void {
		self::guard( 'spark_living_conclude' );
		$id      = isset( $_POST['experiment_id'] ) ? absint( $_POST['experiment_id'] ) : 0;
		$verdict = isset( $_POST['verdict'] ) ? sanitize_key( wp_unslash( $_POST['verdict'] ) ) : '';
		$exp     = Spark_Living_Store::get( $id );
		if ( ! $exp || ! in_array( $verdict, array( 'ship_b', 'keep_a', 'no_difference' ), true ) ) {
			self::back( 'invalid' );
		}
		$result = Spark_Living_Engine::conclude( $id, $verdict, Spark_Living_Engine::snapshot( $exp ), 'admin', 'Ended by an administrator.' );
		self::back( is_wp_error( $result ) ? 'invalid' : 'concluded' );
	}
}
