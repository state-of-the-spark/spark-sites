<?php
function batcache_clear_url($u){ $l=get_option('fl_log',[]); $l[]="batcache_clear_url($u)"; update_option('fl_log',$l,false); return true; }
add_action('spark_living_flush_cache',function(){ $l=get_option('fl_log',[]); $l[]='hook spark_living_flush_cache'; update_option('fl_log',$l,false); });
update_option('fl_log',[]);
include '/wordpress/test-tools/scenario.php';
echo "FLUSH LOG: ".json_encode(get_option('fl_log'))."\n";
