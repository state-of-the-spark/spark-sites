# Direct Mail Deep Dive — Spark Sites (Polk County)

**Date:** 2026-02-27
**Purpose:** Supplemental research for Spark Sites direct mail campaign targeting Polk County businesses
**Status:** Research complete, ready for Grant review

---

## 1. MCP Servers and API Access for Business Data

### Apify Actors (Available Now)

**Florida Sunbiz Scraper (agenscrape/florida-sunbiz-scraper)**
- Extracts comprehensive business data from Florida's official SunBiz database (search.sunbiz.org)
- Real-time data extraction — always current as of the moment you run it
- Exports to JSON, CSV, Excel, or XML
- Can schedule runs daily, weekly, monthly, or custom intervals
- Includes inactive/dissolved businesses (filterable by status field)
- **Pricing:** From $10.00 per 1,000 results
- **URL:** https://apify.com/agenscrape/florida-sunbiz-scraper

**Florida Biz Scraper (explorer_holdings/florida-biz-scraper) — HAS MCP SERVER**
- Scrapes businesses by filing date directly from Sunbiz
- Gets new business leads 24 hours after incorporation
- Filters for fresh leads without Tax IDs (FEIN)
- Extracts verified mailing addresses for direct mail
- **Pricing:** From $25.00 per 1,000 results
- **MCP Server URL:** mcp.apify.com?tools=explorer_holdings/florida-biz-scraper
- **URL:** https://apify.com/explorer_holdings/florida-biz-scraper

**Google Maps Scraper (compass/crawler-google-places)**
- Extracts business name, address, phone, website, email, ratings, hours, social media links
- Can target specific locations (e.g., "businesses in Lakeland, FL" or "businesses in Polk County, FL")
- Export to JSON/CSV
- Good for building Database A (all existing businesses)
- **URL:** https://apify.com/compass/crawler-google-places

**Dun & Bradstreet Business Directory Scraper (mscraper/dun-bradstreet-business-directory-scraper)**
- Extracts company name, sales revenue, address, URL from D&B directory
- **URL:** https://apify.com/mscraper/dun-bradstreet-business-directory-scraper

**SBA.GOV Scraper (fatihtahta/sba-gov-scraper)**
- Scrapes 450k+ verified US small business listings from SBA Dynamic Small Business Search
- Company profiles, certifications, locations, contact info
- $5 per 1,000 results
- **URL:** https://apify.com/fatihtahta/sba-gov-scraper

### Sunbiz Official Data Downloads (FREE)

**Source:** https://dos.fl.gov/sunbiz/other-services/data-downloads/

Florida's Division of Corporations provides FREE bulk data downloads:

- **Daily Data:** Generated on business days, contains that day's new filings
  - URL: https://dos.fl.gov/sunbiz/other-services/data-downloads/daily-data/
- **Quarterly Data:** Generated in January, April, July, October — contains ALL active entities
  - URL: https://dos.fl.gov/sunbiz/other-services/data-downloads/quarterly-data/
- **Format:** Fixed-length ASCII text files
- **Access:** Public credentials — Username: `Public`, Password: `PubAccess1845!`
- **File types:** Corporate data (2 files), Fictitious Names (2 files), General Partnerships (2 files), Marks (1 file)
- **Corporate file fields:** Include principal address (street address required), mailing address (optional), city, state, zip
- **File definitions:** https://dos.fl.gov/sunbiz/other-services/data-downloads/corporate-data-file/

**Key limitation:** Files contain ALL Florida entities. You must filter by address/city/zip to isolate Polk County businesses. There is no county field — you filter by city names or zip codes within Polk County.

### Other MCP/API Options

No dedicated MCP servers exist for county-level business license data, Polk County Tax Collector data, or chamber directories. The Apify MCP ecosystem is the closest option for automated access.

---

## 2. TWO Database Strategy

### Database A — All Existing Businesses in Polk County

