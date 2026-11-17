# Dry run summary: sparkmysite.com, 2026-11-16

Scout and Judge steps run read-only from existing review screenshots. Nothing was posted to the site. Builder and Auditor were not run.

## Headline

No homepage-only test can reach a decision at current traffic. 137 homepage sessions in 14 days gives about 62 sessions per version after the holdout. The plugin needs 100 per version and stops at 14 days, so a homepage test can start but can only end as "no difference". Reaching 100 per version would take about 23 days. Test 46907 is in the same position.

Ways out: test elements that appear on every page (the whole site had 526 sessions in the same 14 days), let the stop date scale with traffic, or raise homepage traffic to about 223 sessions per 14 days.

## Ranking

| Rank | Candidate | Tier | Payoff score | Verdict | Reason |
|---|---|---|---|---|---|
| 1 | c1 Pin the Call us button on screen | 2 | 0.1455 | hold | No unique selector confirmed (four phone links); pinning changes layout, so raised from tier 1 to tier 2. |
| 2 | c3 Hero "See the menu" button goes to the plan-call form | 1 | 0.0559 | hold | That button also feeds direct package purchases, which the charter does not count, so a drop in sales would go unseen. |
| 3 | c2 Hero "Book a free call" as a button (existing suggestion 46912) | 1 | 0.0517 | pass | The only direct booking path on the first screen is a small link; nothing off-limits. Hover text must be dark. |
| 4 | c4 Three form boxes instead of five | 2 | 0.0326 | hold | More forms likely, but the goal is qualified leads and the removed boxes tell the team what the visitor wants. |
| 5 | c5 Header button on phones (existing suggestion 46910) | 1 | 0.0085 | pass | Phones get no header button. Only 41 phone sessions, and it shares an element with running test 46907. |
| 6 | c6 Headline "A website that brings you calls." | 3 | 0 | fail | Promises a result the owner has not supplied; raised from tier 1 to tier 3. |

All six are flagged below_minimum under the current rules. Decision of the dry run: queue nothing.

## Assumptions, not data

The 6 percent baseline rate, the 35 percent reach estimate for the form, and the lift prior table.

## Re-ranked under the 42-day rule

Plugin 0.4.0 changed the rule: a test's last day is the days projected to reach 100 sessions per version (14 at the least, 42 at the most), and a test can start if that is 42 days or fewer (75 sessions in 14 days or more). Scores recomputed with `payoff.js` (26 checks pass) from the same inputs in `scout-candidates.json`; verdicts are unchanged (the Judge's verdicts do not depend on traffic).

| Rank | Candidate | Tier | Score now | Score before | Days to result | Traffic class | Judge verdict |
|---|---|---|---|---|---|---|---|
| 1 | c1 Pin the Call us button on screen | 2 | 0.1142 | 0.1455 | 23 | decidable | hold |
| 2 | c3 Hero "See the menu" button goes to the plan-call form | 1 | 0.0439 | 0.0559 | 23 | decidable | hold |
| 3 | c2 Hero "Book a free call" as a button (suggestion 46912) | 1 | 0.0406 | 0.0517 | 23 | decidable | pass |
| 4 | c4 Three form boxes instead of five | 2 | 0.0256 | 0.0326 | 23 | decidable | hold |
| 5 | c6 Headline "A website that brings you calls." | 3 | 0.0065 | 0.0083 | 23 | decidable | fail |
| 6 | c5 Header button on phones (suggestion 46910) | 1 | 0.0049 | 0.0085 | 76 | below_minimum | pass |

What changed: five of the six candidates (every one on the whole homepage, 137 sessions) are now `decidable`: each version reaches 100 sessions in 23 days, so a homepage test can finish with a real answer (before, all six were `below_minimum` and could only end "no difference"). The scores are lower than before because they divide by 23 days instead of 14. The order is the same except c6 and c5 swap: c5 (41 phone sessions) would need 76 days, over the 42-day limit, so it stays `below_minimum` and cannot start unless forced. Of the Judge's passed candidates only c2 is both passed and decidable; with the plugin at autonomy `suggest` and an empty charter, nothing is queued by an agent, so the dry-run decision is still to queue nothing, but a person could now queue c2 and it would run 23 days.
