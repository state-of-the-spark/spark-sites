<?php
/**
 * Plugin Name:       Spark Living
 * Plugin URI:        https://sparkmysite.com/
 * Description:       Living Websites by Spark Sites. A site that tests one improvement at a time, keeps what brings in more leads, and logs every change.
 * Version:           0.1.3
 * Requires at least: 6.3
 * Requires PHP:      8.1
 * Author:            Spark Sites
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       spark-living
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'SPARK_LIVING_VERSION', '0.1.3' );
define( 'SPARK_LIVING_DB_VERSION', '1' );
define( 'SPARK_LIVING_FILE', __FILE__ );
define( 'SPARK_LIVING_DIR', plugin_dir_path( __FILE__ ) );
define( 'SPARK_LIVING_URL', plugin_dir_url( __FILE__ ) );

require_once SPARK_LIVING_DIR . 'includes/class-spark-living-stats.php';
require_once SPARK_LIVING_DIR . 'includes/class-spark-living-util.php';
require_once SPARK_LIVING_DIR . 'includes/class-spark-living-store.php';
require_once SPARK_LIVING_DIR . 'includes/class-spark-living-metrics.php';
require_once SPARK_LIVING_DIR . 'includes/class-spark-living-engine.php';
require_once SPARK_LIVING_DIR . 'includes/class-spark-living-events.php';
require_once SPARK_LIVING_DIR . 'includes/class-spark-living-frontend.php';
require_once SPARK_LIVING_DIR . 'includes/class-spark-living-rest.php';
require_once SPARK_LIVING_DIR . 'includes/class-spark-living-cron.php';
require_once SPARK_LIVING_DIR . 'includes/class-spark-living-dashboard.php';

/**
 * Plugin bootstrap.
 */
final class Spark_Living_Plugin {

	/**
	 * Wire up every component.
	 */
	public static function init(): void {
		add_action( 'init', array( 'Spark_Living_Store', 'register_post_types' ), 5 );

		Spark_Living_Events::init();
		Spark_Living_Frontend::init();
		Spark_Living_Rest::init();
		Spark_Living_Cron::init();
		Spark_Living_Dashboard::init();

		// Cached pages carry the weights and the live set: flush when they change.
		add_action( 'spark_living_test_started', array( 'Spark_Living_Util', 'flush_page_cache' ) );
		add_action( 'spark_living_test_concluded', array( 'Spark_Living_Util', 'flush_page_cache' ) );
		add_action( 'spark_living_test_reverted', array( 'Spark_Living_Util', 'flush_page_cache' ) );

		// Upgrade the table when the schema version changes.
		if ( get_option( 'spark_living_db_version' ) !== SPARK_LIVING_DB_VERSION ) {
			Spark_Living_Metrics::create_table();
		}
	}

	/**
	 * Activation: events table, post types, rewrite rule, cron.
	 */
	public static function activate(): void {
		Spark_Living_Metrics::create_table();
		Spark_Living_Store::register_post_types();
		add_rewrite_rule( '^living/?$', 'index.php?spark_living_dash=1', 'top' );
		flush_rewrite_rules( false );
		update_option( 'spark_living_rewrite_version', SPARK_LIVING_VERSION, false );
		if ( ! wp_next_scheduled( Spark_Living_Cron::HOOK ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', Spark_Living_Cron::HOOK );
		}
	}

	/**
	 * Deactivation: stop the cron job and drop the rewrite rule. Data is kept.
	 */
	public static function deactivate(): void {
		Spark_Living_Cron::unschedule();
		flush_rewrite_rules( false );
	}
}

register_activation_hook( __FILE__, array( 'Spark_Living_Plugin', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'Spark_Living_Plugin', 'deactivate' ) );
add_action( 'plugins_loaded', array( 'Spark_Living_Plugin', 'init' ) );
