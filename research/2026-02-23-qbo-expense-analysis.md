---
type: research
date: 2026-02-23
status: active
source: QuickBooks Online (P&L + Expenses by Vendor Summary)
period: Nov 25, 2025 – Feb 23, 2026
tags: [finance, expenses, qbo, cash-flow]
---

# QBO Expense Analysis — 90-Day Deep Dive

Cross-referenced with Stripe/WooCommerce data from `research/2026-02-22-woocommerce-financial-analysis.md` and LOC arbitrage analysis from `research/2026-02-23-loc-pressable-arbitrage-analysis.md`.

---

## The Big Picture (90 Days)

**Note:** Raw QBO numbers included a $1,497 profit distribution to Grant miscategorized as rent/contractor expense under "Marissa Nieddu" (ex-wife's name on account — should be Grant). Adjusted numbers below.

| | Raw QBO | Adjusted |
|--|--------|----------|
| **Revenue** | $55,514 | $55,514 |
| **COGS** | $13,670 | $13,670 |
| **Gross Profit** | $41,845 (75.4%) | $41,845 (75.4%) |
| **Expenses** | $41,465 | $39,968 |
| **Net Income** | $399 | **$1,896** |
| **Net Margin** | 0.7% | **3.4%** |

Still thin, but not as dire once the misclassified distribution is removed.

---

## Monthly P&L Breakdown

| | Nov (partial) | December | January | February (partial) |
|--|--------------|----------|---------|-------------------|
| Revenue | $3,524 | $19,035 | $21,608 | $11,348 |
| COGS | $1,550 | $6,083 | $4,337 | $1,700 |
| Gross Profit | $1,974 | $12,952 | $17,271 | $9,647 |
| Expenses | $4,587 | $15,155 | $12,691 | $9,032 |
| **Net Income** | **-$2,613** | **-$2,193** | **$4,585** | **$619** |

December was the worst month — high expenses ($15K) against moderate revenue ($19K). January was the best — revenue spiked while expenses dropped.

---

## Where the Money Goes

### The Big 5 (82% of expenses)

| Category | 90-Day Total | Monthly Avg | % of Expenses |
|----------|-------------|-------------|---------------|
| **Payroll** | $20,051 | $6,684 | 48.4% |
| **Apps & Software** | $7,302 | $2,434 | 17.6% |
| **Meals & Entertainment** | $4,122 | $1,374 | 9.9% |
| **Rent (COhatch)** | $2,777 | $926 | 6.7% |
| **Advertising & Promotion** | $2,402 | $801 | 5.8% |

Everything else is noise compared to these five.

---

## Expense Audit — Where to Cut

### RED FLAG: Meals & Entertainment — $4,122 / 90 days

$1,374/month average. December alone was $2,285.

Second-highest controllable expense after software. At $55K revenue, 7.4% of gross revenue goes to meals. For a bootstrapped agency managing $27K in CC debt, this is the single easiest place to reclaim cash.

**If cut to $500/month:** saves ~$874/month = **$5,244/year.**

### RED FLAG: Apps & Software — $7,302 / 90 days

$2,434/month. Full vendor breakdown:

| Vendor | 90-Day | Monthly | Verdict |
|--------|--------|---------|---------|
| **Flywheel** | $4,000 | $2,000 | ELIMINATING (Pressable move) |
| **E2M Solutions** | $2,097 | $699 | White-label web dev. Was 2 services, cut to 1. KEEP. |
| **ClickFunnels** | $291 | $97 | Not actively used. CUT. |
| **Zapier** | $221 | $74 | What automations are running? |
| **Elegant Themes (Divi)** | $205 | varies | Needed if building with Divi |
| **Paddle.net** | $184 | $62 | What product is this for? |
| **Mail Chimp** | $324 | $104 | Sending enough email to justify? |
| **Canva** | $74 | ~$13 | Reasonable |
| **OpenAI** | $106 | $35 | Reasonable |
| **Descript** | $70 | $35 | Already canceled. CUT. |
| **Restream** | $98 | $49 | Active for live streaming. KEEP. |
| **Loveable** | $75 | $25 | Dev tool — still using? |
| **Cloud Flare** | $75 | $25 | Likely needed |
| **Firecrawl** | $38 | $19 | Still using for prospecting? |
| **Skool** | $110 | ~$37 | Community platform — active? |
| **TubeBuddy** | $86 | one-time? | YouTube tool — ROI? |
| **Zoom** | $51 | $17 | Needed for calls |
| **ManageWP** | $25 | $8 | Needed for client sites |
| **SendWP** | $27 | $9 | Needed for WP email |
| **GoDaddy** | $610 | ~$200 | Domain renewals + white-label reseller. Reseller needs migration/cut. |
| **DNH Domains** | $164 | ~$55 | More domains? |
| **Google Domains** | $91 | ~$30 | More domains |
| **Wordfence** | $134 | one-time | Security — needed |
| **WooCommerce** | $408 | varies | Extensions — needed |
| **Gravity Forms** | $49 | one-time | Needed |
| **DocHub** | $120 | one-time? | Document signing — needed? |
| **Brizy** | $19 | one-time? | Page builder — still using? |
| **Elementor** | $79 | one-time? | Another page builder |
| **Google Video Editor** | $9 | $3 | Tiny |
| **YouTube Premium** | $38 | $13 | Business expense. KEEP. |
| **Amazon Digital Svcs** | $172 | $57 | Was Audible+Kindle+Prime. Canceled Audible+Kindle. Now $15/mo Prime only. |

### Questions — Resolved

1. **E2M Solutions — $2,097 (90 days).** White-label web dev team. Was 2 services at $699 each, cut to 1. Now $699/mo. Core to client delivery — KEEP.
2. **"Marissa Nieddu" — $2,497.** Actually Grant's account (ex-wife's name). $1,497 was profit distribution (misclassified as expense), $500/mo is rent to Grant for home studio office. QBO needs reclassification.
3. **ClickFunnels — $97/month.** Not actively used. CUT. Saves $1,164/year.
4. **Path Social — $350.** Annual social media tool. One-time yearly cost. KEEP.
5. **GoDaddy — $610 in 90 days.** Mix of domain renewals + white-label reseller service. Reseller needs migration and cancellation. Future savings TBD.
6. **Descript — $35/mo.** Already canceled. **Restream — $49/mo.** Active for live streaming. KEEP.
7. **Google Ads — $2,302.** Mix of client spend and Spark's own. Temporarily paused. Will revisit at ~$500/mo budget — was getting good CPC.
8. **Payroll — $6,684/mo.** Grant and Amber on W-2. Nicole is 1099 contractor. 36% of revenue — not a cut target.
9. **December rent spike — $1,528.** Was the $1,497 misclassified distribution + $31 COhatch. Real rent is $624/mo ($124 COhatch + $500 home studio).
10. **YouTube Premium — $12.58/mo.** Business expense. KEEP.
11. **Amazon Digital Services — $57/mo.** Was Audible + Kindle + Prime. Canceled Audible and Kindle. Now $15/mo (Prime only). Saves ~$42/mo.

