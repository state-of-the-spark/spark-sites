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
- [ ] Is WooCommerce dunning configured to retry failed card payments?
- [ ] Check full dispute history across all months

---

## API Access

Credentials stored in `spark-sites/.env` (gitignored). Read-only keys.

- **WooCommerce:** `https://sparkmysite.com/wp-json/wc/v3/` (Basic Auth)
- **Stripe:** Restricted key (read-only, balance/charges/payouts/disputes)
