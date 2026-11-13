<?php
// Test helper: stop the running test and un-promote winners without writing log entries. ?events=1 also empties the events table.
$r = Spark_Living_Store::get_running();
if ($r) { Spark_Living_Store::update($r['id'], ['status' => 'concluded']); }
foreach (Spark_Living_Store::get_promoted() as $e) { Spark_Living_Store::update($e['id'], ['promoted' => false]); }
global $wpdb;
if (!empty($_GET['events'])) { $wpdb->query("DELETE FROM {$wpdb->prefix}spark_living_events"); }
echo 'ok';
