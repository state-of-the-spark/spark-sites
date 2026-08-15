# Contractor Marketing Program — Spark Sites (Quiet Voltage)

Live: https://sparkmysite.com/contractor-marketing-program/ (WP page id 45619, Divi child theme, blank template).
Built 2026-08-15 from Claude Design handoff `design_handoff_contractor_program` (high-fidelity port).

## Source
- `contractor-marketing-program.html` — the self-contained scoped (`#sscp`) page block, injected into the WP page `content`.
- `deploy.py` — minify (defeat wpautop) + REST publish helper (SSL-trust issues on bundled Python; the live deploys used curl with the minify step).

## Deploy technique (Divi fights custom HTML)
- Scoped CSS under `#sscp` + `!important` to beat Divi.
- Full-width fix: Divi renders a sidebar layout even on the blank template; override `#left-area{width:100%;float:none}`, `#content-area`, and `#main-content .container{max-width:100%}`.
- Defeat `wpautop`: strip inter-tag whitespace + newlines before POST.
- Defeat `wptexturize` (turns " - " and ">- " into en-dashes): replace with `&#45;` so hyphens stay literal (Grant's no-em/en-dash rule).
- Hero image + both logos uploaded to WP media (2026/08). Header = black-text logo (45705), footer = white-text logo (45706), hero = contractor-hero-jobsite.webp (45698).

## Links wired
- "Get started now" (x5) → https://sparkmysite.com/product/spark-care-growth/ (Spark Care – Growth, $297/mo, id 45617) — CONFIRM this is the intended package; product to be updated.
- "Request a consult" (hero + final CTA) → Google Calendar appointment schedule.
- Phone number removed sitewide per Grant.

## Open / placeholders (Grant's call)
- Price $297/mo, testimonials, audit-banner photo = intentional placeholders, left as-is per Grant.
- noindex is ON (Yoast `_yoast_wpseo_meta-robots-noindex=1`) "for a moment" — remove when ready to index.
- Preview page id 45699 (/contractor-program-preview/) can be trashed.
