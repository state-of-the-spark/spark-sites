<?php
/**
 * Spark Living: front end. Prints the inline assignment script in the head and
 * renders the Living Block and its variant child.
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Spark_Living_Frontend {

	/**
	 * Hook everything in.
	 */
	public static function init(): void {
		add_action( 'init', array( __CLASS__, 'register_blocks' ) );
		add_action( 'wp_head', array( __CLASS__, 'print_head' ), 1 );
	}

	/**
	 * Register both blocks from their block.json files.
	 */
	public static function register_blocks(): void {
		register_block_type(
			SPARK_LIVING_DIR . 'blocks/living-block',
			array( 'render_callback' => array( __CLASS__, 'render_living_block' ) )
		);
		register_block_type(
			SPARK_LIVING_DIR . 'blocks/variant',
			array( 'render_callback' => array( __CLASS__, 'render_variant' ) )
		);
	}

	/**
	 * Living Block wrapper. The children do the work.
	 *
	 * @param array    $attributes Block attributes.
	 * @param string   $content    Rendered inner blocks.
	 * @param WP_Block $block      Block instance (unused).
	 * @return string
	 */
	public static function render_living_block( $attributes, $content, $block = null ): string {
		unset( $block );
		$id = isset( $attributes['experimentId'] ) ? absint( $attributes['experimentId'] ) : 0;
		return sprintf(
			'<div class="spark-living-block" data-living-block="%d">%s</div>',
			$id,
			$content // Already rendered and escaped by core's block renderer.
		);
	}

	/**
	 * One variant. When the experiment is running or a winner is promoted both
	 * variants are in the HTML with data attributes (the browser script keeps
	 * one and removes the other). Otherwise only variant A is output.
	 *
	 * @param array    $attributes Block attributes.
	 * @param string   $content    Rendered inner blocks.
	 * @param WP_Block $block      Block instance (provides context).
	 * @return string
	 */
	public static function render_variant( $attributes, $content, $block = null ): string {
		$exp_id = 0;
		if ( $block instanceof WP_Block && isset( $block->context['spark-living/experimentId'] ) ) {
			$exp_id = absint( $block->context['spark-living/experimentId'] );
		}
		$key = ( isset( $attributes['variantKey'] ) && 'B' === $attributes['variantKey'] ) ? 'B' : 'A';

		if ( 'baseline' === Spark_Living_Store::render_state( $exp_id ) && 'A' !== $key ) {
			return '';
		}
		return sprintf(
			'<div class="spark-living-variant" data-living-exp="%d" data-living-variant="%s">%s</div>',
			$exp_id,
			esc_attr( $key ),
			$content
		);
	}

	/**
	 * Is the tracking script being printed for a running test right now?
	 * (Staff are excluded per visitor; this answers for the site.)
	 *
	 * @return bool
	 */
	public static function tracking_active(): bool {
		$js_file = SPARK_LIVING_DIR . 'assets/js/living.js';
		if ( ! is_readable( $js_file ) ) {
			return false;
		}
		foreach ( self::tests_config() as $test ) {
			if ( 'running' === ( $test['mode'] ?? '' ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Tests the browser script should know about.
	 *
	 * @return array[]
	 */
	private static function tests_config(): array {
		$tests   = array();
		$running = Spark_Living_Store::get_running();
		if ( $running ) {
			$tests[] = array(
				'id'       => (int) $running['id'],
				'mode'     => 'running',
				'type'     => $running['element_type'],
				'device'   => $running['device'],
				'target'   => $running['target'],
				'weights'  => $running['weights'],
				'variants' => self::variants_for_script( $running ),
			);
		}
		foreach ( Spark_Living_Store::get_promoted() as $exp ) {
			if ( $running && (int) $running['id'] === (int) $exp['id'] ) {
				continue;
			}
			$tests[] = array(
				'id'       => (int) $exp['id'],
				'mode'     => 'promoted',
				'type'     => $exp['element_type'],
				'device'   => $exp['device'],
				'target'   => $exp['target'],
				'winner'   => 'B',
				'variants' => self::variants_for_script( $exp ),
			);
		}
		return $tests;
	}

	/**
	 * Only the parts of the variants the browser needs (changes, and B's css).
	 *
	 * @param array $exp Experiment.
	 * @return array
	 */
	private static function variants_for_script( array $exp ): array {
		$out = array();
		foreach ( array( 'A', 'B' ) as $key ) {
			$out[ $key ] = array( 'changes' => $exp['variants'][ $key ]['changes'] ?? array() );
		}
		// Visibility / CSS variant: the challenger's snippet, applied only while B is active.
		$css = (string) ( $exp['variants']['B']['css'] ?? '' );
		if ( '' !== $css ) {
			$out['B']['css'] = $css;
		}
		return $out;
	}

	/**
	 * Print the base style and, when there is something to run, the inline script.
	 */
	public static function print_head(): void {
		if ( is_admin() || is_feed() || is_robots() || is_customize_preview() || is_embed() ) {
			return;
		}
		// Divi Visual Builder and other builder previews.
		if ( isset( $_GET['et_fb'] ) || isset( $_GET['et_pb_preview'] ) || isset( $_GET['preview'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return;
		}

		// Default state with no JavaScript: variant A visible, B hidden.
		echo '<style id="spark-living-base">.spark-living-variant[data-living-variant="B"]{display:none}</style>' . "\n";

		// Staff (anyone who can edit posts) always see A and are never counted.
		if ( current_user_can( 'edit_posts' ) ) {
			return;
		}

		$tests = self::tests_config();
		if ( ! $tests ) {
			return;
		}

		$config = array(
			'version'  => SPARK_LIVING_VERSION,
			'holdout'  => Spark_Living_Stats::HOLDOUT,
			'endpoint' => esc_url_raw( rest_url( 'spark-living/v1/event' ) ),
			'timeout'  => 1200,
			'tests'    => $tests,
		);

		$js_file = SPARK_LIVING_DIR . 'assets/js/living.js';
		$js      = is_readable( $js_file ) ? file_get_contents( $js_file ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		if ( '' === $js ) {
			return;
		}

		$json = wp_json_encode( $config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT );
		// The script body is this plugin's own file and the config is JSON-encoded with HEX flags.
		echo '<script id="spark-living-js">window.sparkLiving=' . $json . ';' . "\n" . $js . "\n</script>\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}
}