**Estimated total:** ~17,000-20,000 active business establishments in Polk County (based on Census Bureau County Business Patterns and Florida economic development data). The EDR area profile for Polk County references this range.

**Best sources for bulk data (ranked by quality/cost):**

| Source | Data Quality | Cost | Refresh Frequency | Notes |
|--------|-------------|------|-------------------|-------|
| Sunbiz Quarterly Download | High (official state data) | FREE | Quarterly (Jan/Apr/Jul/Oct) | Must filter by Polk County zip codes. No phone/email. |
| Google Maps Scraper (Apify) | High (includes phone, website, email, ratings) | ~$5-15 per 1,000 | On-demand | Best for contact info enrichment. Run by business category. |
| Data Axle USA | Very High (verified, enriched) | $129-259/mo (business plans) | Continuous | Most complete but most expensive. Industry codes, revenue, employee count. |
| Polk County Tax Collector | High (official local data) | FREE to search | Annual (renewal Sept 30) | Online search at polktaxes.com but no bulk export. Would need to scrape. |
| D&B / Hoovers | Very High | Enterprise pricing ($3,200-150K/yr) | Continuous | Overkill for this use case. |

**Recommended approach for Database A:**
1. Download Sunbiz quarterly data (FREE) — filter to Polk County zip codes for the master list of all registered entities
2. Enrich with Google Maps Scraper (Apify) — run category-by-category for Polk County to get phone numbers, websites, emails
3. Cross-reference with Polk County Tax Collector search (polktaxes.com/services/search-and-pay-local-business-taxes/) for active local business tax status
4. Optional: Purchase a targeted list from Data Axle USA for a one-time enrichment ($129/mo plan gets you access)

**Polk County Zip Codes to Filter:**
33801, 33802, 33803, 33805, 33806, 33807, 33809, 33810, 33811, 33812, 33813, 33815, 33823, 33827, 33830, 33831, 33834, 33837, 33838, 33839, 33841, 33843, 33844, 33849, 33850, 33853, 33854, 33855, 33856, 33858, 33859, 33860, 33863, 33867, 33868, 33877, 33880, 33881, 33882, 33883, 33884, 33885

**How often to refresh:** Quarterly (aligned with Sunbiz quarterly releases)

### Database B — New Business Registrations (Ongoing Feed)

**Best sources for new registration feeds:**

| Source | Lag Time | Frequency | Cost | Notes |
|--------|----------|-----------|------|-------|
| Sunbiz Daily Data Download | 1 business day | Daily (business days) | FREE | Must filter by Polk County. New filings only. |
| Florida Biz Scraper (Apify) | ~24 hours | On-demand / scheduled | $25 per 1,000 | Built for this exact use case. MCP server available. Includes mailing addresses. |
| Sunbiz Scraper (Apify - agenscrape) | Real-time | Scheduled (daily/weekly) | $10 per 1,000 | Can filter by filing date. |

**Recommended approach for Database B:**
1. **Primary:** Set up a scheduled Apify actor (florida-biz-scraper) to run daily, scraping new filings
2. **Backup/verification:** Download Sunbiz daily data files and cross-reference
3. **Enrichment:** Run new entries through Google Maps scraper after 2-4 weeks (gives time for the business to set up their Google listing)
4. **Pipeline:** New registration -> wait 7-14 days -> mail direct mail piece -> follow up at 30 days

**Catching them in the first 30 days:**
- Sunbiz daily data + Apify scheduled scraper gives you coverage within 24-48 hours of filing
- Build an automation: Apify scrape (daily) -> filter Polk County -> add to CRM/list -> trigger mail within 7-14 days
- The 7-14 day delay is intentional: gives the owner time to set up their physical address and be receptive to mail

---

## 3. Local Organization Data Sources

### Lakeland Economic Development Council (LEDC)

