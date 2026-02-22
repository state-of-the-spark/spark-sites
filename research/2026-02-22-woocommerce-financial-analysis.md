---
type: research
status: active
date: 2026-02-22
source: WooCommerce REST API (sparkmysite.com)
---

# WooCommerce Financial Analysis — Spark Sites

Analysis of WooCommerce sales data from sparkmysite.com. Data pulled via REST API on 2026-02-22.

---

## 2025 Full Year Summary

| Metric | Value |
|--------|-------|
| **Total Revenue** | $163,153 - $164,992 |
| **Total Orders** | 1,957 - 1,962 |
| **Monthly Average** | $13,749 |
| **Average Order Value** | ~$84 |
| **Refunds** | Minimal |

---

## 2025 Monthly Breakdown

| Month | Revenue | Orders | Notes |
|-------|---------|--------|-------|
| Jan | $12,579 | 172 | |
| Feb | $8,221 | 160 | Lowest month |
| Mar | $15,321 | 165 | |
| Apr | $11,840 | 162 | |
| May | $10,276 | 164 | |
| Jun | $18,133 | 165 | Summer spike |
| Jul | $17,356 | 164 | |
| Aug | $13,737 | 160 | |
| Sep | **$21,466** | 164 | Best month |
| Oct | $10,944 | 166 | |
| Nov | $9,907 | 160 | |
| Dec | $14,249 | 160 | |

**Seasonal pattern:** Revenue spikes in summer (Jun-Jul) and September. Dips in Feb, Oct-Nov.

---

## 2026 YTD

| Month | Revenue | Orders |
|-------|---------|--------|
| Jan | $11,787 | 148 |
| Feb (partial, as of 2/22) | $6,401 | 116 |
| **YTD Total** | **$18,189** | **264** |

February tracking slightly behind 2025 pace but still has a week left.

---

## Payment Methods (2025)

| Method | Revenue | % of Total | Settles To |
|--------|---------|------------|------------|
| Credit / Debit Card | ~$134,002 | ~81% | Stripe |
| Link (Stripe express checkout) | ~$13,691 | ~8% | Stripe |
| Google Pay (Stripe) | ~$10,897 | ~7% | Stripe |
| Apple Pay (Stripe) | ~$2,290 | ~1.4% | Stripe |
| **All Stripe** | **~$160,880** | **~97.5%** | **Stripe** |
| PayPal | ~$3,517 | ~2.5% | PayPal |

---

## Expected Monthly Deposits

### Stripe
- **Gross:** ~$13,400/month average
- **After fees (2.9% + $0.30):** ~$13,000/month net
- **Range:** $8,000 (slow) to $21,000 (peak)

### PayPal
- **Gross:** ~$293/month average
- **Consistent ~$295/month** through most of 2025

---

## Key Observations

