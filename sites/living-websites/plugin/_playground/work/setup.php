<?php
// Create test pages (button page + block page) once.
$btn = '<!-- wp:html --><p><a class="header-cta" href="#" data-living-cta>Free Quote</a> <a id="callus" href="tel:+13215550100">Call us</a> <form id="f1" action="#" onsubmit="return false"><input id="in1" name="n" type="text"></form></p><!-- /wp:html -->';
$p1 = wp_insert_post(['post_title'=>'Button Test','post_name'=>'button-test','post_status'=>'publish','post_type'=>'page','post_content'=>$btn]);
echo "button page $p1\n";
$exp = (int)($_GET['exp'] ?? 0);
$blk = '<!-- wp:spark-living/living-block {"experimentId":'.$exp.'} --><!-- wp:spark-living/variant {"variantKey":"A"} --><!-- wp:paragraph --><p>VARIANT-A-TEXT</p><!-- /wp:paragraph --><!-- /wp:spark-living/variant --><!-- wp:spark-living/variant {"variantKey":"B"} --><!-- wp:paragraph --><p>VARIANT-B-TEXT</p><!-- /wp:paragraph --><!-- /wp:spark-living/variant --><!-- /wp:spark-living/living-block -->';
$p2 = wp_insert_post(['post_title'=>'Block Test','post_name'=>'block-test','post_status'=>'publish','post_type'=>'page','post_content'=>$blk]);
echo "block page $p2\n";