- **Website:** https://lakelandedc.com/
- **Members page:** https://lakelandedc.com/members/
- **Membership directory:** https://lakelandedc.com/membership-directory/
- **Size:** ~135+ member companies
- **Directory status:** The directory page exists but may show "No results found" publicly. May require membership or direct contact.
- **Focus:** Economic development, larger employers (members are responsible for 43,000 jobs, $49M in annual taxes)
- **Value for direct mail:** Low — these are large employers, not the small businesses that need website services. Better for networking/referral partnerships.
- **Contact:** 502 E. Main St, Lakeland, FL 33801

### Lakeland Chamber of Commerce

- **Website:** https://www.lakelandchamber.com/
- **Member directory:** https://web.lakelandchamber.com/search (OLD) or https://business.lakelandchamber.com/list (CURRENT)
- **Directory is PUBLIC and searchable** — browse by category, search by name
- **Address:** 35 Lake Morton Dr, Lakeland, FL 33801-5342
- **Value for direct mail:** MEDIUM-HIGH — Chamber members are active small businesses. The directory is scrapable.
- **New member announcements:** Chambers typically announce new members in newsletters and at events. Worth subscribing to their email list.

### Central Florida Development Council (CFDC)

- **Website:** https://www.cfdc.org/
- **Role:** Designated by Polk County Commissioners as the primary economic development organization for Polk County
- **Data & Research page:** https://www.cfdc.org/resources/data-research/ — publishes demographic and market data for Polk County
- **Focus:** Business recruitment, retention, and expansion (high-skill, high-wage sustainable businesses)
- **Value for direct mail:** LOW for list building, HIGH for market data. The CFDC's data research section has demographic info, target sectors, and top employer data that can inform campaign targeting.

### Winter Haven Chamber of Commerce

- **Website:** https://www.winterhavenchamber.com/
- **Resource directory:** https://www.mywinterhaven.com/BusinessDirectoryII.aspx
- **Value:** MEDIUM — Winter Haven is the second largest city in Polk County

### Bartow Chamber of Commerce

- **Website:** www.bartowchamber.com
- **Member listings available through their website**
- **Address:** 510 N Broadway Ave, Bartow, FL 33830-3918

### Northeast Polk Chamber of Commerce

- **Website:** https://www.northeastpolkchamber.com/
- **Publishes a downloadable directory** (2025 Directory available for download)
- **Covers:** Davenport, Haines City, Lake Hamilton, Dundee areas

### Other Local Sources

**Polk County Tax Collector — Business Tax Search**
- **URL:** https://www.polktaxes.com/services/search-and-pay-local-business-taxes/
- **Searchable online** — can search by business name, address, or account number
- **No bulk export** — would need to scrape or manually search
- **Renewal deadline:** September 30 annually — the list is most complete in October after renewals

**Polk County Property Appraiser**
- **URL:** https://www.polkpa.org/ (migrating to polkflpa.gov)
- **Property search:** https://www.polkpa.org/CamaSearch.aspx
- **Can search by land use classification** — filter for commercial properties
- **GIS mapping tool** available for parcel boundaries and land use
- **Value:** Can identify commercial property owners who may need websites
- **Phone:** (863) 534-4777

**City of Lakeland Business Tax Office**
- **URL:** https://www.lakelandgov.net/departments/community-economic-development/economic-development/business-tax/
- **Separate from county business tax** — businesses in Lakeland city limits need BOTH

**Local Media / Publications**
- **The Ledger (Lakeland Ledger):** Daily newspaper covering Polk County business news. Social: @theledger (X), @ledgernews (Instagram). Not a data source, but monitors new business openings.
- **LkldNow (lkldnow.com):** Lakeland-focused news site
- **LALtoday (laltoday.6amcity.com):** Tracks new and coming-soon businesses in Lakeland — publishes a running list at laltoday.6amcity.com/new-to-lakeland/new-businesses-lakeland-fl
- **Polk-County.com:** Community business directory at polk-county.com/business_directory/

---

## 4. A/B/C Test Print Run

