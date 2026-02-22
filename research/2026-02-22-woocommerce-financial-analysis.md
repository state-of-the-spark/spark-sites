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

## Open Questions

- [ ] Do Stripe deposits match ~$13K/month?
- [ ] Is the $0 sales tax intentional or a configuration gap?
- [ ] What products/subscriptions drive the consistent ~160 orders/month?
- [ ] What caused the September 2025 spike ($21K)?
- [ ] Are there failed/abandoned orders not captured here?

---

## API Access

WooCommerce REST API credentials stored in `spark-sites/.env` (gitignored). Read-only key.

```
Endpoint: https://sparkmysite.com/wp-json/wc/v3/
Auth: Consumer Key / Consumer Secret (Basic Auth)
```
