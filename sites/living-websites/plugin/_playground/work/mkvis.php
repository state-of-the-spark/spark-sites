<?php
// Test helper: a page whose header button is hidden on mobile by the "original" CSS (the Divi use case).
kses_remove_filters();
$html = '<!-- wp:html --><style>@media (max-width:980px){header.sl-hdr a.et_pb_button[href="#contact"]{display:none}}</style><header class="sl-hdr"><a class="et_pb_button" href="#contact">Get started</a></header><p>Page body</p><!-- /wp:html -->';
$p = get_page_by_path('vis-test');
if ($p) { global $wpdb; $wpdb->update($wpdb->posts, ['post_content' => $html], ['ID' => $p->ID]); clean_post_cache($p->ID); echo "updated {$p->ID}"; }
else { $id = wp_insert_post(['post_title' => 'Vis Test', 'post_name' => 'vis-test', 'post_status' => 'publish', 'post_type' => 'page', 'post_content' => $html]); echo "created $id"; }
