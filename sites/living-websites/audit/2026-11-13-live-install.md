# Spark Living live install, 2026-11-13

Site: https://sparkmysite.com, Pressable site ID 1614838 (confirmed by `get_site_status`: name sparkmysite, live, edge cache enabled; `wp option get siteurl` = https://sparkmysite.com before every write). Approved by the owner on 2026-11-13. Result: **installed and running. Not rolled back.**

## Backup (taken first, 2026-11-13 13:25 UTC)
Pressable on-demand backups (kept 30 days, delete_at 2026-12-13):
- Database: id 17387975529, request 1081332, 49,996,266 bytes, completed 13:26:11 UTC.
- Filesystem: id 17387980953, request 1081333, 8,081,613,396 bytes, completed 13:30:14 UTC (finished after the plugin files were copied but before activation).
Latest scheduled hourly backup at the time: 12:00 PM (db 17387867882, fs 17386246146).

## Baseline (before install, 13:25 UTC)
- Homepage HTTP 200, `X-nananana: Batcache-Hit`, `Cache-Control: max-age=10, must-revalidate`, `Vary: Cookie`, edge `X-ac ... HIT/MISS`.
- /blog/ 200, /shop/ 200, /cart/ 200, /checkout/ 302 (empty cart redirect, same after install), /living/ 404.
- Header button: one match for `a.et_pb_button[href="#contact"]`, text "Get started", x 1166, y 20, 132 x 49.5 px.
- Screenshot: `C:\Users\grant\Documents\GitHub\spark-sites\sites\living-websites\audit\screenshots\live-baseline-desktop.png`.
- No mobile baseline screenshot was taken before install (not asked for first); see "Not verified".

