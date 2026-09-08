# Polk County Roofing Leads — 2026-09-08

Built for Grant + Judah to call. Deliverable is one row per roofing company operating in Polk
County, FL, sourced from Google Maps, Florida DBPR licensee records, and (for the top 60 by
Google review count) Sunbiz + Facebook enrichment.

**Google Sheet:** https://docs.google.com/spreadsheets/d/1KYIxsxN9jBJ-9VDAcS5XPJO4NPC3xiRJ8LDdcvdNvLY
(Spark Sites Shared Drive → `02 - S - Sales` → `02.01 - Lead`)

**Final CSV:** `polk-roofing-leads.csv` (334 rows, this folder)

## Counts per source

| Source | Count |
|---|---|
| Google Maps (compass/crawler-google-places via Apify, "roofing contractor" / "roofing company" / "roof repair" across all 20 Polk cities) | 193 raw listings → 188 unique after de-dupe → 125 Maps-only in final list |
| Florida DBPR licensee file (CCC = Certified Roofing Contractor, RC = Registered Roofing Contractor), filtered to Polk County cities, active + inactive | 224 raw license records → 209 unique companies (grouping multiple qualifiers under one DBA) → 146 DBPR-only in final list |
| Matched in both Maps + DBPR | 63 |
| Sunbiz (attempted for the top 60 companies by Google review count, per scope) | 62 got a status opinion (44 confirmed ACTIVE/INACTIVE/DISSOLVED, 18 came back "not found" after the 2-try budget — sunbiz.org blocks direct page fetch, so lookups relied on cached search snippets) |
| Facebook page (same top-60 set) | 55 confirmed pages found |
| **Total unique companies in final list** | **334** |

## Enrichment coverage (all 334 rows)

- Phone: 181 / 334
- Website: 144 / 334
- Facebook page: 55 / 334 (only attempted for the top 60 by reviews — see Scope below)
- Likely main contact name: 235 / 334 (209 from DBPR qualifier records, 26 from Sunbiz officer lookups)
- DBPR license number on file: 209 / 334
- Sunbiz status recorded: 62 / 334 (scope-limited, see below)

## Scope and what was NOT attempted

- **Sunbiz + Facebook were run for the top 60 companies by Google review count only**, per the
  brief's own scope reduction ("Sunbiz for each company, or at least top 60 by review count").
  The remaining 274 companies (mostly the long tail of Maps listings with few/no reviews, plus
  all 146 DBPR-only records that never showed up on Google Maps) do not have a Sunbiz status or
  Facebook page filled in. Their "Contact source" is DBPR qualifier where a DBPR match exists,
  otherwise "unknown."
- **sunbiz.org blocks direct page fetches** (HTTP 403 to automated fetches). The enrichment
  agents worked around this using Google-cached search snippets, which reliably surfaced entity
  names and officers but not always a clean ACTIVE/INACTIVE status — hence 18 of the top-60
  show "not found" for Sunbiz status despite the entity existing.
- A few companies in the top 60 turned out to be large multi-branch/franchise operations
  (Boral Roofing Lake Wales — a manufacturing plant, not a contractor; Quick Roofing —
  30+ location franchise; Collis Roofing, Eustis Roofing, West Orange Roofing, Springer
  Peterson — HQ'd or acquired outside Polk) where the Sunbiz address on file is a corporate
  HQ/registered-agent address rather than the local Polk branch. These are flagged in the
  Notes column rather than dropped, since the local branch is still a legitimate call target.
- A handful of entities show a Sunbiz status of INACTIVE/DISSOLVED while still clearly
  operating per their website/Facebook/reviews (Ring Roofing, Musick Roofing, Green Alliance
  USA) — flagged in Notes for manual verification before outreach (could be a lapsed annual
  report, or operating under a successor/renamed entity).
- Small unincorporated Polk communities named in the brief (Highland City, Loughman, Bradley
  Junction, Lake Hamilton, Bradley) returned no distinct Google Maps or DBPR listings under
  those exact city names — likely because businesses there register under the nearest larger
  city (Lakeland, Winter Haven, Davenport) for mailing purposes. Not a gap, just how USPS/DBPR
  addressing works in these areas.
- 2 companies ("High Tower Roofing" x3, "True Roofers" x2) appear as multiple rows because they
  operate multiple distinct branch locations within Polk County (different address + different
  phone number each) — flagged in Notes rather than merged, since each branch is independently
  callable.

## Methodology notes

- Google Maps pull used `compass/crawler-google-places` via Apify with `county: "Polk County"`,
  `state: "Florida"` — one run covering the whole county rather than 20 separate per-city
  searches, then filtered to results whose `city` matched one of the 20 named Polk cities and
  whose category/title contained "roof" (this removed ~250 unrelated results like car
  dealerships, hardware stores, and general contractors picked up by the broader "roof repair"
  search term).
- DBPR data came from the official bulk download at
  `https://www2.myfloridalicense.com/sto/file_download/extracts/CONSTRUCTIONLICENSE_1.csv`
  (258K statewide records), filtered to license types CCC (Certified Roofing Contractor) and RC
  (Registered Roofing Contractor) with a Polk city match.
- Maps ↔ DBPR matching used token-based name matching (stripping LLC/Inc/Roofing/Construction/
  county-name filler words, requiring meaningful token overlap) rather than plain string
  similarity, after an initial pass produced several false-positive matches (e.g. two unrelated
  "___ Roofing" companies matching purely because they shared the word "Roofing"). A small
  number of matches were manually corrected or force-paired after review.
- Sunbiz + Facebook enrichment for the top 60 was done via 3 parallel research passes
  (WebSearch + WebFetch), each covering 20 companies, with a 2-lookup budget per company per
  source to keep the pass finishable.

## Column reference

`Company | Likely main contact (name) | Contact source | Phone | Website | Facebook page | Address | City | Zip | Google rating | Google reviews | DBPR license # | DBPR status | Sunbiz status | Sources found in | Notes`

Contact source priority: DBPR qualifier (the individual legally licensed on that roofing
license — the most reliable "who to ask for") beats Sunbiz officer/registered agent beats
"unknown."
