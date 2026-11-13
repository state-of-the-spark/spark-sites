<?php
kses_remove_filters(); $p=get_page_by_path('button-test');
$c='<!-- wp:html --><p><a class="header-cta" href="#" data-living-cta>Free Quote</a> <a id="callus" href="tel:+13215550100">Call us</a></p><form id="f1" action="#" onsubmit="return false"><input id="in1" name="n" type="text"></form><!-- /wp:html -->';
global $wpdb; $wpdb->update($wpdb->posts,['post_content'=>$c],['ID'=>$p->ID]); clean_post_cache($p->ID); echo "ok";