## What was installed
- Plugin `spark-living` v0.1.0, 19 files (same set as staging, no `tests` folder), from `C:\Users\grant\Documents\GitHub\spark-sites\sites\living-websites\plugin\spark-living\`.
- How: the SFTP passwords on file no longer authenticate and the rules forbid resetting any SFTP user on live. So the plugin zip was sent through Pressable WP-CLI: 13 base64 chunks written with `wp eval` into wp-content, reassembled, md5 checked (077b22317c1a8662c78e7fca37cf86d9, identical to the local zip), then `wp plugin install /srv/htdocs/wp-content/sl-inst.zip` (installed inactive), then `wp plugin activate spark-living`. The temporary chunk files and zip were deleted (glob count 0). Two chunks were missing on the first assembly (the md5 did not match, a warning appeared in the PHP log at 13:28); they were re-sent and the md5 then matched.
- Activation: clean. Table `wp_yzxlp1vqce_spark_living_events` exists, `spark_living_db_version` = 1.
- No other plugin, theme or setting was touched. No form submitted, no order, no email.

## Test
- ID **46905**, "Header button wording", status running, `force` not used (`forced_start: false`), `start_sessions_14d: 137`, started 2026-11-13 13:32:52 UTC.
- page: homepage, device all, tier 1, selector `a.et_pb_button[href="#contact"]`, weights 50/50 (10 percent holdout always sees A).
- A (original) "Get started"; B (challenger) text change "Get My Free Website Plan".
- Created through the REST API with a new application password (see credentials). Page caches purged afterwards (Pressable edge cache purge plus object cache flush; the plugin also flushes on start).

## Verification (logged out, fresh cookie jar each, own playwright-core Chromium with a desktop user agent)
- Desktop 1366x900: both wordings seen (A "Get started", B "Get My Free Website Plan"). Every session kept its wording on reload; cookie `spark_living_a` = `46905:A` or `46905:B`; class `sl-v-46905-A/B` on `<html>`.
- Layout: B button x 1065, width 233, height 50 (A: x 1166, width 132, height 50). No wrapping, right edge of the last menu link at x 973, so no overlap with the menu. Screenshots viewed: `live-test1-A-desktop.png`, `live-test1-B-desktop.png`.
- No visible text swap: a per-frame trace of the button (text plus visibility) shows exactly one visible text per session, equal to the final one; the first visible frame already carries the final wording.
- Mobile 390x844: the header button stays `display:none` (Divi), hamburger shows, no horizontal scroll (scrollWidth 390), no injected style. Screenshot viewed: `live-test1-mobile.png`.
- Cache: homepage MISS once after the purge, then HIT for every request with no cookies, with plugin cookies for A, B and H, and with random cookie values; all responses byte-identical (md5 fef19501, 376,892 bytes). `X-nananana: Batcache-Hit` throughout.
- Pages after activation: / 200, /blog/ 200, /shop/ 200, /cart/ 200, /checkout/ 302 (as before), /living/ 404 logged out, `/wp-json/spark-living/v1/state` 401 without credentials and 200 JSON with the application password.
- PHP log: no entries from Spark Living. The only new entries are my own WP-CLI file warnings at 13:28 (the two missing chunks) and OnePress Login "could not validate user agent" notices from my admin-login attempts.
- Console: the only error in every session is the first document request answered 403 by the site's bot check (known, same as staging); the page then loads. No JavaScript errors from the plugin.
- Exposures logged to MySQL: yes. Final table state: A exposure 6 sessions, B exposure 4 sessions.
- Click scroll: clicking the button scrolls to the contact section (scrollY 7271, #contact top at 291 px in the viewport).

## Problems found
1. **cta_click is not logged for this test.** Clicking the header button (A and B) wrote no `cta_click` row. In `assets/js/living.js` `targetClicked()` only counts clicks on the target selector for tests whose B variant has a `css` snippet; for a text-change test a click only counts if the element has `data-living-cta`, and the Divi button does not. The staging test hid this because the staging script set `data-living-cta` by hand. Effect: for test 46905 "intent" will read 0 for both variants; only `form_submit` and `tel_click` can count (and `form_submit` on live is untested). Suggested fix (not applied; the install brief said change nothing beyond the list): in `targetClicked()` drop the `!(q.t.variants && q.t.variants.B && q.t.variants.B.css)` part of the condition so any selector test counts a click on its own target.
2. **GA4 mirror does not fire.** The site loads Google Analytics through Google Tag Manager; `window.gtag` is `undefined` in the browser, and the plugin only mirrors `living_exposure` / `living_conversion` when `gtag` exists. A dataLayer scan found no `living` pushes. The ga4-analytics MCP also errored on every query ("'list' object is not callable"), so GA4 itself was not queried.
3. Logo word under "spark" rotates between visits ("AUTO", "INFLUENCERS"), so it differs between the baseline and test screenshots; it is the site's own animation, not the plugin.

## Not verified
- Administrator exclusion from counting on live: no working admin session. Pressable's OnePress one-click login refused every attempt ("could not validate user agent"), and I did not force a session or change any password. The exclusion is documented (server prints nothing for users who can edit posts, cookie `spark_living_staff`) and was not seen live. The `/living/` dashboard screenshot (`live-dashboard.png`) therefore does not exist.
- Mobile: no pre-install baseline screenshot; compared against the known Divi behavior (button hidden on mobile) only. Real phone not used; the site's bot check returns 403 to mobile user agents.
- `form_submit` (no forms submitted), GA4 data, the nightly cron (not yet run on live; scheduled).

## Credentials created
- WordPress application password named **spark-living-install** on user grant (ID 17393). Used only for the REST calls to create the test and read `/state`. Revoke when finished with `wp user application-password delete 17393 <uuid>` or in the user's profile. No existing password, SFTP user or account was changed.
- Three OnePress one-time login URLs were generated (30 second expiry, not used successfully).

## My own test sessions (discount these)
10 sessions landed in the test data (exposure rows: 6 A, 4 B), all mine and all from 2026-11-13 13:33 to 13:45 UTC: 4 in the main run, 1 click debug run, 3 failed admin-login attempts (they loaded as ordinary visitors), 1 mobile, 1 GA check. The table held exactly these 10 rows at the last count. Delete them if wanted: `wp db query "DELETE FROM wp_yzxlp1vqce_spark_living_events WHERE created_at < '2026-11-13 13:50:00'"` (run only before real visitors accumulate, or use a tighter time filter).

## How to roll back
Deactivating is the full rollback: `wp plugin deactivate spark-living` (or `deactivate_site_plugins` with path `spark-living`), purge the edge cache (`purge_site_edge_cache`), confirm the header shows "Get started" and the pages return 200. Data stays in the events table; the plugin directory can be deleted afterwards. The database/file backups above are available if ever needed.

## Click logging fix (2026-11-13)

Result: **fix live (plugin 0.1.1), test restarted clean. Not rolled back.** Site confirmed before every write (`siteurl` = https://sparkmysite.com, Pressable site 1614838).

### Code changes (local, not committed)
- `assets/js/living.js` `targetClicked()`: dropped the "variant B carries css" condition, so any selector-based test (text, href, class, style or CSS variant) counts a click on its own target as `cta_click`, once per session, for A, B and holdout sessions. `data-living-cta` still works.
- Same file: the GA mirror falls back to `window.dataLayer.push({event: 'living_exposure' | 'living_conversion', living_experiment, living_variant, living_event})` when `window.gtag` is absent and `dataLayer` exists. Nothing was changed in Google Tag Manager or Analytics. README notes that a GTM tag is needed to forward these events.
- Version 0.1.1 in `spark-living.php` (header and `SPARK_LIVING_VERSION`), both `editor.asset.php` files, README title, and a version line in the living.js header comment (the script is printed inline, so the cache purge is what delivers it).
- New Playground test `_playground/t14.js` (16 checks). t10 (36), t11 (34), t12 (15), t13 (42), t14 (16) and `tests/stats-check.js` (28) all pass.

### Deploy
Same route as the install (Pressable WP-CLI, base64 through `wp eval`), but only the 4 changed runtime files, each md5-checked against the local file before the swap: living.js 15e415b4999df4eabc21951f11424e11, spark-living.php 199b6f8595a048d0feae0215edfd9f74, both editor.asset.php 1a463c6cc4df5174483d4e11dc9bd7f5. The README was not copied to live (documentation only). The old files were copied to `wp-content/sl-bak-010/` first and that folder was removed after verification (old versions are in git and the 13:25 UTC Pressable backups). No stray `.new` files. `wp plugin get`: spark-living active; `SPARK_LIVING_VERSION` reads 0.1.1 on live. The `spark-living-install` application password was not needed: the test steps ran as user 17393 through `rest_do_request` inside WP-CLI, so no credential was read, reset or created.

### Test restart
- Old test 46905: the plugin has no delete function (tests are a custom post type, only conclude exists), so it was **concluded with the note "voided: click logging bug"** (verdict no_difference, the only neutral verdict the API offers). Its 10 clickless event rows (6 A exposure, 4 B exposure, all agent sessions) were left in place under experiment_id 46905 and do not touch the new test.
- New test **46907** "Header button wording", running, **started 2026-11-13 13:58:11 UTC**, `forced_start` false, `start_sessions_14d` 137, device all, selector `a.et_pb_button[href="#contact"]`, A "Get started", B text change "Get My Free Website Plan", weights 50/50, 10 percent holdout. The hypothesis text is the original minus the quote marks around 'Get started'.
- Edge cache purged and object cache flushed after the deploy and again after the test change (the plugin also flushes on start/conclude).

### Verified on live (logged out, fresh cookie jars, desktop UA, 1366x900, own playwright-core Chromium)
- 3 sessions (bucket preset for A and B, one natural): A shows "Get started" (class `sl-v-46907-A`), B shows "Get My Free Website Plan" (`sl-v-46907-B`); each wording stays after a reload; cookie `spark_living_a` = `46907:A` / `46907:B`. The button has no `data-living-cta`. Wording was read from the DOM (text, class, cookie); the clipped header screenshots from this run were taken after the click scrolled the page and show nothing useful, so no screenshot is cited (the 13:45 install screenshots `live-test1-A-desktop.png` / `live-test1-B-desktop.png` show the same two wordings in the header).
- Each session clicked the button twice: events table held exactly **1 exposure + 1 cta_click per session** (A, B, A), 6 rows for 46907.
- Served page carries the 0.1.1 script ("Spark Living 0.1.1" and the dataLayer code are in the inline script) and test id 46907.
- `window.dataLayer` received `{event:'living_exposure', living_experiment:46907, living_variant:'A'|'B'}` and `{event:'living_conversion', ..., living_event:'cta_click'}`; `window.gtag` is `undefined` on the site.
- HTTP: / 200 (MISS then HIT, `X-nananana: Batcache-Hit`), /shop/ 200 (MISS then HIT), /cart/ 200 (BYPASS, normal for the cart), a new cache-busted URL MISS then HIT.
- Console: only the known 403 on the first document request (site bot check); no JavaScript errors. PHP log: no Spark Living entries and nothing newer than 13:37 UTC.

### Cleanup of my sessions
3 sessions (ids 8401d67cb598d9d1, b3e929435fea3c86, f9613079451754e0). Events table before: 16 rows (10 under 46905, 6 under 46907). Deleted the 6 by those session ids ("Rows affected: 6"). After: 10 rows (only the voided 46905 rows), **0 rows under 46907**. Two earlier script attempts of mine failed before reading the page (site bot-check redirect) and wrote no rows.

### Not verified
- GA4 itself and a GTM tag: none exists yet, so the dataLayer events are not forwarded to GA4 until a GTM tag is added.
- Mobile after the fix (only the desktop path changed; mobile hides the button).
- `form_submit` on live, administrator exclusion, a natural B assignment from a random cookie (B was checked with a preset bucket).