### Payroll — $20,051 / 90 days

$6,684/month including employer taxes. Grant and Amber on W-2. Nicole is 1099 contractor (separate). 36% of revenue — not a cut target.

### Rent — $1,280 / 90 days (adjusted)

Actual recurring rent: $624/month ($124 COhatch + $500 home studio to Grant). December's $1,528 was inflated by $1,497 misclassified profit distribution. QBO needs correction.

### Interest Paid — $1,097 / 90 days

$366/month average on credit card debt. Confirms ~28% APR on the $27K balance estimate. This goes away as CC debt is paid down.

---

## Confirmed Cuts

| Cut | Monthly Savings | Status |
|-----|----------------|--------|
| E2M second service | $699 | Already done |
| ClickFunnels | $97 | Cutting now |
| Descript | $35 | Already canceled |
| Audible + Kindle | $42 | Already canceled |
| Google Ads (temporary pause) | ~$1,000 | Paused, revisit at $500/mo |
| **Total confirmed** | **$1,873/month** |

## Pending / Future Cuts

| Item | Potential Savings | Notes |
|------|------------------|-------|
| GoDaddy reseller migration | TBD | Needs migration work |
| Flywheel → Pressable | $1,262 net | LOC arbitrage plan |
| Meals reduction | ~$874 | Target $500/mo |
| Google Ads reintroduction | -$500 | Bring back at lower budget |