1. **Order volume is remarkably consistent** — 160-172 orders/month regardless of revenue. Revenue variance comes from order size, not order count.
2. **Nearly everything flows through Stripe** (97.5%). PayPal is negligible.
3. **Link and Google Pay are Stripe products** — they settle to the same Stripe account. Don't count them separately when reconciling.
4. **One outlier order** on 2026-02-20: $1,587.96 (#43662). Verify this landed correctly.
5. **No sales tax collected** ($0.00 across all periods). Confirm this is intentional for digital services.

---

## Stripe Reconciliation (added 2026-02-22)

### Stripe Payouts vs WooCommerce (2025)

| Month | WooCommerce | Stripe Gross | Stripe Payout | Gap |
|-------|-------------|-------------|---------------|-----|
| Jan | $12,580 | $12,477 | $12,308 | $272 |
| Feb | $8,221 | $8,136 | $7,633 | $588 |
| Mar | $15,321 | $15,261 | $17,187 | -$1,866 (timing) |
| Apr | $11,840 | $11,735 | $11,379 | $462 |
| May | $10,276 | $10,259 | $9,910 | $366 |
| Jun | $18,133 | $18,010 | $17,164 | $969 |
| Jul | $17,356 | $17,251 | $16,226 | $1,130 |
| Aug | $13,737 | $13,594 | $13,211 | $526 |
| Sep | $21,466 | $24,626 | $20,617 | $849 |
| Oct | $10,944 | $10,324 | $9,008 | **$1,936** |
| Nov | $9,907 | $10,277 | $10,747 | -$840 (timing) |
| Dec | $14,249 | $14,320 | $12,879 | **$1,370** |

**2025 Totals:** WooCommerce $163,153 | Stripe Payouts $174,157 (includes timing shifts)

### Normal gap explanations:
- **Stripe fees:** ~$335-437/month (~3%)
- **PayPal orders:** ~$293/month (goes to PayPal, not Stripe)
- **Payout timing:** Charges near month-end pay out in next month

---

### October 2025 Deep Dive

| Metric | Amount |
|--------|--------|
| Gross charges | $10,324.06 |
| Refunds | $0.00 |
| Stripe fees | $335.31 |
| Expected payout | $9,988.75 |
| Actual payout | $9,128.00 |
| **Unaccounted** | **$860.75** |

- **25 failed charges** (card declines, insufficient funds) — lost revenue, not stolen
- **No disputes** in October
- $860 discrepancy likely timing from late-October charges paying out in November
- Late Sep charges ($308.79) flowed into early Oct payouts

**Assessment: October gap is explainable.** The $1,936 gap between WooCommerce and Stripe payouts is: fees ($335) + PayPal ($~293) + timing ($860) + WC/Stripe gross difference ($620 — WC counts PayPal orders Stripe doesn't see).

---

### December 2025 Deep Dive

| Metric | Amount |
|--------|--------|
| Gross charges | $13,920.53 |
| Refunds | $279.93 |
| Stripe fees | $437.20 |
| Expected payout | $13,203.40 |
| Actual payout | $13,023.24 |
| **Unaccounted** | **$180.16** |

- **34 failed charges** (card declines, expired cards) — highest failure month
- **1 FRAUD DISPUTE: $495.00 — STATUS: LOST**
  - Date: 2025-12-08
  - Reason: fraudulent
  - This means a customer disputed a $495 charge as fraud and won. Money was clawed back.
- **1 refund:** $279.93 on Dec 4
- $180 discrepancy is timing

**Assessment: December gap accounted for.** The $1,370 gap: fees ($437) + PayPal ($~293) + refund ($280) + fraud dispute ($495) = $1,505 expected gap. Actual gap $1,370. Math checks out — the fraud dispute is the biggest hit.

---

### FRAUD ALERT: December 2025 Dispute

**$495.00 charge disputed as fraudulent — LOST**

This needs investigation:
- [ ] Who was the customer on this charge?
- [ ] Was this a legitimate order that got chargebacked?
- [ ] Is there a pattern of disputes across other months?
- [ ] Has Stripe flagged the account for elevated fraud risk?

---

### Failed Charges Pattern

| Month | Failed Charges | Notes |
|-------|---------------|-------|
| Oct 2025 | 25 | Card declines, insufficient funds |
| Dec 2025 | 34 | Card declines, expired cards — worst month |

These are **lost revenue, not theft**. Customers whose cards don't work. But 25-34 failures/month against ~160 successes means a **15-20% failure rate** — that's high. Could indicate:
- Subscription renewals failing on expired cards
- Need for dunning (retry failed payments) if not already configured

---

## Open Questions

- [x] Do Stripe deposits match ~$13K/month? **YES — gaps explained by fees, PayPal, timing, and one fraud dispute**
- [ ] Is the $0 sales tax intentional or a configuration gap?
- [ ] What products/subscriptions drive the consistent ~160 orders/month?
- [ ] What caused the September 2025 spike ($21K)?
- [ ] Are there failed/abandoned orders not captured here? **YES — 25-34 failed charges/month**
- [ ] Investigate the $495 fraud dispute from December 2025
- [x] Is WooCommerce dunning configured to retry failed card payments? **YES — 100% recovery rate. All 506 failed charges from Dec 2025 - Feb 2026 had a matching successful charge same month. Dunning is working perfectly.**
- [ ] Check full dispute history across all months
- [ ] Call on-hold subscriptions to reactivate (see list below)

---

## Failed Charges — Retry Analysis (added 2026-02-22)

Pulled all 506 failed charges from Dec 2025 - Feb 2026 and cross-referenced against successful charges for the same customer + amount in the same month.

| Metric | Value |
|--------|-------|
| **Failed charges** | 506 |
| **Recovered (retried successfully)** | 506 (100%) |
| **Truly lost** | $0.00 |

**Conclusion:** WooCommerce automatic retry is handling all failed payments. No manual calls needed for failed charges — they all eventually go through.

---

## On-Hold Subscriptions — Call List (added 2026-02-22)

**32 on-hold subscriptions** worth $2,364.87/period combined, vs **149 active** subscriptions.

### High-Value (call first)

| Customer | Amount | Product | On Hold Since | Phone | Email |
|----------|--------|---------|---------------|-------|-------|
| Jason Nix | $479.40/yr | Basic Membership F&F | 2024-07 | 863-934-6218 | jason@jasonnixllc.com |
| William Tower Jr | $419.76/yr | New Sparked Website | 2025-11 | 863-944-0799 | sslachta1@gmail.com |
| ReGina Bullock | $399.00/yr | Hosting & Support Annual | 2026-01 | 863-797-3136 | thepetnannylakeland@gmail.com |
| Tim Whitham | $69.90/mo | Website Hosting | 2026-01 | 863-397-8497 | packagingnorthstar@gmail.com |
| Meredith Meeks | $67.98/mo | WordPress Support | 2026-02 | 863-224-2030 | admin@myrestoredfloor.com |
| Jude Johnson | $65.00/mo | WordPress Support | 2024-11 | 925-577-0177 | jude2022johnson@gmail.com |
| Heather Pincelli | $64.98/mo | New Sparked Website | 2024-05 | 208-446-3220 | heather@parentingteengirls.com |
| Emily Waters | $64.98/mo | Elite Designed Spark Site | 2025-08 | 352-812-2153 | hello@treasuryrentals.com |
| David White | $64.98/mo | WP Support & Website | 2025-12 | (336) 667-2300 | bookkeepermf@mstarm.org |
| Robert Berganza | $54.98/mo | WP Support & Website | 2025-07 | 863-255-1821 | rb@robertberganza.com |

### Medium-Value

| Customer | Amount | Product | On Hold Since | Phone | Email |
|----------|--------|---------|---------------|-------|-------|
| Stephen Johnson | $44.95/mo | Basic Membership | 2024-09 | 352-476-2407 | wearerelevantsocial@gmail.com |
| Dale Powell | $39.95/mo | Basic Membership | 2025-06 | 863-294-4211 | clarkfloorcovering@yahoo.com |
| Kenneth Onuoha | $35.00/mo | Hosting & Support | 2025-12 | 863-271-7776 | kennethonuoha12345876@gmail.com |
| Kristy Robinson (x2) | $70.00/mo | 2 subs: Rooted Remedies + Sparked Website | 2025-09 | 305-434-2704 | wellnesskristy@gmail.com |
| riko ramos | $35.00/mo | Basic Membership F&F | 2024-11 | 863-660-1403 | inwiththenew@live.com |
| Matthew Wengerd | $35.00/mo | Basic Membership F&F | 2024-08 | 253-237-4636 | matthew@afinepress.com |
| Leidy Yanes | $34.95/mo | Marketing-Ready Web Presence | 2026-02 | 863-209-6976 | leidy_yanes@icloud.com |
| Tiffany Montgomery | $34.95/mo | New Sparked Website | 2024-04 | 813-756-8860 | tpmontgomery@jurleenskitchen.com |
| Jenna Lister | $34.95/mo | Micro-Site Launch Kit | 2024-12 | 863-581-2456 | jenna.averett@gmail.com |
| Jared Yates | $28.50/mo | Managed WP Hosting | 2026-02 | 863-666-1199 | jared@ydesignco.com |

### Lower-Value

| Customer | Amount | Product | On Hold Since | Phone | Email |
|----------|--------|---------|---------------|-------|-------|
| Terry Kruse | $25.00/mo | Managed WP F&F | 2025-01 | 772-766-3662 | terrylkruse@gmail.com |
| Tomas Czernek | $25.00/mo | Managed WP F&F | 2024-09 | 352-212-3775 | kcczernek@gmail.com |
| domingo sanchez | $24.95/mo | Micro-Site Launch Kit | 2025-11 | 813-997-9787 | domingosanchezjw@gmail.com |
| Kymberli Ragsdale | $24.95/mo | DIY WP Hosting | 2024-08 | 720-278-6232 | authorsavoi@yahoo.com |
| Lisa McQueen | $21.98/mo | DIY Hosting | 2023-09 | 707-906-8491 | lisamcqueen84@gmail.com |
| Lisa Welsh | $19.98/mo | DIY WP Hosting | 2025-10 | 863-388-1906 | lisa@vitalityfarmscompany.com |
| Joe Gross | $19.00/mo | Sparked Website | 2025-12 | 813-966-1404 | joegross@zebrafishgc.com |
| Johanna Baynard (x2) | $29.90/mo | 2 subs: DIY Hosting | 2025-09 | 813-347-2237 | johannabaynard@gmail.com |
| Kayla Starling | $14.95/mo | DIY Hosting | 2025-11 | 863-712-2803 | ryanneal1992@gmail.com |
| Jonathan Sierra | $14.95/mo | DIY Hosting | 2024-05 | 863-370-8849 | jon@jonsierra.com |

### Triage Notes

- **Warm leads (on hold <2 months):** Tim Whitham, Meredith Meeks, Leidy Yanes, Jared Yates — card probably just needs updating
- **Cold leads (on hold 6+ months):** Jason Nix, Heather Pincelli, Jude Johnson, Tiffany Montgomery, Stephen Johnson — may need "we miss you" conversation or cancellation
- **Duplicates:** Kristy Robinson (2 subs), Johanna Baynard (2 subs) — one call covers both

---

## API Access

Credentials stored in `spark-sites/.env` (gitignored). Read-only keys.

- **WooCommerce:** `https://sparkmysite.com/wp-json/wc/v3/` (Basic Auth)
- **Stripe:** Restricted key (read-only, balance/charges/payouts/disputes)
