<?php
/**
 * Plugin Name: Spark Roofer Report opt-in
 * Description: Server-side Mailchimp subscribe for /roofing-report/. Keeps the API key off the page
 * and out of reach of ad blockers that block list-manage.com. Added 2026-09-11.
 */
if (!defined('ABSPATH')) { exit; }
// key lives in the wp_options table, never in this file
define('SPARK_MC_LIST', '247570a9c8');
add_action('rest_api_init', function () {
    register_rest_route('spark/v1', '/roofer-report', array(
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => function ($req) {
            $email = sanitize_email((string) $req->get_param('email'));
            $fname = sanitize_text_field((string) $req->get_param('fname'));
            if (!is_email($email)) {
                return new WP_REST_Response(array('ok' => false, 'error' => 'invalid_email'), 400);
            }
            $key = (string) get_option('spark_mc_key');
            if ($key === '') { return new WP_REST_Response(array('ok' => false, 'error' => 'unconfigured'), 500); }
            $dc = substr($key, strpos($key, '-') + 1);
            $hash = md5(strtolower($email));
            $auth = array(
                'Authorization' => 'Basic ' . base64_encode('anystring:' . $key),
                'Content-Type' => 'application/json',
            );
            $up = wp_remote_request('https://' . $dc . '.api.mailchimp.com/3.0/lists/' . SPARK_MC_LIST . '/members/' . $hash, array(
                'method' => 'PUT',
                'timeout' => 15,
                'headers' => $auth,
                'body' => wp_json_encode(array(
                    'email_address' => $email,
                    'status_if_new' => 'subscribed',
                    'merge_fields' => array('MMERGE19' => $fname),
                )),
            ));
            if (is_wp_error($up)) {
                return new WP_REST_Response(array('ok' => false, 'error' => 'network'), 502);
            }
            $code = (int) wp_remote_retrieve_response_code($up);
            if ($code < 200 || $code >= 300) {
                return new WP_REST_Response(array('ok' => false, 'error' => 'mailchimp', 'status' => $code), 502);
            }
            wp_remote_post('https://' . $dc . '.api.mailchimp.com/3.0/lists/' . SPARK_MC_LIST . '/members/' . $hash . '/tags', array(
                'timeout' => 15,
                'headers' => $auth,
                'body' => wp_json_encode(array('tags' => array(
                    array('name' => 'niche-roofing', 'status' => 'active'),
                    array('name' => 'roofing-report', 'status' => 'active'),
                ))),
            ));
            // hand off to n8n, which emails the report (fire and forget: the page never waits on it)
            wp_remote_post('https://hotspark.app.n8n.cloud/webhook/roofer-report', array(
                'timeout' => 5,
                'blocking' => false,
                'headers' => array('Content-Type' => 'application/json'),
                'body' => wp_json_encode(array('email' => $email, 'fname' => $fname)),
            ));
            return new WP_REST_Response(array('ok' => true), 200);
        },
    ));
});
