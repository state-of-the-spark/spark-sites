---
name: google-ads-local-launch
description: Use this skill to set up, build, launch, or create Google Ads for a local or home-services small business — landscaper, house cleaner, HVAC, roofer, pressure washer, plumber, contractor, and the like. Trigger whenever such a business wants to start advertising on Google Search — phrasings like "run some ads on Google," "advertise my business," "set up Google Ads," "get more calls or leads from Google," "do some PPC," "AdWords," or "get on Google" — including first-timers on a small daily budget (≤$10/day) covering a city or radius, and "build it and leave it paused for me to review." It builds the account end-to-end (structure, keywords, negatives, RSAs, geo-targeting, dayparting, conversion tracking) by driving the user's Chrome browser. Also use to turn one account's setup into a reusable playbook for other businesses. Do NOT use for national or large e-commerce brands, Google Business Profile/Maps-only listings with no ad spend, or requests that only report on, adjust, or optimize existing campaigns.
---

# Google Ads Local Launch — Master Skill

You are operating the user's Chrome browser through the **Claude in Chrome** tools to build a Google Ads account for a small local business. Work methodically, confirm scope before anything goes live, and respect the hard guardrails below. When a placeholder like `[SERVICE]`, `[PRIMARY_CITY]`, `[SERVICE_AREA_RADIUS]`, `[DOMAIN]`, or `[COMPETITOR_NAME]` appears, substitute the intake values.

---

## Principles, in priority order

Ordered by leverage — the top items protect the budget and drive lead quality far more than clever ad copy.

1. **Negative keywords are the #1 lever.** Wasted spend, not missing clicks, kills small accounts. Build two layers:
   - **(A) Master shared negative list** — reusable, applied to *every* campaign: competitor brand names, out-of-market/out-of-state geographies, and low-intent qualifiers (free, cheap, DIY, jobs, salary, etc.).
   - **(B) Campaign-specific negatives** — block adjacent services you don't offer (service-mismatch) and specific out-of-area towns.
   - Mix **broad-match negatives** (wide concepts) with **exact-match negatives** (specific phrases you want to block precisely).