### Direct Mail Services That Support Split Testing

| Service | Split Test Support | Min Quantity | Tracking | Notes |
|---------|-------------------|-------------|----------|-------|
| **PostcardMania** | Yes (native) | Low (~100-200) | Mail tracking, call tracking, URL tracking | Recommended for this test. Use 2 phone numbers + 3 URLs. |
| **Postalytics** | Yes (Smart Sends, Flows) | No minimum | pURLs, QR tracking, conversion tracking | API-driven. Best for automation. |
| **Taradel** | Yes (via EDDM routes) | 200 per route (EDDM) | Basic | EDDM only, harder to do targeted split tests |
| **VistaPrint** | Manual (order 3 designs separately) | 25 postcards | None built-in | Budget option but no built-in tracking |
| **Lob** | Yes (API-driven variable data) | 1 piece | URL/QR tracking | Developer-focused. Best for programmatic tests. |
| **Click2Mail** | Manual | Low | Basic | Budget, no native split test |

### How to Structure the A/B/C Test

**The 3 hooks:**
- **Hook A:** "Get Your Starter Website FREE"
- **Hook B:** "Free Marketing Consultation"
- **Hook C:** "Websites Starting at $500"

**Equal splits:** 100 pieces per variant (300 total)

**Tracking per variant:**
| Element | Hook A | Hook B | Hook C |
|---------|--------|--------|--------|
| Landing URL | sparkmysite.com/free | sparkmysite.com/consult | sparkmysite.com/start |
| QR Code | Unique QR -> /free?utm_source=dm&utm_medium=postcard&utm_campaign=test1&utm_content=hookA | Unique QR -> /consult?utm_... | Unique QR -> /start?utm_... |
| Promo Code | SPARK-FREE | SPARK-CONSULT | SPARK-500 |
| Phone (optional) | Same number or use call tracking | Same | Same |

**Randomization:** Shuffle the mailing list before splitting into 3 equal groups. If using a targeted list, ensure each group has similar geographic/demographic distribution.

### Statistical Significance at 100 Per Variant

**The hard truth:** 100 pieces per variant is NOT statistically significant for most direct mail campaigns.

- Direct mail response rates typically range from 1-5% for targeted lists
- At 2% response rate, 100 pieces yields ~2 responses per variant
- You cannot draw statistically reliable conclusions from 2 vs 3 responses
- Industry standard minimum for reliable A/B testing: **1,000-5,000 per variant**
- Minimum for even directional signal: **500 per variant**

**However, 300 total is a smart PILOT test.** Here is why it still works:

1. **You are not optimizing — you are learning.** The goal is to see IF anyone responds at all, and which hook generates the most interest (even qualitatively).
2. **Low financial risk.** At ~$0.75-1.25/piece all-in, 300 pieces = $225-$375 total investment.
3. **You get real feedback:** phone calls, website visits, QR scans. Even 1-2 responses tell you something.
4. **Scale what works:** If Hook A gets 5 responses and Hook C gets 0, that is a strong enough signal to scale Hook A to 1,000+ pieces.

**Recommendation:** Run the 300-piece pilot. Track everything. Then scale the winning hook to 1,000-2,000 pieces for a statistically meaningful second round.

### Cost Estimate for 300-Piece 3-Way Split

| Line Item | Budget Estimate | Premium Estimate | Notes |
|-----------|----------------|-----------------|-------|
| Postcard design (3 variants) | $0 (DIY/Canva) | $300-600 (designer) | Grant can likely design in-house |
| Printing (300 pcs, 6x9 or 6x11) | $30-60 ($0.10-0.20/pc) | $90-150 ($0.30-0.50/pc) | Thick stock costs more |
| Postage (First Class) | $165 ($0.55/pc) | $165 ($0.55/pc) | First Class recommended for small targeted run |
| Postage (EDDM alternative) | $78 ($0.26/pc) | $78 ($0.26/pc) | Only if doing EDDM (every door, not targeted) |
| Mailing list (targeted) | $15-30 ($0.05-0.10/name) | $50-100 | If using purchased list. Free if Sunbiz data. |
| Mailing services | $0 (self-mail) | $50-100 | Addressing, sorting, delivery to PO |
| **TOTAL (Budget, First Class)** | **~$210-290** | | DIY design, self-mail, Sunbiz list |
| **TOTAL (Mid-Range, First Class)** | **~$310-450** | | Professional design, purchased list, mailing service |
| **TOTAL (Premium, First Class)** | **~$500-750** | | Full-service through PostcardMania or similar |

