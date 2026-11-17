<?php
// Temp fixture: one shipped winner (so the evolved card shows a number) then the seeded running test.
$id = Spark_Living_Store::create(['name'=>'Footer wording','element_type'=>'selector','target'=>'footer a','hypothesis'=>'Clearer wording wins.','tier'=>1,'device'=>'all','variants'=>['A'=>['label'=>'Old'],'B'=>['label'=>'New','changes'=>[['op'=>'text','value'=>'New wording']]]]]);
Spark_Living_Store::start($id, ['forced_start'=>true,'start_sessions_14d'=>200]);
$exp = Spark_Living_Store::get($id);
Spark_Living_Engine::conclude($id,'ship_b',Spark_Living_Engine::snapshot($exp),'admin','Shipped.');
echo "ok";
