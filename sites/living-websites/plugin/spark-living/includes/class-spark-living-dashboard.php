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
.sl-dash a:focus,.sl-dash button:focus,.sl-dash input:focus,.sl-dash select:focus,.sl-dash textarea:focus{outline:3px solid var(--sl-accent);outline-offset:2px}
</style>';
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
	<p class="sl-muted"><?php esc_html_e( 'Evolved means a challenger won and shipped. Tests that ended with no difference, or where the original won, are counted separately.', 'spark-living' ); ?></p>
	<ul class="sl-tally" id="sl-tally" aria-label="<?php esc_attr_e( 'Test outcomes', 'spark-living' ); ?>">
		<li class="sl-evolved" data-sl-tally="evolved"><strong><?php echo esc_html( number_format_i18n( $tally['evolved'] ) ); ?></strong> <?php esc_html_e( 'evolved (challenger won and shipped)', 'spark-living' ); ?></li>
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
			<span class="sl-muted">(<?php echo esc_html( 'block' === $exp['element_type'] ? __( 'Living Block', 'spark-living' ) : $exp['target'] ); ?>)</span></p>
		<?php if ( '' !== $exp['hypothesis'] ) : ?>
		<p><?php echo esc_html( $exp['hypothesis'] ); ?></p>
		<?php endif; ?>
		<p class="sl-muted"><?php echo esc_html( sprintf( /* translators: 1: days, 2: hard stop days, 3: start date */ __( 'Day %1$s of %2$d (started %3$s).', 'spark-living' ), number_format_i18n( floor( $snap['days_running'] ) + 1 ), Spark_Living_Stats::HARD_STOP_DAYS, self::date( (string) $exp['start_date'] ) ) ); ?></p>
		<p class="sl-muted"><?php echo esc_html( self::device_label( (string) $exp['device'] ) ); ?></p>
			<?php if ( $exp['forced_start'] ) : ?>
		<p class="sl-warn" id="sl-forced"><?php echo esc_html( self::forced_label( (int) $exp['start_sessions_14d'] ) ); ?></p>
		<?php endif; ?>
	</div>
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
