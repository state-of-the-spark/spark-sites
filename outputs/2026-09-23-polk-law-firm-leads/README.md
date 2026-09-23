# Polk County Law Firm Leads — 2026-09-23

Built for Spark Sites cold-call outreach. Deliverable is one row per law firm location
operating in 7 Polk-area FL cities, sourced from Google Maps via Apify. Mirrors the method
used for `outputs/2026-09-08-polk-roofing-leads/`, adapted to law firms per the exact brief.

**Google Sheet:** https://docs.google.com/spreadsheets/d/1k-2t6B3OtYx3WKKBkwDrbmsjGGevEgFcfbMcW6avfZs
(Spark Sites Shared Drive → `02 - S - Sales` → `02.01 - Lead` — same folder as the roofing leads sheet)

**Final CSV:** `polk-law-firm-leads.csv` (332 rows, this folder)

## Cities searched (7)

Lakeland, Bartow, Plant City, Winter Haven, Auburndale, Haines City, Lake Wales — all Polk
County, FL (Lake Wales and part of Haines City sit in Polk's southern reaches but are
standard Polk cities).

**Haines City assumption:** the original brief said "Payne City," which is not a real Polk
County city. Treated this as a mishearing/typo for **Haines City** (a real, well-known Polk
city) and searched that instead. Flagging explicitly per instructions — if "Payne City" meant
something else, this run does not cover it.

## Counts per city (pipeline funnel)

| City | Raw Maps listings | After legal-category filter | After city-match filter | Final (deduped) |
|---|---|---|---|---|
| Lakeland | 174 | 155 | 151 | 151 |
| Bartow | 53 | 47 | 47 | 46 |
| Plant City | 30 | 28 | 28 | 28 |
| Winter Haven | 85 | 63 | 63 | 63 |
| Auburndale | 18 | 3 | 3 | 3 |
| Haines City | 34 | 18 | 17 | 17 |
| Lake Wales | 42 | 24 | 24 | 24 |
| **Total** | **436** | **338** | **333** | **332** |

"After legal-category filter" and "after city-match filter" are counted by which city's own
Apify search run produced the raw listing. "After city-match filter" and "final" are counted
by the listing's actual Google-assigned city (a firm found via one city's search sometimes
turns out to be physically located in a neighboring city — 5 such listings moved city buckets
between the legal-filter and city-match stages: e.g. one Bartow-search hit is dropped as a
Bartow row and one exact duplicate is removed at dedupe). 1 exact duplicate (same normalized
name + phone, picked up by two overlapping city searches) was removed at the dedupe stage. 4
listings had no city/address at all (incomplete Google Maps records) and 3 were in Davenport
(outside the 7 target cities) — both dropped at the city-match stage.

**Auburndale is thin (3 firms) by design, not by error** — it is a small town with a genuinely
small local legal market; the Apify run for Auburndale plateaued after finding only 18 raw
listings total across all 3 search terms, most of which were non-legal businesses.

## The 7 Apify actor run IDs (`compass/crawler-google-places`)

| City | Run ID | Dataset ID |
|---|---|---|
| Lakeland | `VVLThJxsHb13fowrb` | `YF0A8zv2UI5eZQ9xX` |
| Bartow | `FXuJcVBrTgOXyhbhr` | `ZnTW6ACNsVCOupFjN` |
| Plant City | `x7by3wwi7tF6kWD6s` | `pKaH2apOfGF8LDhhW` |
| Winter Haven | `iKfsE4B67JhxQuHE6` | `j3uhaUmVPjpOeDpn6` |
| Auburndale | `0gxGcQ002LmwjhO8v` | `Lnhvtl8pibtDzXWTr` |
| Haines City | `MsF3gKebG64lFhMSX` | `aHuuzAufRvKKK6yDB` |
| Lake Wales | `NuE18AZfujLhkV1t0` | `Vef59X5rslbElwsT9` |

Each run used search terms `"law firm <City> FL"`, `"attorney <City> FL"`, `"lawyer <City> FL"`,
`locationQuery: "<City>, FL"`, `maxCrawledPlacesPerSearch: 70`, `language: en`,
`skipClosedPlaces: true`.

## Legal-category filter — what was kept / dropped

**Kept** (categoryName): Attorney, Personal injury attorney, Law firm, Legal services, Family
law attorney, Criminal justice attorney, Estate planning attorney, Immigration attorney,
Bankruptcy attorney, Real estate attorney, Divorce lawyer, Elder law attorney, Tax attorney,
Insurance attorney, General practice attorney, Social security attorney, Civil law attorney,
Business attorney, Administrative attorney, Patent attorney.

**Explicitly excluded per brief** even when adjacent to legal: courts, clerk of court /
government law-enforcement / public-defender offices, notaries, bail bonds, process servers,
paralegal/document-prep services, title companies, court reporters — unless the listing is
clearly a law firm.