---

## 5. Pricing Landscape

### All-In Cost Per Piece (Printing + Postage + List + Handling)

| Tier | Description | Cost Per Piece | Total for 300 | Example Provider | Best For |
|------|-------------|---------------|---------------|-----------------|----------|
| **Budget** | 4x6 postcard, EDDM, basic stock, DIY design | $0.36-0.50 | $108-150 | USPS EDDM + VistaPrint printing | Testing a single neighborhood |
| **Budget+** | 6x9 postcard, EDDM, 14pt stock, DIY design | $0.46-0.65 | $138-195 | Taradel EDDM | Blanketing carrier routes |
| **Mid-Range** | 6x9 postcard, targeted list, 14pt UV coated | $0.75-1.10 | $225-330 | Click2Mail or Postalytics | Targeting new businesses from Sunbiz |
| **Mid-Range+** | 6x11 postcard, purchased list, 16pt stock | $1.00-1.50 | $300-450 | PostcardMania | Targeting by industry/revenue |
| **Premium** | 6x11 postcard, thick stock, variable data print, full automation | $1.25-2.00 | $375-600 | Postalytics or Lob (API) | Personalized follow-up sequences |

### Postage Rates (2026)

| Class | Rate | Notes |
|-------|------|-------|
| EDDM Retail | $0.223/piece | Minimum 200 pieces. Every door in a route. No targeting. |
| EDDM BMEU | $0.219/piece | Requires business mailer account. |
| USPS Marketing Mail (postcards) | $0.43/piece | Requires presort, min 200 pieces. Targeted. |
| First Class (postcards) | $0.55/piece | Any quantity, fastest delivery. Best for small test runs. |

### Printing Costs (Per Piece, No Postage)

| Size | 300 qty | 1,000 qty | 5,000 qty | Notes |
|------|---------|-----------|-----------|-------|
| 4x6 postcard, 14pt | $0.10-0.15 | $0.07-0.10 | $0.04-0.07 | Standard size |
| 6x9 postcard, 14pt | $0.15-0.25 | $0.10-0.15 | $0.06-0.10 | Oversized, more noticeable |
| 6x11 postcard, 16pt UV | $0.20-0.40 | $0.15-0.25 | $0.08-0.15 | Premium feel, meets EDDM minimum size |

### List Costs

| Source | Cost Per Name | Notes |
|--------|-------------|-------|
| Sunbiz download (DIY) | FREE | Must process/filter yourself. No phone/email. |
| Apify Sunbiz scraper | $0.01-0.025 | Automated, includes mailing address. |
| Data Axle USA | ~$0.05-0.15 | Highly targeted, verified, enriched with phone/email/revenue. |
| Chamber directories | FREE | Manual collection. Small lists (100-500 members each). |
| PostcardMania built-in list | Included in per-piece price | Convenience, but less control over targeting. |

---

## 6. QR Code Strategy

### URL Structure

| Hook | Landing Path | Full URL with UTM |
|------|-------------|-------------------|
| Hook A: Free Website | /free | sparkmysite.com/free?utm_source=directmail&utm_medium=postcard&utm_campaign=polk-pilot-2026&utm_content=free-website |
| Hook B: Free Consultation | /consult | sparkmysite.com/consult?utm_source=directmail&utm_medium=postcard&utm_campaign=polk-pilot-2026&utm_content=free-consult |
| Hook C: Starting at $500 | /start | sparkmysite.com/start?utm_source=directmail&utm_medium=postcard&utm_campaign=polk-pilot-2026&utm_content=500-start |

