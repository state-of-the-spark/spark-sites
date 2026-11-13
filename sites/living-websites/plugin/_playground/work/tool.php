<?php
// Local test helper (not part of the plugin). ?a=log|cols|plugins|eval ...
define('WP_USE_THEMES', false);
require '/wordpress/wp-load.php';
header('Content-Type: text/plain');
$a = $_GET['a'] ?? '';
global $wpdb;
if ($a === 'log') { $f = WP_CONTENT_DIR.'/debug.log'; echo file_exists($f) ? file_get_contents($f) : "(no debug.log)\n"; }
elseif ($a === 'clearlog') { @unlink(WP_CONTENT_DIR.'/debug.log'); echo "cleared"; }
elseif ($a === 'info') { echo PHP_VERSION, ' WP ', get_bloginfo('version'), ' debug=', WP_DEBUG ? 1:0, ' log=', var_export(WP_DEBUG_LOG,true), "\n"; print_r(get_option('active_plugins')); print_r(get_option('permalink_structure')); }
elseif ($a === 'cols') { $t=$wpdb->prefix.'spark_living_events'; print_r($wpdb->get_results("SHOW COLUMNS FROM $t") ?: $wpdb->get_results("PRAGMA table_info($t)")); echo $wpdb->last_error; }
elseif ($a === 'run') { // run a php file from work dir
  include '/wordpress/test-tools/'.basename($_GET['f']);
}
if ($a === 'events') { echo json_encode($wpdb->get_results("SELECT * FROM {$wpdb->prefix}spark_living_events ORDER BY id"), JSON_PRETTY_PRINT); }
if ($a === 'sql') { echo json_encode($wpdb->get_results(stripslashes($_GET['q'])), JSON_PRETTY_PRINT), $wpdb->last_error; }