**4 manual name-based overrides**, verified by reading each listing's secondary `categories[]`
array and business name (not just the primary Google category):
- **Kept despite non-legal primary category:** *Weller Legal Group Lakeland* (Google's primary
  category was "Bankruptcy service," secondary category is "Bankruptcy attorney"); *Menlo Park
  Patents* (primary "Patent office," secondary "Patent attorney" — an IP law firm); *Abogados
  de Accidentes ProLegal* (primary "Lawyers association," but the name is Spanish for "Accident
  Lawyers" — a personal injury firm); *The Guard Law Group, PLLC* (primary "Association /
  Organization," but the name is unambiguously a law firm).
- **Excluded despite a legal-sounding primary category:** *L&R Paralegal Services LLC.*
  (primary category was "Legal services," but the name and secondary category "Attorney
  referral service" show it's a paralegal/referral shop, not a law firm); *DOCUMENT PREPS INC*
  (primary category "Legal services," but the name is a document-prep business).
- **Kept and flagged:** *Patriot Title Law* (Auburndale) — categorized as a title company but
  its secondary categories include "Real estate attorney," a common FL model where a law firm
  also runs the title/closing side. Kept and noted in its row.

## Dedupe method

One row per firm **location**. Normalized name (lowercase; stripped punctuation and filler
phrases: "law offices/office of," "attorneys/attorney at law," "& associates," and suffix
tokens LLC/LLP/PA/PLLC/PLC/Inc/PC/"the"/"law"/"firm"/"group"/"legal") + normalized phone (last
10 digits, or normalized address when phone was blank) formed the dedupe key. A firm with
multiple distinct physical Polk County locations (different address AND phone) was kept as
separate rows and flagged in Notes as "Multi-branch: N Polk County locations for this firm" —
13 such firms (e.g. Morgan & Morgan, Burnetti P.A., Howell & Thornhill, Abrahamson & Uiterwyk,
McKinley Law Firm, The Law Firm of Gil Colón Jr., Moody Law, Musca Law, Sutton Law Firm,
Peterson & Myers PA, Lilly & Brown LLP, Maranatha Law, Matthew Kaylor). Only 1 exact duplicate
(same normalized name + phone from two overlapping city searches) was collapsed to a single row.

## Practice-area inference — cheap and approximate, NOT verified per-website

Per the brief's scope, practice areas were derived **only** from the Google Maps
category/type and the firm's own title/name — no website was fetched or read for any of the
332 firms. Where Google's primary category was already specific (e.g. "Personal injury
attorney"), that mapped directly. Where the category was generic ("Attorney," "Law firm,"
"Legal services") or the firm carries multiple specialty tags, keyword matching against the
firm name and Google's secondary `categories[]` array filled in the rest; a firm can carry
several practice-area labels. Firms with no signal either way are labeled "General/Unspecified."

A **"Practice area buckets" column** maps every label onto the 8-bucket set specified in the
brief (Family/Divorce, Criminal/DUI, Personal Injury, Estate/Probate, Immigration, Real
Estate, Business, General). The brief's 8 buckets don't have a natural home for Bankruptcy,
Tax, Patent/IP, or Administrative Law — these were mapped to **Business** as the closest fit.
Social Security Disability, Civil Litigation, and General Practice were mapped to **General**.
Insurance and Workers' Comp practice areas were mapped to **Personal Injury** (the most common
overlap in Florida practice). These mappings are assumptions, not verified against each firm's
actual scope of practice — flagged here per the brief's caveat requirement.

**"Attorneys (if listed)" column was omitted entirely** (rather than added empty) — Google
Maps data for these firms did not cheaply expose named individual attorneys as a separate
field; where a firm's own title happens to be a person's name (e.g. "Alison Leffew, Attorney
at Law"), that name is visible in the Firm name column itself.

## Column reference

`City | Firm name | Practice areas | Practice area buckets | Address | Phone | Website |
Google rating | Review count | Google Maps URL | Has website (Y/N) | Notes`

## Google Sheet structure

Title: **"Polk Law Firm Leads 2026-09-23"**. 8 tabs: one per city (Lakeland, Bartow, Plant
City, Winter Haven, Auburndale, Haines City, Lake Wales) plus an **All** tab. Every tab has a
bolded header row. The **All** tab is built with a live `ARRAYFORMULA` stacking the 7 city
tabs (so it always mirrors them exactly) rather than a second static copy of the data.

**Caveat — header row NOT frozen:** the Google Workspace MCP tools available in this session
expose cell formatting (bold, color, borders, number format) but do not expose a
"freeze rows" API call. Bold headers were applied to all 8 tabs; freezing row 1 needs to be
done manually in Sheets (View → Freeze → 1 row) or via a tool this session didn't have access
to. Flagging rather than silently skipping.

## Scope limitations

- Practice areas are inferred cheaply from Google Maps category + firm name only, not verified
  against each firm's actual website or bar-listed practice areas.
- No websites were fetched for any of the 332 firms (per brief scope — Maps data only).
- Ratings/review counts are a point-in-time snapshot from the 2026-09-23 Apify pull.
- Auburndale's result set is genuinely thin (3 firms) — not a filtering error, see counts
  table above.
- A handful of firms whose Google category conflicts with their apparent business model
  (e.g. Patriot Title Law) were judgment calls, documented in their row's Notes and in the
  override list above.
