<?php
// Screenshot fixture: a running, mobile-only, CSS-variant test that was force-started below the bar, with seeded numbers.
global $wpdb; $T = $wpdb->prefix . 'spark_living_events';
$r = Spark_Living_Store::get_running(); if ($r) { Spark_Living_Store::update($r['id'], ['status' => 'concluded']); }
foreach (Spark_Living_Store::get_promoted() as $e) { Spark_Living_Store::update($e['id'], ['promoted' => false]); }
// Drafts left behind by the tests are removed so the queue reads cleanly.
foreach (Spark_Living_Store::all([['key' => '_spark_living_status', 'value' => ['draft', 'awaiting_approval'], 'compare' => 'IN']]) as $d) { wp_delete_post($d['id'], true); }
$wpdb->query("DELETE FROM $T");
$sel = 'header a.et_pb_button[href=\'#contact\']';
$id = Spark_Living_Store::create(['name' => 'Header Get started button on mobile', 'element_type' => 'selector', 'target' => $sel, 'hypothesis' => 'Showing the header button on mobile brings more enquiries.', 'tier' => 1, 'device' => 'mobile', 'variants' => ['A' => ['label' => 'Hidden on mobile'], 'B' => ['label' => 'Shown on mobile', 'css' => 'header a.et_pb_button[href=\'#contact\']{display:inline-block!important}']]]);
if (is_wp_error($id)) { echo $id->get_error_message(); exit; }
Spark_Living_Store::start($id, ['forced_start' => true, 'start_sessions_14d' => 62]);
$start = time() - 3 * 86400 - 3600; Spark_Living_Store::update($id, ['start_date' => gmdate('Y-m-d H:i:s', $start)]);
foreach (['A' => [41, 3, 1], 'B' => [39, 6, 2], 'H' => [9, 1, 0]] as $v => [$n, $intent, $leads]) {
  for ($i = 0; $i < $n; $i++) {
    $sid = substr(md5("shot$v$i"), 0, 16); $vid = substr(md5("sv$v$i"), 0, 16); $t = gmdate('Y-m-d H:i:s', $start + 3600 + $i * 5000);
    $wpdb->insert($T, ['experiment_id' => $id, 'variant' => $v, 'visitor_id' => $vid, 'session_id' => $sid, 'event_type' => 'exposure', 'created_at' => $t]);
    if ($i < $intent) { $wpdb->insert($T, ['experiment_id' => $id, 'variant' => $v, 'visitor_id' => $vid, 'session_id' => $sid, 'event_type' => ($i < $leads) ? 'tel_click' : 'cta_click', 'created_at' => $t]); }
  }
}
echo "seeded $id";
