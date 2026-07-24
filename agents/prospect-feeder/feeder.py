#!/usr/bin/env python3
"""
Prospect Feeder — recurring lead-gen for the AI Prospect Sourcer (E-8).

Weekly, scrapes a ROTATING Polk County business category from Google Maps
(via Apify), keeps only ESTABLISHED businesses that have NO website (the
Demo Drop buy signal), and APPENDS the new ones to the "Established Leads
Feed" sheet that the Prospect Sourcer reads. Dedupes against what's already
in the feed by (name + address).

This is the recurring version of the one-time seed done 2026-07-23.
Feeds: reference — decisions/2026-07-23-marketing-linchpin-ai-employees.md

Env:
  APIFY_TOKEN                 — Apify API token
  GOOGLE_SERVICE_ACCOUNT_JSON — service account with Editor on the feed sheet
"""
import os, sys, json, time
import urllib.request

FEED_SHEET_ID = "1421BpU9_Ygkl9YONPou96snn3j51ieHM-3QMpJ69h1M"
FEED_TAB = "Leads"
HEADERS = ["Business Name", "Category", "Address", "City", "Phone",
           "Google Rating", "Review Count", "Website", "Source", "First Seen"]

# Rotating Polk County target categories (P1-P6 in target-profiles.md).
# One per weekly run keeps cost low and coverage broad over time.
SEARCHES = [
    "HVAC contractor Lakeland FL",
    "plumber Lakeland FL",
    "roofing contractor Lakeland FL",
    "auto repair Lakeland FL",
    "chiropractor Lakeland FL",
    "landscaping Lakeland FL",
    "pest control Lakeland FL",
    "electrician Lakeland FL",
    "dentist Winter Haven FL",
    "auto body shop Lakeland FL",
]
MAX_PLACES = 25          # per search, hard cap (cost control)
APIFY_ACTOR = "compass~crawler-google-places"

# National chains / franchises to drop (not our ICP).
CHAINS = ["midas", "aspen dental", "mavis", "firestone", "tire choice",
          "napa", "coast dental", "sage dental", "jiffy lube", "meineke",
          "valvoline", "pep boys", "aamco", "roto-rooter", "sears"]


def pick_search():
    """Rotate by ISO week so each run covers a different category."""
    from datetime import datetime, timezone
    wk = datetime.now(timezone.utc).isocalendar()[1]
    return SEARCHES[wk % len(SEARCHES)]


def run_apify(search):
    token = os.environ["APIFY_TOKEN"]
    url = (f"https://api.apify.com/v2/acts/{APIFY_ACTOR}"
           f"/run-sync-get-dataset-items?token={token}")
    body = json.dumps({
        "searchStringsArray": [search],
        "maxCrawledPlacesPerSearch": MAX_PLACES,
        "language": "en",
        "skipClosedPlaces": True,
    }).encode()
    req = urllib.request.Request(url, data=body,
                                 headers={"Content-Type": "application/json"})
    print(f"  Apify: scraping '{search}' (max {MAX_PLACES})...")
    with urllib.request.urlopen(req, timeout=600) as r:
        return json.loads(r.read().decode())


def is_no_website(place):
    """No owned site = the buy signal. Treat Google-redirect placeholders and
    Facebook-only listings as 'no site'."""
    w = (place.get("website") or "").lower().strip()
    if not w:
        return True
    if "facebook.com" in w or "business.google.com" in w or "google.com/url" in w:
        return True
    return False


def to_row(place, today):
    return [
        place.get("title", ""),
        place.get("categoryName", ""),
        place.get("address", "") or place.get("street", ""),
        place.get("city", ""),
        place.get("phone", ""),
        str(place.get("totalScore", "") or ""),
        str(place.get("reviewsCount", "") or ""),
        "",                      # Website (none)
        "GoogleMaps/Apify",
        today,
    ]


def main():
    for k in ("APIFY_TOKEN", "GOOGLE_SERVICE_ACCOUNT_JSON"):
        if not os.environ.get(k):
            print(f"ERROR: {k} not set"); sys.exit(1)

    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).strftime("%m/%d/%Y")

    search = pick_search()
    places = run_apify(search)
    print(f"  Apify returned {len(places)} places")

    # Filter: no website, real (has reviews), not a chain
    kept = []
    for p in places:
        name = (p.get("title") or "").lower()
        if not is_no_website(p):
            continue
        if any(c in name for c in CHAINS):
            continue
        if (p.get("reviewsCount") or 0) < 3:   # skip empty/unclaimed listings
            continue
        kept.append(p)
    print(f"  Kept {len(kept)} established no-website candidates")

    import gspread
    from google.oauth2.service_account import Credentials
    creds = Credentials.from_service_account_info(
        json.loads(os.environ["GOOGLE_SERVICE_ACCOUNT_JSON"]),
        scopes=["https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive"])
    ss = gspread.authorize(creds).open_by_key(FEED_SHEET_ID)
    try:
        ws = ss.worksheet(FEED_TAB)
    except gspread.WorksheetNotFound:
        ws = ss.add_worksheet(FEED_TAB, rows=1000, cols=len(HEADERS))
        ws.append_row(HEADERS)

    existing = ws.get_all_values()
    have = set()
    if len(existing) > 1:
        for row in existing[1:]:
            if row and row[0]:
                addr = row[2] if len(row) > 2 else ""
                have.add((row[0].strip().lower(), addr.strip().lower()))

    new_rows = []
    for p in kept:
        key = ((p.get("title") or "").strip().lower(),
               (p.get("address") or p.get("street") or "").strip().lower())
        if key in have:
            continue
        have.add(key)
        new_rows.append(to_row(p, today))

    if new_rows:
        ws.append_rows(new_rows, value_input_option="RAW")
    print(f"  Appended {len(new_rows)} NEW leads to the feed "
          f"(search '{search}', {today})")

    with open(os.environ.get("GITHUB_STEP_SUMMARY", os.devnull), "a") as f:
        f.write(f"## Prospect Feeder\n- Search: **{search}**\n"
                f"- Scraped: {len(places)} · kept: {len(kept)} · "
                f"**new appended: {len(new_rows)}**\n")


if __name__ == "__main__":
    main()
