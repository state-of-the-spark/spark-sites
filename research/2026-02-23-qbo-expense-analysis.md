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

| | Amount |
|--|--------|
| **Revenue** | $55,514 |
| **COGS** | $13,670 |
| **Gross Profit** | $41,845 (75.4% margin) |
| **Expenses** | $41,465 |
| **Net Income** | **$399** |

Breaking even. $55K in revenue, $399 in profit. 0.7% net margin over 90 days.

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
| **E2M Solutions** | $2,097 | $699 | What is this? SEO outsource? |
| **ClickFunnels** | $291 | $97 | Are you actively using funnels? |
| **Zapier** | $221 | $74 | What automations are running? |
| **Elegant Themes (Divi)** | $205 | varies | Needed if building with Divi |
| **Paddle.net** | $184 | $62 | What product is this for? |
| **Mail Chimp** | $324 | $104 | Sending enough email to justify? |
| **Canva** | $74 | ~$13 | Reasonable |
| **OpenAI** | $106 | $35 | Reasonable |
| **Descript** | $70 | $35 | Editing video/podcast? |
| **Restream** | $98 | $49 | Live streaming? |
| **Loveable** | $75 | $25 | Dev tool — still using? |
| **Cloud Flare** | $75 | $25 | Likely needed |
| **Firecrawl** | $38 | $19 | Still using for prospecting? |
| **Skool** | $110 | ~$37 | Community platform — active? |
| **TubeBuddy** | $86 | one-time? | YouTube tool — ROI? |
| **Zoom** | $51 | $17 | Needed for calls |
| **ManageWP** | $25 | $8 | Needed for client sites |
| **SendWP** | $27 | $9 | Needed for WP email |
| **GoDaddy** | $610 | ~$200 | Domain renewals? Or hosting? High. |
| **DNH Domains** | $164 | ~$55 | More domains? |
| **Google Domains** | $91 | ~$30 | More domains |
| **Wordfence** | $134 | one-time | Security — needed |
| **WooCommerce** | $408 | varies | Extensions — needed |
| **Gravity Forms** | $49 | one-time | Needed |
| **DocHub** | $120 | one-time? | Document signing — needed? |
| **Brizy** | $19 | one-time? | Page builder — still using? |
| **Elementor** | $79 | one-time? | Another page builder |
| **Google Video Editor** | $9 | $3 | Tiny |
| **YouTube Premium** | $38 | $13 | Personal? |

### Questions That Need Answers

1. **E2M Solutions — $2,097 (90 days).** What is this? If outsourced SEO/content, is it producing client revenue exceeding $699/month?
2. **Marissa Nieddu — $2,497 (COGS contractor).** Who is this? What does she deliver?
3. **ClickFunnels — $97/month.** Actively running funnels producing leads or revenue? If not, cancel. $1,164/year.
4. **Path Social — $350.** One-time or recurring? What did it produce?
5. **GoDaddy — $610 in 90 days.** Very high for domains. Paying for hosting you don't need?
6. **Descript + Restream — $84/month combined.** Actively producing video/podcast? If paused, cancel both = $1,008/year.
7. **Google Ads — $2,302.** For clients (reimbursed) or for Spark? If Spark, what's the ROI?

### Payroll — $20,051 / 90 days

$6,684/month including employer taxes. Against $18,505/month revenue, that's 36% of revenue to payroll. Not alarming for an agency, but means almost no room for error. Need clarity on who's on payroll and what they're delivering.

### Rent — $2,777 / 90 days

COhatch at $624/month (Jan/Feb). December was $1,528 — deposit or different space? If steady at $624, reasonable for coworking.

### Interest Paid — $1,097 / 90 days

$366/month average on credit card debt. Confirms ~28% APR on the $27K balance estimate. This goes away as CC debt is paid down.

---

## Potential Cuts

| Cut | Monthly Savings |
|-----|----------------|
| Flywheel → Pressable (already planned) | $1,262 net |
| Meals to $500/mo | ~$874 |
| ClickFunnels (if unused) | $97 |
| Descript + Restream (if paused) | $84 |
| E2M Solutions (if no ROI) | $699 |
| Path Social (if recurring, no ROI) | $350 |
| **Total potential** | **~$3,366/month** |

$3,366/month in potential savings — nearly enough to cover the entire LOC payment AND make a serious CC dent.

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

Not bleeding from one wound — bleeding from twenty small ones. The biggest controllable levers are:

1. **Meals** — cut in half, save $5K/year
2. **Unused software** — audit and cancel, save $2-4K/year
3. **E2M contractor** — validate ROI or cut, save $8.4K/year
4. **Flywheel swap** — already planned, saves $15K/year net

Combined with the LOC arbitrage play and on-hold subscription recovery ($2,365/period), there's a clear path to positive monthly cash flow.

---

## Open Questions

- [ ] What does E2M Solutions deliver? ROI?
- [ ] Who is Marissa Nieddu and what does she deliver?
- [ ] Is ClickFunnels actively producing?
- [ ] Is Path Social recurring?
- [ ] What's in the $610 GoDaddy spend?
- [ ] Are Descript + Restream actively used?
- [ ] Are Google Ads for clients or Spark?
- [ ] Who's on payroll and what are the roles?
- [ ] December rent spike — what happened?
- [ ] Is YouTube Premium a business or personal expense?
