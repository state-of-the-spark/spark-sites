<?php
/**
 * Spark Living: data source registry. The dashboard shows one chip per source
 * (logo, name, Live or Paused, what it supplies, one detail line) just above
 * the live numbers; GET /state returns the same list under `sources`.
 *
 * Statuses are computed from real state on every request, never stored.
 * More sources can be added with the `spark_living_data_sources` filter.
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Spark_Living_Sources {

	public const LIVE   = 'live';
	public const PAUSED = 'paused';

	/**
	 * The registry, after the filter. Each entry:
	 *   id      string  Stable key.
	 *   name    string  Display name.
	 *   icon    array   {type: url|svg, value: image URL or inline SVG markup}.
	 *   what    string  One short line: what this source supplies.
	 *   status  string  'live' or 'paused'.
	 *   detail  string  One short line of state.
	 *
	 * @return array[]
	 */
	public static function all(): array {
		$sources = array( self::site_visit_log(), self::google_analytics() );

		/**
		 * Add, remove or change data sources. Entries need id and name; status
		 * must be 'live' or 'paused' (anything else is shown as paused).
		 *
		 * @param array[] $sources Source entries.
		 */
		$sources = apply_filters( 'spark_living_data_sources', $sources );

		$out = array();
		foreach ( is_array( $sources ) ? $sources : array() as $source ) {
			if ( ! is_array( $source ) || empty( $source['id'] ) || empty( $source['name'] ) ) {
				continue;
			}
			$icon = isset( $source['icon'] ) && is_array( $source['icon'] ) ? $source['icon'] : array();
			$out[] = array(
				'id'     => sanitize_key( (string) $source['id'] ),
				'name'   => sanitize_text_field( (string) $source['name'] ),
				'icon'   => array(
					'type'  => ( isset( $icon['type'] ) && 'svg' === $icon['type'] ) ? 'svg' : 'url',
					'value' => isset( $icon['value'] ) ? (string) $icon['value'] : '',
				),
				'what'   => sanitize_text_field( (string) ( $source['what'] ?? '' ) ),
				'status' => ( isset( $source['status'] ) && self::LIVE === $source['status'] ) ? self::LIVE : self::PAUSED,
				'detail' => sanitize_text_field( (string) ( $source['detail'] ?? '' ) ),
			);
		}
		return $out;
	}

	/**
	 * Registry for the REST API: the same entries, with the icon reduced to
	 * its type and (for an image) its URL.
	 *
	 * @return array[]
	 */
	public static function for_rest(): array {
		$out = array();
		foreach ( self::all() as $source ) {
			$source['live'] = ( self::LIVE === $source['status'] );
			$icon           = $source['icon'];
			$source['icon'] = 'url' === $icon['type'] ? array( 'type' => 'url', 'url' => esc_url_raw( $icon['value'] ) ) : array( 'type' => 'svg' );
			$out[]          = $source;
		}
		return $out;
	}

	/**
	 * Relative time text for a UTC datetime ("3 minutes ago").
	 *
	 * @param string $mysql_utc Datetime.
	 * @return string
	 */
	private static function ago( string $mysql_utc ): string {
		$ts = Spark_Living_Util::to_ts( $mysql_utc );
		if ( ! $ts ) {
			return '';
		}
		if ( time() - $ts < MINUTE_IN_SECONDS ) {
			return __( 'less than a minute ago', 'spark-living' );
		}
		/* translators: %s: time span such as "3 minutes" */
		return sprintf( __( '%s ago', 'spark-living' ), human_time_diff( $ts, time() ) );
	}

	/**
	 * Source 1: the plugin's own events table.
	 *
	 * Live only while a test is running and the tracking script is being
	 * printed for it; paused otherwise.
	 *
	 * @return array
	 */
	private static function site_visit_log(): array {
		$running = Spark_Living_Store::get_running();
		$live    = ( $running && Spark_Living_Frontend::tracking_active() );

		$icon_url = function_exists( 'get_site_icon_url' ) ? (string) get_site_icon_url( 40 ) : '';
		$icon     = '' !== $icon_url
			? array( 'type' => 'url', 'value' => $icon_url )
			: array(
				'type'  => 'svg',
				// A simple leaf: no site icon is set.
				'value' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19C5 10 10 4.5 20 4c0 9.5-5.5 15-14 15z" fill="#238a4a"/><path d="M5 19C9 14 12.5 11 16 8.5" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/></svg>',
			);

		if ( $running ) {
			$last = Spark_Living_Metrics::latest_event_at( (int) $running['id'] );
			$detail = $last
				? sprintf( /* translators: %s: relative time */ __( 'Last event: %s', 'spark-living' ), self::ago( $last ) )
				: __( 'No events yet', 'spark-living' );
			if ( ! $live ) {
				$detail = __( 'A test is running but the tracking script is not being printed. ', 'spark-living' ) . $detail;
			}
		} else {
			$last   = Spark_Living_Metrics::latest_event_at();
			$detail = $last
				? sprintf( /* translators: %s: relative time */ __( 'No test is running. Last event: %s', 'spark-living' ), self::ago( $last ) )
				: __( 'No test is running. No events yet', 'spark-living' );
		}

		return array(
			'id'     => 'site-visit-log',
			'name'   => __( 'Site visit log', 'spark-living' ),
			'icon'   => $icon,
			'what'   => __( 'Views, clicks and form submissions for the test', 'spark-living' ),
			'status' => $live ? self::LIVE : self::PAUSED,
			'detail' => $detail,
		);
	}

	/**
	 * Source 2: Google Analytics.
	 *
	 * The plugin has no direct connection to Analytics today (the 14-day
	 * session count is typed in when a test starts), so this is paused. A
	 * real connection turns it live by returning true from the
	 * `spark_living_ga_connected` filter.
	 *
	 * @return array
	 */
	private static function google_analytics(): array {
		/**
		 * Is there a working direct connection that reads Google Analytics?
		 * Default false. Return true only from code that really reads it.
		 *
		 * @param bool $connected Connection state.
		 */
		$connected = (bool) apply_filters( 'spark_living_ga_connected', false );

		if ( $connected ) {
			$detail = __( 'Connected. Analytics is read directly.', 'spark-living' );
		} else {
			$detail  = __( 'Not connected. Traffic count entered by hand when the test started', 'spark-living' );
			$running = Spark_Living_Store::get_running();
			if ( $running && (int) $running['start_sessions_14d'] > 0 ) {
				$detail .= sprintf( /* translators: %s: sessions */ __( ' (%s sessions)', 'spark-living' ), number_format_i18n( (int) $running['start_sessions_14d'] ) );
			}
		}

		return array(
			'id'     => 'google-analytics',
			'name'   => __( 'Google Analytics', 'spark-living' ),
			'icon'   => array(
				'type'  => 'svg',
				'value' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="2" y="14" width="5.5" height="8" rx="2.75" fill="#F9AB00"/><rect x="9.25" y="8" width="5.5" height="14" rx="2.75" fill="#F29900"/><rect x="16.5" y="2" width="5.5" height="20" rx="2.75" fill="#E37400"/></svg>',
			),
			'what'   => __( 'Traffic check before a test starts', 'spark-living' ),
			'status' => $connected ? self::LIVE : self::PAUSED,
			'detail' => $detail,
		);
	}

	/**
	 * Inline SVG allow-list (paths, shapes, groups, no scripts or links).
	 *
	 * @return array
	 */
	private static function svg_kses(): array {
		$common = array(
			'fill'              => true,
			'fill-opacity'      => true,
			'stroke'            => true,
			'stroke-width'      => true,
			'stroke-linecap'    => true,
			'stroke-linejoin'   => true,
			'opacity'           => true,
			'transform'         => true,
		);
		return array(
			'svg'    => array(
				'xmlns'       => true,
				'viewbox'     => true,
				'width'       => true,
				'height'      => true,
				'aria-hidden' => true,
				'focusable'   => true,
			),
			'g'      => $common,
			'path'   => $common + array( 'd' => true ),
			'rect'   => $common + array( 'x' => true, 'y' => true, 'width' => true, 'height' => true, 'rx' => true, 'ry' => true ),
			'circle' => $common + array( 'cx' => true, 'cy' => true, 'r' => true ),
		);
	}

	/**
	 * The chip row, ready to echo. Every dynamic value is escaped here.
	 *
	 * @return string
	 */
	public static function render(): string {
		$sources = self::all();
		if ( ! $sources ) {
			return '';
		}
		ob_start();
		?>
	<section class="sl-sources" aria-labelledby="sl-sources-h">
		<h3 id="sl-sources-h"><?php esc_html_e( 'Data sources', 'spark-living' ); ?></h3>
		<ul class="sl-src-list">
			<?php foreach ( $sources as $source ) : ?>
				<?php $live = ( self::LIVE === $source['status'] ); ?>
			<li class="sl-src <?php echo $live ? 'sl-src-live' : 'sl-src-paused'; ?>" data-sl-source="<?php echo esc_attr( $source['id'] ); ?>" data-sl-status="<?php echo esc_attr( $source['status'] ); ?>">
				<span class="sl-src-ico">
					<?php if ( 'svg' === $source['icon']['type'] ) : ?>
						<?php echo wp_kses( (string) preg_replace( '#<script[^>]*>.*?</script>#is', '', $source['icon']['value'] ), self::svg_kses() ); ?>
					<?php elseif ( '' !== $source['icon']['value'] ) : ?>
						<img src="<?php echo esc_url( $source['icon']['value'] ); ?>" alt="" width="16" height="16" loading="lazy" decoding="async">
					<?php endif; ?>
				</span>
				<span class="sl-src-body">
					<span class="sl-src-top">
						<strong class="sl-src-name"><?php echo esc_html( $source['name'] ); ?></strong>
						<span class="sl-src-state"><span class="sl-dot" aria-hidden="true"></span><?php echo esc_html( $live ? __( 'Live', 'spark-living' ) : __( 'Paused', 'spark-living' ) ); ?></span>
					</span>
					<?php if ( '' !== $source['what'] ) : ?>
					<span class="sl-src-what"><?php echo esc_html( $source['what'] ); ?></span>
					<?php endif; ?>
					<?php if ( '' !== $source['detail'] ) : ?>
					<span class="sl-src-detail"><?php echo esc_html( $source['detail'] ); ?></span>
					<?php endif; ?>
				</span>
			</li>
			<?php endforeach; ?>
		</ul>
	</section>
		<?php
		return (string) ob_get_clean();
	}
}
