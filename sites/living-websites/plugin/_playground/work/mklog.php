<?php
// Test helper: ?kind=revert adds a revert log entry; ?kind=guard concludes a fresh test with guard_blocked.
$kind = $_GET['kind'] ?? '';
$id = Spark_Living_Store::create(['name' => "Seed $kind", 'element_type' => 'selector', 'target' => '.zzz-seed', 'tier' => 1, 'variants' => ['A' => ['label' => 'A'], 'B' => ['label' => 'B', 'changes' => [['op' => 'text', 'value' => 'x']]]]]);
if (is_wp_error($id)) { echo $id->get_error_message(); exit; }
$exp = Spark_Living_Store::get($id);
if ($kind === 'revert') {
  Spark_Living_Store::add_log_entry($exp, ['verdict' => 'reverted', 'entry_type' => 'revert', 'shipped' => false, 'numbers' => [], 'note' => 'seed']);
  echo 'revert logged';
} elseif ($kind === 'guard') {
  Spark_Living_Store::start($id);
  echo 'guard ', is_wp_error($r = Spark_Living_Engine::conclude($id, 'guard_blocked', Spark_Living_Engine::snapshot(Spark_Living_Store::get($id)), 'rest', 'seed')) ? $r->get_error_message() : 'concluded';
}
