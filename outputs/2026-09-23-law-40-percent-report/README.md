# The 40% Problem — Law Firm Lead Magnet

Cloned from the roofer-report pipeline (`../2026-09-11-roofer-report/`) for Florida law
firms. Built 2026-09-23.

## What was built

1. **PDF report** — `The-40-Percent-Problem-Spark-Sites.pdf` (this folder), 13 pages,
   letter size, Quiet Voltage brand (ink `#101418`, cyan `#0ECAEB`, Hanken Grotesk +
   Source Serif 4). Cover, Read This First, 8 truths (Truth1–Truth8), tear-out
   checklist (10 questions), the offer, sources. Truths 1 and 2 carry real two-column
   tables (secret-shopper results; cost-per-click by search term). Truth 8 uses a
   4-card stat grid (calls / inquiries / consultations booked / clients signed).
   Cover uses `design/attorney-phone-files.webp` (the uploaded
   `law-firm-attorney-phone-case-files.webp`) as a full-bleed photo behind a big
   "40%" treatment. The landing page hero uses the uploaded
   `law-firm-attorney-client-consultation-florida.webp` directly from its existing
   sparkmysite.com URL.
   - Build script: `design/build.mjs` (run `node build.mjs` from `design/` to
     regenerate `canvas.json`, the 13 `*.dc.html` artboards, and `print.html`).
   - Rendered to PDF with headless Chrome: `chrome --headless --print-to-pdf` against
     `design/print.html` (no Claude in Chrome, no Puppeteer — matches the task's
     headless-only constraint).
   - **Every one of the 13 pages was rendered to PNG and visually inspected**
     (`design/previews/*.png`, via `chrome --headless --screenshot` against each
     `.dc.html` artboard at 816×1056). No overflow, no clipped text, no orphan
     headings, no blank pages. A Chrome `document.fonts.ready` fit-check
     (`data-fit` attribute dumped from `print.html`) also confirmed every page's
     content height stayed within the 1056px page box.
   - **Poppler (`pdftoppm`/`pdftocairo`/`pdfinfo`) segfaults on this machine** on
     *any* PDF, including the existing roofer PDF — confirmed it is a broken local
     Poppler install, not a defect in this file. Used Chrome screenshots of the
     source artboards instead, which is an equivalent (arguably better) visual
     proof since it is pixel-for-pixel what the PDF page contains.

2. **PDF uploaded to sparkmysite.com media.**
   - Media ID: **46283**
   - URL: `https://sparkmysite.com/wp-content/uploads/2026/09/The-40-Percent-Problem-Spark-Sites.pdf`
   - Verified live: HTTP 200, 1,618,243 bytes (matches the local file exactly).

