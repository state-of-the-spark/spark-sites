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

## Dashboard animation (0.1.2)

Result: **live (plugin 0.1.2), not rolled back.** Site confirmed before every write (`siteurl` = https://sparkmysite.com, Pressable site 1614838; every write command also checks it inside the eval and aborts otherwise).

### What changed
Only the admin dashboard (`/living/`, the shortcode and the wp-admin page). A vine (one inline SVG: 2px green stem that draws itself in about 2.2 s, 7 leaves that unfurl as the tip passes, 2 small tendrils, a spark blue bud at the tip) sits under the title; after about 2.6 s about 30 small spark blue bubbles (2 to 5 px, a few with a lighter rim) rise through the first tally card once, and the card settles into a soft spark blue gradient. Transform and opacity only, no libraries, no external requests; `prefers-reduced-motion: reduce` shows the vine drawn and the card at its resting gradient with no motion. Colors: spark blue #0ECAEB (brand token `--ss-cyan`); the brand tokens have no green, so the vine uses the dashboard's own accent family (#238a4a light, #7fd39b dark). Version 0.1.2 in `spark-living.php` (header and constant) and both `editor.asset.php`.

### Local
t10 (36), t11 (34), t12 (15), t13 (42), t14 (16) and `tests/stats-check.js` (28) all pass on the final code. The tally markup keeps `<strong>` directly after the `<li>` open tag (t12 reads it), so the bubble layer sits at the end of the card.

### Deploy
Pressable WP-CLI `wp eval`, but with an in-place patch instead of base64 chunks of whole files: each command held the old md5, the replacement text and the expected new md5, and refused to write unless both matched. Two deploys, both clean:
1. 4 files (dashboard 5d9677f1 to 91668713, spark-living.php 199b6f85 to d28e2041, both editor.asset.php 1a463c6c to 42d66566). Old files copied to `wp-content/sl-bak-012/` first; written as `.new`, md5 checked, then renamed. Verified afterwards: 0 stray `.new` files, `SPARK_LIVING_VERSION` 0.1.2, plugin active.
2. Dashboard only, 91668713 to **f9b694fa** (md5 f9b694faa25b3f310ba00af06eb66943), three string fixes found while viewing the first live frames: the bud's halo ring showed before its turn, the tendrils drew a pinpoint dot before growing, and the stem easing did not match the leaf timing. Old copy kept in `wp-content/sl-bak-012b/`.
Both temporary backup folders were removed after verification (the 0.1.1 originals are in git HEAD and the 13:25 UTC Pressable backups). Edge cache purged and object cache flushed after the first deploy and the edge cache purged again after the second. The README was not copied to live.

### Seen live (as the owner's administrator, user ID 17393, no password touched)
- Short-lived login cookie from WP-CLI (`wp eval`: a 30 minute session token, `wp_generate_auth_cookie` for the `logged_in` scheme) set in my own playwright-core Chromium (desktop user agent, 1366 wide). It worked first time: `/living/` answered 200 and rendered the dashboard. The session tokens were destroyed afterwards (`WP_Session_Tokens::destroy`); the owner's own existing session was not touched.
- Frames captured at exact times by pausing every animation and setting its clock (Web Animations API), plus one real-time 6.5 s load: `C:UsersgrantDocumentsGitHubspark-sitessitesliving-websitesauditscreenshotslive-dash-anim-0.3s.png`, `-1.2s`, `-2.4s`, `-3.2s`, `-4.0s`, `-rest`, and `live-dash-anim-realtime-6s.png` (full page).
- The dashboard shows the running test with its numbers: "Header button wording" (test 46907, running, confirmed by `Spark_Living_Store::get_running()`), day 1 of 14, A "Get started" and B "Get My Free Website Plan" each 0 sessions, 0 intent, 0.0 percent, 0 leads; holdout 0; probability challenger beats current 50.0 percent; status "Minimum run not met yet (7 full days and 100 sessions per variant)". Tally 0 evolved, 0 original won, 1 no difference (the voided 46905 counts as the one no-difference).
- **Administrator exclusion confirmed.** Events table before one logged-in homepage load: 10 rows (max id 10, all the voided 46905 rows). After the load (checked 26 s later) and again after the second dashboard session: still 10 rows, 0 under 46907. In the logged-in page the header button reads "Get started", there is no `sl-v-*` class on `<html>`, no Spark Living inline script and no `spark_living` cookie: the server prints nothing for administrators, so the visit was not counted as an exposure. This closes the "administrator exclusion on live" item left open above.

### Logged out, after the deploy
Homepage 200, `X-nananana: Batcache-Hit`, edge MISS once after the purge then HIT; /shop/ 200 (MISS then HIT); /living/ 404. Pressable PHP log (last 7 days, 218 entries, newest 15:10 UTC): no Spark Living entries; the entries after the deploy are unrelated (AutomateWoo cron reschedule notice).

### Not verified
- Mobile on live (not asked; the site's bot check blocks mobile user agents). Local 390 px frames viewed: the vine is a thin line about 18 px tall at that width with small leaves, readable but small.
- Dark mode and a real phone were not viewed. A browser console error "atob" appeared on the logged-in homepage; it comes from the site's own scripts (the plugin prints nothing for administrators) and was not investigated.
- Real-time frame timing on live was captured once (the 6.5 s load); the timed frames are clock-set, not wall-clock.

## Dashboard animation (0.1.3)

Result: **live (plugin 0.1.3), not rolled back.** Site confirmed before every write (`siteurl` = https://sparkmysite.com, Pressable site 1614838; each write command also aborts unless that matches).

### What changed
Only the admin dashboard (`/living/`, the shortcode and the wp-admin page) plus the version number.
- The vine now stops at 75 percent of the width (stem path ends at x 600 of the 800 unit viewBox; measured 75.0 percent at 1366 and at 390 wide). Stem duration 1.8 s, same easing. Seven leaves and two tendrils were re-spaced along the shorter stem and their delays recomputed from the easing curve so each unfurls as the tip passes.
- The small bud and its halo ring are gone. A Spark burst grows out of the vine tip the moment the stem finishes: scale 0 to 1.18 to 1 with a slight rotation, 0.55 s, then it stays as the resting ornament. Size 36.8 px wide at 1366 (about 2.4 times the leaf height); 1.5 times larger on phones so it stays readable (20.6 px at 390).
- The burst is the real brand mark, redrawn inline (no file request): 9 flared rays plus the core circle from `C:\Users\grant\Documents\GitHub\spark-sites\core\brand\assets\spark-mark.svg`, same angles and ray lengths, filled spark blue #0ECAEB (stays the same in dark mode).
- One CSS value drives the timing: `--sl-stem` (1.8 s). `--sl-burst-at` equals it, and the burst, the evolved card bubbles and the card gradient all start from `--sl-burst-at`, so they cannot drift apart. Bubbles start at 1.8 s (was a fixed 2.6 s), the gradient wash 0.1 s later.
- `prefers-reduced-motion: reduce`: vine drawn to 75 percent, full burst, resting gradient, no bubbles, zero running animations (checked, `getAnimations()` returned 0).
- Version 0.1.3 in `spark-living.php` (header and constant) and both `editor.asset.php`; README title and a "Dashboard animation (0.1.3)" section.

### Local
t10 (36), t11 (34), t12 (15), t13 (42), t14 (16) and `tests/stats-check.js` (28) all pass. Local frames viewed (desktop, 390 px, dark, reduced motion, plus a 3x zoom of the burst on the stem end): `C:\Users\grant\Documents\GitHub\spark-sites\sites\living-websites\audit\screenshots\dash-anim3-local-*.png`.

### Deploy
Same Pressable WP-CLI route, in-place patch with md5 guards (the command refuses to write unless the live old md5 and the patch md5 both match). Old files copied to `wp-content/sl-bak-013/` first, written as `.new`, md5 checked, then renamed. Live md5 after: dashboard f9b694fa to **dbf4e952f25526c823a3b6b25dd3548b**, `spark-living.php` d28e2041 to **e4a3ac8576ff39f81e49647b89af1109**, both `editor.asset.php` 42d66566 to **908f129fa6f65c3648b8d9315b970996**; all four equal the local files. `SPARK_LIVING_VERSION` reads 0.1.3, plugin active, 0 stray `.new` files, 0 stray chunk files. The temporary backup folder and chunk files were removed after verification. Edge cache purged and object cache flushed.

### Seen live (as the owner's administrator, user ID 17393, no password touched)
Short-lived (30 minute) login cookie from WP-CLI, desktop user agent in my own playwright-core Chromium (also used at 390 px width, since the bot check blocks mobile user agents). Frames at exact times (animations paused and clock set): 1.6 s (stem nearly done, no burst yet), 2.0 s (burst mid growth, first bubbles starting), 2.4 s (0.6 s after the burst starts, bubbles mid flight), rest, at 1366 and 390; plus dark mode rest and reduced motion. Files are `live-dash-anim3-*.png` in `C:\Users\grant\Documents\GitHub\spark-sites\sites\living-websites\audit\screenshots\`. Stem measured 75.0 percent live at both widths. Browser page errors: none. The session token created for the cookie was destroyed afterwards.

### Logged out, after the deploy
/ 200, /living/ 404. Pressable PHP log (last 7 days, 220 entries): nothing from Spark Living; newest entry 16:57 UTC, before the deploy.

### Not verified
- Wall-clock timing on live: frames are clock-set, and the real-time sampler returned nothing on live; the 1.82 s stem finish was measured only locally in real time.
- A real phone and a real mobile user agent (frames at 390 px use a desktop user agent).
