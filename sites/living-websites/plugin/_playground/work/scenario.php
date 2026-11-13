<?php
// Seed synthetic events for one scenario and run the nightly job by hand.
global $wpdb; $T=$wpdb->prefix.'spark_living_events';
$s=$_GET['s']??'a';
$sc=[
 // days, A(sessions,intent,leads), B(sessions,intent,leads)
 'a'=>[8,[150,15,2],[150,40,6],'clear B win'],
 'b'=>[15,[200,20,4],[200,22,4],'day 14 no winner'],
 'c'=>[8,[150,15,12],[150,40,3],'B ahead on intent, worse on leads'],
 'd'=>[3,[30,3,0],[30,20,5],'early, B far ahead (weights clamp 0.8)'],
 'e'=>[3,[30,20,5],[30,3,0],'early, B far behind (weights clamp 0.2)'],
 'f'=>[8,[150,40,10],[150,10,2],'clear A win'],
];
[$days,$A,$B,$label]=$sc[$s];
$run=Spark_Living_Store::get_running(); if($run) Spark_Living_Store::update($run['id'],['status'=>'concluded']);
$wpdb->query("DELETE FROM $T");
$id=Spark_Living_Store::create(['name'=>"Scenario $s: $label",'element_type'=>'selector','target'=>'.header-cta','hypothesis'=>'h','tier'=>1,'variants'=>['A'=>['label'=>'A'],'B'=>['label'=>'B','changes'=>[['op'=>'text','value'=>'New']]]]]);
if(is_wp_error($id)){echo $id->get_error_message();exit;}
$st=Spark_Living_Store::start($id); if(is_wp_error($st)){echo $st->get_error_message();exit;}
$start=time()-(int)($days*86400)-3600; Spark_Living_Store::update($id,['start_date'=>gmdate('Y-m-d H:i:s',$start)]);
$n=0;
foreach(['A'=>$A,'B'=>$B] as $v=>[$sess,$int,$leads]){
  for($i=0;$i<$sess;$i++){
    $sid=substr(md5("$s$v$i"),0,16); $vid=substr(md5("v$s$v$i"),0,16);
    $t=gmdate('Y-m-d H:i:s',$start+3600+($i*37%max(1,$days*86000)));
    $wpdb->insert($T,['experiment_id'=>$id,'variant'=>$v,'visitor_id'=>$vid,'session_id'=>$sid,'event_type'=>'exposure','created_at'=>$t]);
    if($i<$int){ $et=($i<$leads)?(($i%2)?'tel_click':'form_submit'):'cta_click'; $wpdb->insert($T,['experiment_id'=>$id,'variant'=>$v,'visitor_id'=>$vid,'session_id'=>$sid,'event_type'=>$et,'created_at'=>$t]); }
  }
}
echo "scenario $s ($label) exp=$id days=$days\n";
$before=Spark_Living_Store::get($id)['weights'];
Spark_Living_Cron::run();
$e=Spark_Living_Store::get($id);
echo "before weights: ".json_encode($before)."\nafter: status={$e['status']} verdict={$e['verdict']} winner={$e['winner']} promoted=".var_export($e['promoted'],true)." weights=".json_encode($e['weights'])."\n";
if(!empty($e['snapshot'])) echo "snapshot decision: ".json_encode($e['snapshot']['decision'])."\n";
else { $sn=Spark_Living_Engine::snapshot($e); echo "live decision: ".json_encode($sn['decision'])."\ncounts: ".json_encode($sn['counts'])."\n"; }
$log=Spark_Living_Store::log_entries(1,1); echo "latest log entry: ".json_encode($log['items'][0]??null)."\n"; echo "total log entries: {$log['total']}\n";
