# Spark Living staging install, 2026-11-12

**Purpose:** temporary test copy of sparkmysite.com for testing the Spark Living plugin (v0.1.0). Approved by the account owner for testing only, to be deleted later. The live site (Pressable ID 1614838) was never written to.

## The staging site
- Pressable site ID: **1869351**, name `sparkmysite-living-test`
- URL: https://sparkmysite-living-test.mystagingwebsite.com
- Created 2026-11-12 19:30 UTC with the `clone_site` operation (staging: true) from site 1614838. Files and database copied (Divi, Gravity Forms, real pages present). PHP 8.2, WordPress 7.1.4, WP_ENVIRONMENT_TYPE = staging.
- Account counts before: billable 222 / 250, staging 12, total 234. After: billable 222 / 250, staging 13, total 235. **Billable site count did not change** (it counts as a staging site).

## How to delete it later
Pressable operation `delete_site` with `site_id` 1869351 (confirm the ID first; do not run it on 1614838). It needs explicit owner approval at that time.

## Changes made on staging only
- `blog_public` set to 0 (the clone arrived with 1, so the page said `index, follow`). Now the page source says `noindex, nofollow`; Pressable's staging robots.txt already says `Disallow: /`.
- Mail safety: the clone had no mail block. Added mu-plugin `wp-content/mu-plugins/zz-staging-mail-block.php` (`pre_wp_mail` returns false; confirmed active). Deactivated AutomateWoo, Mailchimp for WooCommerce, Gravity Forms Mailchimp, Gravity Forms Zapier and Post to Google My Business so cloned customer data cannot trigger outbound messages. Other mu-plugins (lead tracking, sequence gateway) were left alone, which is why no form was submitted.
- Spark Living uploaded by SFTP to `wp-content/plugins/spark-living` (19 files, `tests` excluded) and activated with `activate_site_plugins`.
- An SFTP password reset and a WordPress application password (name `living-test`, user ID 17393) were created on staging. They disappear with the site. Not recorded here.
- One test created: id 46892, "STAGING TEST hero button wording", selector `a.et_pb_button[href="#contact"]`, A "Get started", B text "Get My Free Website Plan", running, 50/50.

## What passed
- Activation: no PHP errors from the plugin in the Pressable PHP log (only Jetpack and AutomateWoo cron-schedule notices that came from the clone). Table `wp_yzxlp1vqce_spark_living_events` exists on MariaDB, `spark_living_db_version` = 1.
- Homepage renders normally with the plugin active (screenshots viewed: hero-A and hero-B).
- Selector test: of 14 fresh browser contexts, 8 saw the challenger, 5 the original and 1 hit the double-navigation glitch (below); the choice was sticky on a second page load in every case measured. Rows written: exposure A 9, B 12; cta_click A 4, B 5.
- `/living/` returns 404 logged out.
- Nightly job: `wp cron event run spark_living_nightly` completed (0.092s, success, `spark_living_last_run` updated). It is also scheduled (next run about an hour later).

## Caching finding
The site serves pages from Batcache and the CDN (`X-nananana: Batcache-Hit`, `X-ac ... HIT`, `Vary: Cookie`, `Cache-Control: max-age=300`). With no cookies, with the plugin's three cookies, and with 4 different random cookie sets, every request after the first was a cache HIT. **The plugin's cookies do not cause cache misses**; Batcache ignores them. The live site sends the same `Vary: Cookie`. Because the cached HTML is shared, assignment has to happen in the browser (it does). After a test starts or ends the cache must be purged (the plugin does this; on first start the page showed STALE/UPDATING for a few requests, then HIT).

