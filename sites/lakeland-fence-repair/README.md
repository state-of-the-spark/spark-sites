# Lakeland Fence Repair (rank-and-flip property #1)

Build-to-sell local lead-gen site. First tree in the Citrus Grove protocol (rank top 1-3 organic + maps, generate leads, exit via BizBuySell/direct sale). Full strategy: `plan.md` (source: grant-sparks `research/2026-07-19-lakeland-fence-repair-rank-and-flip-plan.md`).

## Site

- **Staging (build here):** https://lakelandfencerepair.mystagingwebsite.com (Pressable)
- **Production domain:** lakelandfencerepair.com - owned by Grant, NOT yet pointed at Pressable (currently registrar parking page; it returns HTTP 200 on every path, so never trust a 200 from the .com until DNS cutover)
- **Theme:** Twenty Twenty-Five (active, confirmed 2026-07-19) - block-native build, zero inline CSS, Global Styles + WP Font Library (same playbook as Monel Security / Winter Haven demo builds)
- **Credentials:** WordPress application password, user `lakelandfencerepair` - stored in Lumen memory (`reference_lakelandfencerepair_wordpress.md`), NOT in this repo

## Working rules

- Built FOR SEO, not fixed after: service-first architecture (~12-15 pages), blog capped at 1-2 commercial-adjacent posts/month, LocalBusiness schema, locked NAP, CWV budget LCP < 2.0s mobile
- No inline CSS anywhere; block patterns + theme.json carry all styling
- Every phase documented in `build-checklist.md` as it is executed, so city #2 / trade #2 duplication is a variables swap (`variables.md`)

## Status log

- 2026-07-19: Plan approved by Grant (block theme confirmed, directory-under-spark-sites confirmed). Staging access verified. Awaiting: fulfillment partner decision, GBP setup (verify with 603 Hartsell Ave, hidden, service-area business - P.O. Boxes not allowed on GBP), phone number, entity/DBA.