2. **Tight account architecture.** One campaign per service line. Naming convention `[Channel] - [Service]` (e.g. `Search - [SERVICE]`, `PMax - [SERVICE]`). One tightly-themed ad group per Search campaign. Structure beats volume.
3. **Lead with Search (control + high intent).** A single Search campaign first. Only add a small Performance Max later to test incremental reach, and keep its budget tiny while it learns.
4. **Precise geo-targeting.** Radius around the primary location, OR the metro/DMA, whichever fits the service area. Use **"Presence"** targeting (people physically *in* the area) — never "presence or interest." Actively **exclude** towns you don't serve, and reinforce with geographic negative keywords.
5. **Tight, on-theme included keywords.** ~4–6 keywords per campaign. **No broad match.** Deliberate **Phrase + Exact** blend — Phrase for head terms, Exact for high-intent and "near me" variants.
6. **Search network only.** For Search campaigns, turn **OFF** Search Partners and the Display Network. (PMax is cross-network by design — that's expected.)
7. **Dayparting to serviceable hours.** Run during hours you can actually answer/serve (e.g. ~6 AM–midnight); pause dead overnight hours.
8. **One strong RSA per Search campaign.** Fill all **15 headlines** and **4 descriptions** with distinct, keyword-rich variations. Aim for "Good/Excellent" Ad Strength. Add sitelink/callout/structured-snippet assets pulled from **real, verified** website pages.
9. **Track leads AND calls as primary conversions**, applied across all campaigns. A local business's whole point is the phone ringing and the form filling.
10. **Budget discipline.** ≤ $10/day per campaign, non-negotiable (see Guardrails).

---

## Guided onboarding (three-stage intake)

Run intake as a **guided interview**, never as one bulleted list of questions. The flow: one typed answer, then research, then tap-to-answer questions built from what you learned.

### Stage 1 — one opening question (plain chat, free text)

Ask exactly ONE question in normal chat and wait for the answer:

> "What's your business name and website?"

If they have no website, ask for their Google Business Profile link, or their business type + city. Do not ask anything else yet.

### Stage 2 — silent research pass (before any more questions)

Browse `[DOMAIN]` now, before asking another question. Read the homepage and service pages. Record:

- Every **service** they offer (these become the options for "which service first")
- The **city/area** they serve, and plausible nearby towns (exclusion candidates)
- The **phone number** and any posted **business hours**
- **Real page URLs** that resolve (for sitelinks and final URLs later — never guess)
- Phrasing, benefits, and trust claims (licensed, insured, free estimates) for ad copy
- Likely **adjacent services they do NOT offer** (campaign-negative candidates)

Tell the user in one line what you're doing ("Taking a quick look at your site so my questions come with answers built in").

### Stage 3 — interactive questionnaire (informed options)

Use the **interactive question tool (AskUserQuestion)** to present the remaining intake as a tap-to-answer questionnaire — small batches (max 4 questions per call), so they page one at a time above the chat. Every question's options come from the Stage 2 research; put the recommended choice FIRST and label it "(Recommended)". The customer can always type into "Something else."

Cover, in roughly this order:

1. **Which service to launch first** — options = the actual services found on their site, most prominent first. This matters: at ≤$10/day the budget realistically runs ONE service. Note unpicked services as a backlog for when budget grows.
2. **Ideal client** — e.g. "Residential homeowners (Recommended)" / "Commercial & property managers" / "Both". Shapes keywords, negatives, and copy tone.
3. **What counts as a lead** — "Phone calls and form submissions (Recommended)" / "Calls only" / "Forms only".
4. **Service area** — "`[SERVICE_AREA_RADIUS]`-mile radius around `[PRIMARY_CITY]` (Recommended)" / "the `[PRIMARY_CITY]` metro" / "Something else". Follow up with **towns to exclude**, offering the nearby towns found in research as multi-select options.
5. **Phone confirm** — "I found `[PHONE]` on your site — is that the number that should ring?" → "Yes (Recommended)" / "No, use a different number".
6. **Hours confirm** — confirm the posted hours (drives dayparting), or let them correct.
7. **Competitors to exclude** — offer any competitor names surfaced in research as options, plus "Something else" / "Skip".
8. **Which Google Ads account** — only if more than one account is accessible; list the account names as options.

**Fallback:** if the interactive question tool is not available on the current surface, conduct the same interview **one question per message** in chat, stating the recommended default inline ("just say 'yes' to accept"). Never dump all questions as a single bulleted list.

### Confirmation before building

After the questionnaire, present a short build-plan summary (service, area, budget `$10/day`, lead goals, paused-by-default) and get an explicit go-ahead before touching Google Ads.

If the user can't answer something, note the assumption and continue (defaults: launch the single most prominent service on the site; infer the target audience from the site; both calls + forms; Presence targeting; leave campaigns paused).

---

## Step-by-step deployment (Claude in Chrome)

Follow in order. State what you're doing before each major step. If a screen requires a password, 2FA, or a "Confirm it's you" check, **stop and hand off to the human** (see Guardrails).

1. **Confirm the site research.** The site was browsed during intake Stage 2 — if anything was skipped (deeper service pages, quote/contact/about URLs), finish it now. You need **real** URLs for sitelinks and final URLs (confirm they resolve, never guess), the real phone number, and phrasing/benefits for keywords and ad copy.

2. **Open Google Ads and select the account.** Go to `ads.google.com`. If multiple accounts exist, switch to the correct one (account picker, top right). Confirm the account name back to the user.

3. **Create the Search campaign.** Click **Campaigns → + New campaign**.
   - **Objective:** choose **Leads** (or "Create a campaign without a goal's guidance" if you want full manual control).
   - **Campaign type:** **Search**.
   - **Conversion goals:** ensure lead-form + call goals are attached (set up tracking in step 11 if not yet present).
   - **Campaign name:** `Search - [SERVICE]`.

4. **Turn networks OFF.** In the networks section, **uncheck Search Partners** and **uncheck Display Network**. Google Search only.

5. **Locations + Presence.**
   - Set the target: radius `[SERVICE_AREA_RADIUS]` around `[PRIMARY_CITY]`, or the metro/DMA.
   - Add **location exclusions** for towns not served.
   - Open **Location options** and select **"Presence: People in or regularly in your targeted locations"** — NOT "presence or interest."

6. **Language:** English (add others only if the client serves them).

7. **Budget + bidding.**
   - **Daily budget: `10`** (a plain number, no `$`). Never exceed $10/day. If also running PMax, keep the total ≤ ~$10/day (e.g. Search $10, or split $7/$3).
   - **Bidding:** **Maximize clicks** to gather data (graduate to conversion-based bidding later, once conversions accumulate).

8. **Ad schedule (dayparting).** Add a schedule covering serviceable hours (default ~**6:00 AM–12:00 AM**, all days). Pause dead overnight hours.

9. **Create the ad group.** One tightly-themed ad group named for `[SERVICE]`.

10. **Add keywords (Phrase + Exact, ~4–6).** No broad match. Use the keyword template below. Head terms in **Phrase** (`"..."`), high-intent and "near me"/city variants in **Exact** (`[...]`).

11. **Build the Responsive Search Ad.**
    - Final URL: the most relevant **verified** landing page (service page or homepage).
    - **15 headlines** and **4 descriptions**, all distinct and keyword-rich (see RSA prompts below). Include `[SERVICE]`, `[SERVICE] + [PRIMARY_CITY]`, service variants, benefits, and CTAs.
    - **Ad rotation: Optimize.** Aim for **Good/Excellent** Ad Strength; add headlines until you get there.

12. **Add assets from the real site.** Sitelinks (real URLs from step 1), callouts (e.g. "Licensed & Insured", "Free Estimates" — only if true), and structured snippets. Never invent `/services` or `/about` without confirming they resolve.

13. **Set up conversion tracking (do before or right after launch).** **Goals → Conversions.** Create/confirm two **Primary** conversion actions: **lead-form submission** and **phone calls** (calls from ads and/or website call tracking). Attach them to your new campaign. **Caution — account-level:** conversion goals apply account-wide, so *add* new actions rather than editing existing goals, and if the account already tracks conversions, confirm with the user before changing any account-default goal (it would affect existing campaigns too). If tag installation on the site is required and you can't complete it safely, flag it for the human.

14. **Create and apply negatives.**
    - **Master shared list:** **Tools → Shared library → Negative keyword lists → +**. Name it `Master Negatives`. Paste the starter list below plus competitor names and out-of-market geos. Apply it to the campaign (and every future campaign).
    - **Campaign-specific negatives:** in the campaign's **Negative keywords** panel, add service-mismatch terms and specific out-of-area towns. Mix broad and exact negatives.

15. **Review + leave PAUSED.** Re-check budget (`10`), networks off, Presence on, exclusions, negatives applied, RSA strength, conversions primary. **Leave the campaign paused.** Summarize to the user and ask for explicit go-ahead before enabling.

16. **(Optional) Small Performance Max.** Only if the user wants incremental reach. `+ New campaign → Performance Max`, name `PMax - [SERVICE]`, **Maximize conversions**, tiny budget that keeps the daily total ≤ ~$10, real assets and audience signals. Leave paused. Keep the budget small while it learns.

> **Note:** The new-campaign flow (or the account switch) sometimes triggers identity re-verification or a "Confirm it's you" prompt. If so, pause and hand off — do not attempt to complete it.

---

## Starter master negative keyword list

Generic terms nearly every local/service business should exclude. Add your own competitor and geo terms. Use these as **broad-match** negatives unless noted.

**Employment / DIY / research intent:**
`jobs`, `job`, `careers`, `career`, `hiring`, `hire near me`, `salary`, `salaries`, `wage`, `internship`, `training`, `certification`, `license` (if not a service), `how to`, `how do i`, `do it yourself`, `diy`, `tutorial`, `guide`, `youtube`, `video`

**Price-shopper / low-intent qualifiers:**
`free`, `cheap`, `cheapest`, `discount`, `coupon`, `wholesale`, `bulk`, `used`, `second hand`, `for sale`, `rent to own` (unless relevant), `grants`, `assistance program`

**Wrong-audience / non-buyer:**
`definition`, `meaning`, `what is`, `reddit`, `forum`, `complaints`, `reviews of` (optional), `scam`, `lawsuit`, `association`, `union`, `school`, `course`, `class`

**Placeholder categories to fill from intake:**
- **Competitor brands:** `[COMPETITOR_NAME]` (add each; often exact match).
- **Out-of-market geographies:** out-of-state names, distant cities, and specific `[EXCLUDED_TOWN]` names (mix broad + exact).
- **Service-mismatch / adjacent services not offered:** `[ADJACENT_SERVICE]` for anything the business does NOT do.

---

## Guardrails

- **Build-only — never touch existing campaigns.** This skill *creates* new campaigns. Operate **only** on the campaign(s) you are building in this session. Never edit, pause, enable, rename, restructure, or change the budget, bidding, targeting, or status of any pre-existing campaign, ad group, ad, or keyword in the account. If the account already has live campaigns, leave them exactly as they are. When you must touch an account-level object (conversion actions, shared negative lists), **add** rather than modify, apply it only to your new campaign, and confirm with the user before proceeding — because account-level changes can ripple into existing campaigns.
- **Budget cap — non-negotiable.** Daily budget is **at most $10/day per campaign; default $10**. If Search + PMax both run, keep the **total ≤ ~$10/day**. Enter the budget as a **plain number** (`10`), no currency symbol. If asked to exceed it, stop and confirm in writing.
- **Never handle credentials or identity checks.** Do NOT type passwords, 2FA codes, or complete "Confirm it's you" / identity re-verification. **Pause and ask the human** to do it.
- **Never touch billing or payment methods.** Do not add, edit, or view payment details. If billing isn't set up, flag it for the human.
- **Verify every URL.** Browse `[DOMAIN]` and use only pages that actually resolve for final URLs, sitelinks, and assets. Never fabricate `/services`, `/about`, etc.
- **Leave everything PAUSED by default.** Publish only after the user explicitly says to enable. Confirm scope before anything goes live.
- **Truth in copy.** Only use claims (licensed, insured, free estimates, 24/7) that the user confirms are true.

---

## Templates

### Naming convention
`[Channel] - [Service]` → `Search - [SERVICE]`, `PMax - [SERVICE]`. Ad group = the `[SERVICE]` theme. Shared list = `Master Negatives`.

### Keyword plan (Phrase + Exact, ~4–6, no broad)
```
Phrase (head terms):
  "[SERVICE]"
  "[SERVICE] [PRIMARY_CITY]"
  "[SERVICE] near me"
Exact (high-intent / local):
  [[SERVICE] [PRIMARY_CITY]]
  [[SERVICE] near me]
  [[SERVICE_VARIANT] cost]   (only if buying-intent)
```
Keep it on-theme; if a term serves a different service, it belongs in a different campaign.

### RSA headline prompts (write 15 distinct, ≤30 chars each)
Cover this spread — no duplicates:
- `[SERVICE]` plain (2–3)
- `[SERVICE] in [PRIMARY_CITY]` / local (2–3)
- Service variants / specifics (2–3)
- Benefits: fast, licensed, insured, free estimate, local, experienced (3–4)
- CTAs: "Call Today", "Get a Free Quote", "Book Now" (2–3)

### RSA description prompts (write 4 distinct, ≤90 chars each)
1. What you do + where — `[SERVICE] in [PRIMARY_CITY]. [Key benefit]. Call now.`
2. Trust / differentiator — licensed, insured, years in business, local.
3. Offer / low-friction CTA — free estimates, fast response, easy booking.
4. Coverage / urgency — service area, same-day/quick turnaround, "Call [PHONE]."

---

## Ongoing optimization cadence

Run weekly (hand off as a recurring task if desired):
1. **Search-terms review → add negatives.** The core habit; prune waste every week.
2. **Pause zero-converting spend** — keywords/ads with cost and no conversions.
3. **Scale winners** — shift budget (still ≤ cap) and add close-variant keywords for converters.
4. **Improve Ad Strength** — swap weak headlines toward Good/Excellent.
5. **Graduate bidding** — once enough conversions accrue, move Search from Maximize clicks to a conversion-based strategy.
6. **Re-check geo + schedule** against where real leads come from.