### QR Code Generation Tools

| Tool | Free Tier | Tracking | Dynamic QR | Notes |
|------|-----------|----------|------------|-------|
| **UTM Create (utmcreate.com)** | Yes | UTM + basic analytics | No | Generates UTM URLs + QR codes in one step |
| **QR Code Tiger (qrcode-tiger.com)** | Limited | Scan count, location, device | Yes | Dynamic QR codes (can change URL after printing) |
| **QR Code AI (qrcode-ai.com)** | Yes | Location, time, device | Yes | Free trackable QR codes |
| **CampaignTrackly** | Yes | Full UTM tracking | Yes | Bulk QR generation, 13 QR code types |
| **UTM.io** | Free QR generator | UTM tracking | No | Custom design QR codes |

### Recommended QR Strategy

1. **Use dynamic QR codes** — This lets you change the destination URL after printing if needed (e.g., if you realize /free should redirect to a different landing page)
2. **Embed full UTM parameters** into the QR code URL so every scan is automatically tracked in Google Analytics
3. **Make QR codes visually distinct** per variant — different color frames or labels so you can visually confirm which postcard someone is holding if they call
4. **Add a short URL fallback** next to the QR code for people who do not want to scan: "Visit sparkmysite.com/free"
5. **Track in Google Analytics 4:** Go to Reports > Acquisition > Traffic Acquisition, filter by utm_source=directmail to see all campaign traffic, then break down by utm_content to compare hook performance

### Landing Page Recommendations

Each URL (/free, /consult, /start) should be a dedicated landing page (not just a redirect to the homepage). Each page should:
- Match the postcard's hook headline exactly
- Have a single clear CTA (form fill, phone call, or calendar booking)
- Include the promo code from the postcard
- Be mobile-optimized (most QR scans are from phones)
- Have a Meta Pixel and Google Analytics tag for retargeting

---

## 7. Recommended Action Plan

### Phase 1: Pilot Test (Week 1-2)

1. **Build Database B pipeline:** Set up Apify florida-biz-scraper on a daily schedule, filter for Polk County zip codes
2. **Download Sunbiz quarterly data:** Filter for Polk County, deduplicate against Apify results
3. **Design 3 postcard variants** (Hook A, B, C) using Canva or in-house
4. **Create 3 landing pages** at sparkmysite.com/free, /consult, /start
5. **Generate 3 QR codes** with UTM parameters using UTM Create or QR Code Tiger
6. **Select 300 names** from new business registrations (last 30-90 days) in Polk County
7. **Print and mail** via PostcardMania, Postalytics, or self-mail (First Class at $0.55/piece)
8. **Budget:** $250-450 all-in

### Phase 2: Scale Winner (Week 3-6)

1. **Analyze pilot results** after 2-3 weeks (response rate, website visits, calls, QR scans)
2. **Pick the winning hook** (even if directional, not statistically significant)
3. **Scale to 1,000-2,000 pieces** using USPS Marketing Mail ($0.43/piece) for cost savings
4. **Expand Database A:** Run Google Maps scraper for all Polk County business categories
5. **Segment by business type:** Restaurants, retail, services, professional — test if certain categories respond better
6. **Budget:** $750-2,000

### Phase 3: Automate (Month 2+)

1. **Automated new business pipeline:** Apify daily scrape -> CRM -> trigger postcard via Postalytics or Lob API
2. **Follow-up sequence:** Postcard #1 at day 7, postcard #2 at day 30, postcard #3 at day 60
3. **Quarterly refresh:** Re-download Sunbiz data, update Database A, mail to businesses that have not yet been contacted
4. **Budget:** Ongoing $200-500/month depending on volume

