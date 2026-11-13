<?php
// Test helper: an editor account (not an administrator) for the force-denied check.
if (!username_exists('ed1')) { $id = wp_create_user('ed1', 'password', 'ed1@example.test'); (new WP_User($id))->set_role('editor'); echo "created $id"; } else { echo 'exists'; }