## Revised Monthly Picture

| | Before | After Cuts |
|--|--------|-----------|
| Monthly expenses (avg) | ~$13,323 | ~$11,450 |
| Monthly revenue (avg) | ~$18,505 | $18,505 |
| **Monthly margin** | ~$5,182 | **~$7,055** |

$1,873/month back immediately. Combined with Pressable arbitrage ($1,262 net), total improvement of **~$3,135/month**.

---

## Cross-Reference: QBO vs Stripe/WooCommerce

| Metric | QBO Says | Stripe/WooCommerce Says |
|--------|----------|------------------------|
| Monthly revenue | ~$18,505 | ~$13,400 (Stripe) + ~$293 (PayPal) = ~$13,693 |
| **Gap** | | **~$4,812/month** |

The $4,812 gap = revenue from website builds, consulting, and non-subscription income (invoiced separately, paid by check/Venmo/QB Payments). The $538 in QB Payments fees confirms some revenue flows through QBO invoicing, not Stripe.

---

## Revenue Breakdown by Category (90 Days)

| Category | 90-Day Total | Monthly Avg | % of Revenue |
|----------|-------------|-------------|-------------|
| Domain/Email Hosting | $30,536 | $10,179 | 55.0% |
| Membership Fees | $16,306 | $5,435 | 29.4% |
| Website/Content Support | $7,674 | $2,558 | 13.8% |
| Consulting/Support | $999 | $333 | 1.8% |

Hosting + memberships = 84% of revenue. This is recurring/subscription revenue — strong base.

---

## Bottom Line

Not bleeding from one wound — bleeding from twenty small ones. Confirmed $1,873/month in cuts already executed or in progress. Remaining levers:

1. **Meals** — cut to $500/mo target, save $5K/year
2. **GoDaddy reseller** — migrate and cancel, savings TBD
3. **Flywheel swap** — already planned, saves $15K/year net
4. **Google Ads** — reintroduce at $500/mo when ready (was getting good CPC)

Combined with the LOC arbitrage play and on-hold subscription recovery ($2,365/period), there's a clear path to positive monthly cash flow.

---

## QBO Cleanup Needed

- [ ] Reclassify "Marissa Nieddu" vendor to "Grant Sparks" (or "Grant" — ex-wife's name on account)
- [ ] Move $1,497 Dec payment from rent/contractor to owner's draw/distribution
- [ ] Confirm $500/mo home studio payments are categorized correctly as rent

---

## Open Questions (Resolved)

- [x] What does E2M Solutions deliver? → White-label web dev. Cut from 2 to 1 service. KEEP.
- [x] Who is Marissa Nieddu? → Grant's account (ex-wife name). Distribution + rent to Grant.
- [x] Is ClickFunnels actively producing? → No. CUT.
- [x] Is Path Social recurring? → Annual ($350/yr). KEEP.
- [x] What's in the $610 GoDaddy spend? → Domains + reseller service. Reseller needs migration.
- [x] Are Descript + Restream actively used? → Descript canceled. Restream active, KEEP.
- [x] Are Google Ads for clients or Spark? → Mix. Paused, revisit at $500/mo.
- [x] Who's on payroll? → Grant + Amber (W-2). Nicole (1099).
- [x] December rent spike? → Misclassified $1,497 distribution. Real rent $624/mo.
- [x] Is YouTube Premium business? → Yes. KEEP.
- [x] Amazon Digital Services? → Canceled Audible + Kindle. $15/mo Prime only.
