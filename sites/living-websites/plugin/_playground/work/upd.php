<?php
$exp=(int)$_GET['exp']; $p=get_page_by_path('block-test'); 
$c=preg_replace('/"experimentId":\d+/','"experimentId":'.$exp,$p->post_content);
wp_update_post(['ID'=>$p->ID,'post_content'=>wp_slash($c)]); echo "ok $exp";