## Not done / caveats
- No Gravity Forms submission was tested: mu-plugins on the clone may call real services, and the form notification settings were not inspected. `form_submit` on real MySQL stays unverified. GA4 mirror also not checked.
- Pressable WP-CLI output is trimmed to 500 characters, so long lists were read partly.
- Headless Chrome needs `navigator.webdriver` spoofed and a normal user agent. The first page load in a fresh context sometimes navigates twice (Pressable edge, not the plugin; the plugin has no reload code), and a few loads in the unspoofed run found no button.
- No plugin bug found on MySQL/Divi, so no plugin code was changed.

## Side-effect check (added 2026-11-12, staging site 1869351 only)

**Time window (UTC).** Clone created 19:30:23. Clone finished and became reachable about 19:38:10 (collaborator-added log entry; first WP-CLI and HTTP responses 19:38:26 to 19:38:57). Mail block mu-plugin on disk 19:41:45 (file time), confirmed active 19:42:08. AutomateWoo, Mailchimp for WooCommerce, GF Mailchimp, GF Zapier and Post to Google My Business deactivation requested 19:41:45. So roughly 3.5 minutes live with mail unblocked and the clone's WP-Cron running.

**1. WooCommerce Subscriptions is in staging (duplicate-site) mode.** `wc_subscriptions_siteurl` = `https://sparkmy_[wc_subscriptions_siteurl]_site.com` (the plugin's duplicate-site marker) against `siteurl` = `https://sparkmysite-living-test.mystagingwebsite.com`; `WCS_Staging::is_duplicate_site()` returned true. Automatic payments are disabled in that mode.

**2. Action Scheduler.** Rows that ran on the clone after 19:38:10: AutomateWoo job runners (run_queued_workflows, abandoned_carts and others) 11 complete (first 19:38:28) and 10 failed after the plugin was deactivated (19:43:02 onward); `affwp_payout_batch_watchdog` 2 complete (19:40:41); `automatewoo/system_check` 1 failed. Zero `woocommerce_scheduled_subscription_payment` actions ran. Rows stamped 19:30:44 to 19:30:45 (including one Mailchimp single-product sync and a Stripe cache prefetch) were copied from the live site before the clone existed. AutomateWoo queue = 0 rows, and no AutomateWoo log row newer than 2025-10-10, so no workflow ran. Pending before cleanup: 34 subscription payments due 20:08 today to 19 Nov, 2 end-of-prepaid-term, AutomateWoo and AffiliateWP housekeeping.

**3. Orders.** No orders, subscriptions, renewal orders or refunds created since 19:30, and 0 order notes.

**4. Custom mu-plugins.** None schedule WP-Cron events (no `wp_schedule_*` calls); they act on requests and form submits. Outward endpoints by file: spark-seq-gateway (hotspark.app.n8n.cloud webhooks seq-enroll, seq-contact, spark-crm-subscribe); spark-roofer-report (n8n roofer-report); spark-law-report (n8n law-report); spark-ai-real-work, spark-ada-scan, spark-ai-search-check, spark-law-signup-alert (ClickUp API, reCAPTCHA siteverify, Google PageSpeed, wp_mail); spark-law-workshop (reCAPTCHA); spark-ai-readiness (wp_mail/remote post). Web server log shows no visitor POSTs or form submissions to the clone between 19:38 and 19:42 (only Jetpack, WP-Cron self-calls and later my own tests), so none of these fired.

**5. Cannot tell / residual.** Jetpack was connected to WordPress.com with the live site's token and WordPress.com called the clone (xmlrpc, full-sync 19:39:37, sync checkouts every ~7s until 19:41:57). Whether the clone pushed anything back to WordPress.com cannot be confirmed from here. Mailchimp for WooCommerce has an API key set and was active for about 3.5 minutes; its only action record is the pre-clone 19:30:45 one, so no sync is evidenced.

**Changes made (staging only).** Cancelled 186 pending Action Scheduler rows (subscription renewal and end-of-term, AutomateWoo, Mailchimp, Stripe, AffiliateWP hooks; 166 of them subscription actions). Deleted cron `mailchimp_user_sync_run` (`mc4wp_refresh_mailchimp_lists` is still scheduled, a Mailchimp list read, left alone). Deactivated Jetpack. Renamed nine mu-plugins that call outside services to `.php.disabled-staging`: spark-ai-real-work, spark-law-workshop, spark-seq-gateway, spark-ada-scan, spark-ai-search-check, spark-roofer-report, spark-ai-readiness, spark-law-signup-alert, spark-law-report. WooCommerce Subscriptions and Gravity Forms stayed active. Homepage and Spark Living API still respond (HTTP 200).

## Test 2 on staging (2026-11-12)

Staging site 1869351 only (URL contains mystagingwebsite.com, checked before every write). The live site was not touched.

**Step 1, plugin update.** Uploaded the 19 plugin files (no `tests` folder) over `wp-content/plugins/spark-living` by SFTP (paramiko; a fresh SFTP password was reset for the non-owner login on this staging site, not recorded here). Plugin still active (`wp plugin list`: spark-living, active; the version header still reads 0.1.0). `GET /state` now returns `rules.eligibility_sessions_14d` = 100, so the new code is the code that is running. The Pressable PHP log has no Spark Living entries (only the clone's AutomateWoo and Jetpack cron-schedule notices, one earlier WP-CLI eval parse error, and a "log-only" bot-protection notice for my admin login). WP_DEBUG is off on this site, so there is no wp-content debug.log. Homepage returns 200. Test 46892 on desktop (1366px, 8 fresh contexts): A "Get started" and B "Get My Free Website Plan" both assigned, class `sl-v-46892-A/B` on `<html>`, same behavior as before.

**Test 46892 ended.** Final numbers at conclusion: A 18 sessions, 4 intent, 0 leads; B 22 sessions, 5 intent, 0 leads; H 4 sessions, 0 intent. P(B beats A) 0.50. Concluded through the API as `no_difference` (log entry 46893).

**Test 2 created and started: id 46894**, "Header Get started button on mobile". page = homepage, device = mobile, target `a.et_pb_button[href="#contact"]` (one match on the page), tier 1, `force: true`, `sessions_14d: 41` (stored as `forced_start: true`, `start_sessions_14d: 41`; the dashboard says "Started below the 100-session bar (41 sessions in the last 14 days)"). Variant A = original (hidden on mobile). Variant B CSS (376 characters, sanitizer left it unchanged):

```
@media (max-width:980px){.et_pb_section a.et_pb_button.et_pb_button_0{display:inline-block!important;position:absolute!important;top:33px;right:34px;z-index:6;margin:0!important;padding:6px 12px!important;font-size:13px!important;line-height:1.2!important;white-space:nowrap}.et_pb_section_0 .et_pb_column_1,.et_pb_section_0 .et_pb_button_0_wrapper{position:static!important}}
```

**Why the suggested starting CSS was not enough.** `@media (max-width:980px){.et_pb_button_0{display:inline-block !important}}` does not show the button. Divi's hiding rules (`.et_pb_button_0{display:none!important}` inside two media queries) are printed in a `<style>` in the page BODY after the button, so with equal specificity and `!important` on both, Divi's rule comes later in the document and wins over a style the plugin puts in the head. Raising specificity (`.et_pb_section a.et_pb_button.et_pb_button_0`) fixes it. Worth adding to the plugin README (not done): a CSS variant that needs to beat Divi must out-rank it, not just use `!important`. Checked by injecting each candidate in a browser first.

**Layout of the final CSS.** The button sits in a separate column below the logo/menu column, so showing it with just display would add a 50px row under the header. The snippet takes it out of the flow and positions it against the header row (`position:absolute`, with its column and wrapper set to `static` so the row is the containing block), compact 13px size, vertically centered next to the hamburger. Measured: header height stays 93px; at 390px the button is x 240-337, y 33-61, the hamburger is x 350-364 and the logo box ends at x 210; at 360px the button starts at x 211 (1px clear of the logo box); at 768px x 599-696 against hamburger at 709. No overlap with the hamburger or logo at 360, 390, 768 or 980. `scrollWidth` equals viewport width (no horizontal scroll).

**Step 4, browser checks** (own playwright-core Chromium 158, desktop user agent, fresh context per session, `navigator.webdriver` spoofed; the bot check answers 403 once and then the real page loads, as before).
- 390x844: both variants seen (several sessions each). B: `sl-v-46894-B` on html, `<style id="spark-living-css-...">` present, button visible beside the hamburger, no overlap. A (and holdout H): no style element, button `display:none`.
- 768x1024: both variants seen, same results (B button beside the hamburger, x 599-696).
- Sticky: every session reloaded once, same class both times (A stayed A, B stayed B, H stays A); cookie `spark_living_a` = `46894:A`, `46894:B` or `46894:H`.
- Flicker, B: the button is already visible and positioned in the first animation frame in which it exists (frame trace on every session; no frame with the button hidden). Original (A): the button is `inline-block` for the first ~4 frames (~190 ms in the trace) and then Divi's body-level rule hides it, so the first paint can include a brief flash of the original button. This comes from Divi (the rule is after the button in the HTML), not from the plugin (A sessions have no plugin style); the same thing happens on the live site today. Not measured against a no-plugin baseline.
- Desktop 1366x900, 5 fresh sessions: no `sl-v-46894` class, no CSS style element, button at its normal place (x 1166-1298, y 20-70), cookie `spark_living_a` = `0:L` (4 sessions) or `0:H` (1), zero requests to `/spark-living/v1/event` (also none after clicking the button). Nothing logged.
- Tap on B (touch emulation): button tapped, page smooth-scrolled to `#contact`, one `cta_click` row for B written.
- Page cache: after the start, a few requests showed STALE/UPDATING (Batcache regenerating), then HIT. With five different cookie sets (none, A cookie, two B cookies, a plain visitor id) every response was HIT and byte-identical (379,126 bytes, same md5). The cached HTML carries the B css inside the inline config; assignment is done in the browser.

**Events (MySQL), experiment 46894 at the time of the check:** exposure A 11, B 4, H 1 (16 distinct sessions, 17 rows), cta_click B 1. The 1366px runs and all of 46892's earlier desktop runs added no 46894 rows. Experiment 46892 rows in the same window: exposure A 2, B 4, H 2 (the 8 desktop sessions from the step 1 check). Dashboard (`/living/`, logged in as admin) shows the same numbers: A 11 / B 4 (1 intent, 25%) / H 1, P(B beats A) 92.6%, history lists 46892 as no difference (intent 22.2% vs 22.7%).

**Screenshots** (`C:\Users\grant\Documents\GitHub\spark-sites\sites\living-websites\audit\screenshots\`): `test2-mobile-A.png`, `test2-mobile-B.png`, `test2-tablet-B.png`, `test2-tablet-A.png` (extra), `test2-desktop.png`, `test2-dashboard.png`.

**Staging-only changes made in this round:** SFTP password reset for login `m63b5f47098255081`; application password `lv2` created for user 17393 (login `grant`); that user's password was set to a throwaway value so the `/living/` dashboard could be viewed logged in. All vanish with the site. Nothing re-enabled (the disabled mu-plugins, AutomateWoo, Mailchimp, GF add-ons and Jetpack stay off). Nothing sent, committed or pushed.

**Not verified:** the eligibility refusal itself (400/422 without `sessions_14d`) was not exercised on staging (only the forced start with 41); `form_submit` and the GA4 mirror remain untested here; the red "a" next to the logo in the screenshots is the Divi hamburger icon font not loading in headless Chromium (also in the pre-test baseline), so the real hamburger glyph was not seen; a real phone (touch, address-bar resize, orientation change) was not used, only emulated viewports with a desktop user agent; the A-variant first-paint flash was observed but not compared with a plugin-free load.