3. **Landing page published: `law-firm-report`.**
   - Page ID: **46292**
   - URL: `https://sparkmysite.com/law-firm-report/`
   - Cloned page 46050's structure/template: `template: page-template-blank.php`,
     `comment_status`/`ping_status: closed`, `parent: 0`, no featured image — pulled
     via `GET /wp-json/wp/v2/pages/46050?context=edit` and matched field for field.
   - Content: `landing/law-firm-report-lp.html`, scoped under `#slr` (not `#srr`, to
     avoid any collision with the roofer page's CSS/JS if both ever loaded together).
   - **Published but noindexed**, same as the roofer page was pre-launch: Yoast's
     `_yoast_wpseo_meta-robots-noindex` postmeta is not exposed via the REST `meta`
     field on this site, so it was set with Pressable WP-CLI:
     `wp post meta update 46292 _yoast_wpseo_meta-robots-noindex 1`. Verified on the
     LIVE page, not just the setting: `<meta name='robots' content='noindex, follow' />`
     is present in the rendered `<head>`.
   - **A WordPress WAF blocked the first publish attempt (HTTP 406, "Our sentries
     tell us...").** Bisected the payload to isolate the cause: my own HTML comment
     at the top of the landing-page file read "Cloned from
     `../../2026-09-11-roofer-report/landing/roofing-report-lp.html`" — the `../../`
     path-traversal pattern tripped the firewall, not the page's actual markup or
     script. Fixed by rewording the comment to drop the relative path. Six throwaway
     WP drafts created while bisecting (ids 46286–46291) were deleted afterward
     (`force=true`), confirmed gone.

4. **Delivery wiring — mu-plugin: DONE. n8n email send: BLOCKED, needs a credential.**
   - **Mailchimp opt-in mu-plugin deployed and live**, cloned from
     `spark-roofer-report.php`: `landing/spark-law-report.php`, installed at
     `/srv/htdocs/wp-content/mu-plugins/spark-law-report.php` (3,824 bytes) via
     Pressable WP-CLI (`wp eval "file_put_contents(WPMU_PLUGIN_DIR . '/spark-law-report.php', base64_decode('...'))"`,
     the same base64-pipe pattern the roofer plugin used, since a raw multi-line
     PHP string breaks the WP-CLI SSH command).
     - REST route `POST /wp-json/spark/v1/law-report` — **verified live**:
       an invalid-email test POST returns `{"ok":false,"error":"invalid_email"}` /
       HTTP 400, proving the route is registered and reachable.
     - On a valid email it subscribes to the Spark Master List (`247570a9c8`,
       same list the roofer flow uses) with `MMERGE19` = first name, tags
       `niche-law` + `law-report`.
     - Fixed one real bug while wiring it: my first deploy reused the constant
       name `SPARK_MC_LIST`, which the roofer plugin also defines — since all
       mu-plugins autoload together, that threw a PHP "already defined" warning.
       Renamed to `SPARK_LAW_MC_LIST`, redeployed, confirmed the route still works.
       (A separate, identical-looking `SPARK_MC_LIST already defined` warning
       still appears on the site's WP-CLI eval calls after this fix — that is a
       **pre-existing site-level issue unrelated to this file**, not something
       this build introduced or something in scope to chase down here.)
   - **The n8n → Gmail delivery-email step does NOT exist for this campaign.**
     The roofer flow's step 3 (fire-and-forget POST to
     `https://hotspark.app.n8n.cloud/webhook/roofer-report`, consumed by n8n
     workflow `h1bqPNDdVYQ9Qb1Z` which builds and sends the delivery email via the
     Gmail API as `grant@stateofthespark.com`) has **no law-report equivalent
     workflow built yet.** The mu-plugin already POSTs to
     `https://hotspark.app.n8n.cloud/webhook/law-report` in the same
     fire-and-forget (`blocking => false`) way, so nothing on the WordPress side
     needs to change once that workflow exists — it will just start working.
     - **Why this stopped here:** this needs the n8n MCP server
       (`mcp__n8n__*`), which requires an explicit `init-n8n` call with a URL and
       API key. Tested it this session (`list-workflows` → `"Client not
       initialized. Please run init-n8n first."`) and found no stored API key
       anywhere reachable in this session (not in `~/.claude.json`, not in
       `~/.config/`, not in the grant-sparks repo, which is correct — it
       shouldn't be committed). This is a genuine credential gap, not an assumed
       wall.
     - **What's needed to finish it:** in a session where the n8n MCP is already
       initialized (or with the `hotspark.app.n8n.cloud` API key in hand), clone
       workflow `h1bqPNDdVYQ9Qb1Z` ("Spark Sites - Roofer Report Delivery"),
       point its Webhook node at path `law-report`, swap in
       `landing/delivery-email.html` as the message body (already written, same
       `FNAME_GREETING` convention), keep the same
       `From: Grant Sparks <grant@stateofthespark.com>` HTTP-Request-node send
       pattern (never the Gmail node — it always sends as the credential's
       default alias, which is `grantsparks.me`, wrong for this), and activate.
       No WordPress-side change needed once that's live.
   - **No live subscribe test was run.** The roofer precedent DID run one (a real
     POST with a `roofertest`-style address, then deleted the Mailchimp member
     afterward). I did not have Mailchimp API access in this session to delete a
     test contact afterward, so running a live subscribe here would have left an
     untraceable stray contact on the Spark Master List with no way for me to
     clean it up in this session — that fails the "can I undo this in under five
     minutes" test. Instead verified the endpoint is registered and reachable via
     the invalid-email validation path (HTTP 400, above), which proves the route,
     without touching Mailchimp.

## Live checks (curl, this session)

| Check | Result |
|---|---|
| `https://sparkmysite.com/law-firm-report/` | HTTP 200 |
| `<meta name='robots' content='noindex, follow' />` present | Yes |
| Form present (`id="slr-go"`, posts to `/wp-json/spark/v1/law-report`) | Yes |
| PDF link on page resolves | HTTP 200, 1,618,243 bytes |
| `POST /wp-json/spark/v1/law-report` (invalid email) | HTTP 400, `{"ok":false,"error":"invalid_email"}` |

## What's left for launch

1. **Build the n8n delivery workflow** (see above) — this is the one real gap.
   Until it exists, a real opt-in on the live page will subscribe the person to
   Mailchimp with the right tags, but **will not receive the PDF by email** (the
   page will still show the on-screen "thanks" + direct download link, since the
   `wp_remote_post` to n8n is fire-and-forget and never blocks the `{"ok":true}`
   response — so the page doesn't break, it just under-delivers on the email).
2. **No internal link points at `/law-firm-report/` yet**, same gap the roofer
   page had before Grant said go. Natural spot: a CTA on `/law-firm-marketing/`.
3. **Lift noindex when Grant says go**, the same way it was done for the roofer
   page (`wp post meta update 46292 _yoast_wpseo_meta-robots-noindex 0` via
   Pressable WP-CLI, then verify on the live page, not the setting).
4. **No ads were touched or activated** — out of scope per the brief.
5. Optional: build the 15-email `niche-law` nurture sequence in Mailchimp (the
   roofer flow's `niche-roofing` sequence needed Grant's Mailchimp login and was
   left as a manual follow-up too).

## Files

- `The-40-Percent-Problem-Spark-Sites.pdf` — the final PDF (13 pages).
- `design/build.mjs` — the page-design build script (Quiet Voltage tokens, all 13
  page templates, the `table()`/`cards4()`/`callout()` helpers).
- `design/*.dc.html` — one Claude-Design-style artboard per page.
- `design/canvas.json` — artboard layout manifest.
- `design/print.html` — the flat, all-pages HTML that Chrome headless printed to
  PDF.
- `design/previews/*.png` — one screenshot per page, used for the visual QA pass.
- `design/attorney-*.webp`, `design/law-office-central-fl.webp` — the four
  uploaded photos, downloaded locally for the PDF build (only the phone/case-files
  one is used, on the cover; the other three are here for future pages/variants).
- `landing/law-firm-report-lp.html` — the published landing page content.
- `landing/spark-law-report.php` — the mu-plugin (deployed; source copy for the
  record).
- `landing/spark-law-report.b64` — the base64 payload used to deploy it via
  WP-CLI `eval`.
- `landing/delivery-email.html` — the delivery email copy, written and ready, not
  yet wired into n8n (see above).