---

## Sources

- [Sunbiz Data Downloads](https://dos.fl.gov/sunbiz/other-services/data-downloads/)
- [Sunbiz Daily Data](https://dos.fl.gov/sunbiz/other-services/data-downloads/daily-data/)
- [Sunbiz Corporate File Definitions](https://dos.fl.gov/sunbiz/other-services/data-downloads/corporate-data-file/)
- [Apify Florida Sunbiz Scraper (agenscrape)](https://apify.com/agenscrape/florida-sunbiz-scraper)
- [Apify Florida Biz Scraper with MCP (explorer_holdings)](https://apify.com/explorer_holdings/florida-biz-scraper)
- [Apify Google Maps Scraper](https://apify.com/compass/crawler-google-places)
- [Apify D&B Scraper](https://apify.com/mscraper/dun-bradstreet-business-directory-scraper)
- [Apify SBA.GOV Scraper](https://apify.com/fatihtahta/sba-gov-scraper)
- [USPS EDDM](https://www.usps.com/business/every-door-direct-mail.htm)
- [USPS Direct Mail Cost Calculator](https://www.uspsdelivers.com/direct-mail-cost-calculator/)
- [2026 USPS Postage Rates (CRST)](https://crst.net/direct-mail-tools/postage-rates/)
- [PostcardMania Pricing](https://www.postcardmania.com/price/)
- [Postalytics Pricing](https://www.postalytics.com/direct-mail-pricing/)
- [Postalytics A/B Testing Guide](https://www.postalytics.com/blog/direct-mail-testing-best-practices/)
- [Taradel EDDM Pricing](https://www.taradel.com/blog/how-much-does-postage-cost-for-eddm-retail-a-comprehensive-cost-breakdown)
- [Mail Pro 2026 Direct Mail Cost Guide](https://www.mailpro.org/post/how-much-does-direct-mail-cost/)
- [Mail Pro EDDM Cost Breakdown](https://www.mailpro.org/post/eddm-cost/)
- [Data Axle USA](https://www.dataaxleusa.com/)
- [Lakeland Economic Development Council](https://lakelandedc.com/)
- [Lakeland Chamber of Commerce Directory](https://business.lakelandchamber.com/list)
- [Central Florida Development Council](https://www.cfdc.org/)
- [CFDC Data & Research](https://www.cfdc.org/resources/data-research/)
- [Winter Haven Chamber](https://www.winterhavenchamber.com/)
- [Northeast Polk Chamber](https://www.northeastpolkchamber.com/)
- [Polk County Tax Collector — Business Tax Search](https://www.polktaxes.com/services/search-and-pay-local-business-taxes/)
- [Polk County Property Appraiser](https://www.polkpa.org/)
- [City of Lakeland Business Tax](https://www.lakelandgov.net/departments/community-economic-development/economic-development/business-tax/)
- [LALtoday New Businesses in Lakeland](https://laltoday.6amcity.com/new-to-lakeland/new-businesses-lakeland-fl)
- [UTM Create (QR + UTM Generator)](https://utmcreate.com/)
- [QR Code Tiger](https://www.qrcode-tiger.com/utm-url-qr-code)
- [QR Code AI](https://qrcode-ai.com/qr-code-tracking-analytics)
- [CampaignTrackly QR Codes](https://www.campaigntrackly.com/qr-code-made-easy-unlock-traffic-insights/)
- [Lob UTM Guide for Direct Mail](https://www.lob.com/blog/utm-guide-direct-mail-marketing)
- [Sendoso 2026 Direct Mail Companies Comparison](https://www.sendoso.com/resources/blog/best-direct-mail-marketing-companies)
- [Census QuickFacts — Polk County, FL](https://www.census.gov/quickfacts/fact/table/polkcountyflorida/POP715223)
- [Florida EDR Area Profile — Polk County (PDF)](https://edr.state.fl.us/content/area-profiles/county/polk.pdf)
