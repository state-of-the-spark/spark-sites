---
name: google-ads-local-launch
description: Use this skill to set up, build, launch, or create Google Ads for a small business of ANY type that wants to advertise on Google Search — home-services and local companies (landscaper, house cleaner, HVAC, roofer, plumber, contractor), brick-and-mortar storefronts (restaurant, salon, clinic, shop), regional or national lead-gen businesses (consultants, agencies, B2B, professional services), and online businesses. Trigger whenever a business wants to start advertising on Google — phrasings like "run some ads on Google," "advertise my business," "set up Google Ads," "get more calls or leads from Google," "do some PPC," "AdWords," or "get on Google" — including first-timers on a small daily budget (≤$10/day), and "build it and leave it paused for me to review." It classifies the business from its website, then builds the account end-to-end (structure, keywords, negatives, RSAs, geo-targeting, dayparting, conversion tracking) by driving the user's Chrome browser, adapting each step to the business profile. Also use to turn one account's setup into a reusable playbook for other businesses. Do NOT use for Google Business Profile/Maps-only listings with no ad spend, requests that only report on, adjust, or optimize existing campaigns, or Shopping-feed/product-catalog campaign builds (Search campaigns for online sellers are fine; Shopping feeds are a future skill).
---

# Google Ads Launch — Master Skill

You are operating the user's Chrome browser through the **Claude in Chrome** tools to build a Google Ads account for a small business. The playbook adapts to the **business profile** (see "Business profiles" below) — the click-path through Google Ads is the same for everyone; what changes is targeting, keywords, scheduling, and conversion goals. Work methodically, confirm scope before anything goes live, and respect the hard guardrails below. When a placeholder like `[SERVICE]`, `[PRIMARY_CITY]`, `[SERVICE_AREA_RADIUS]`, `[DOMAIN]`, `[PROFILE]`, or `[COMPETITOR_NAME]` appears, substitute the intake values.

---

## Business profiles (classify once, filter every step)

During the Stage 2 research pass, classify the business into ONE profile:

- **LOCAL_SERVICE** — serves a city/radius; the work happens at the customer's location (home services, mobile services, trades).
- **STOREFRONT** — customers come to a physical location (restaurant, salon, clinic, gym, retail shop).
- **REGIONAL_NATIONAL** — sells services beyond a drivable area (consultants, agencies, B2B, professional services, courses).
- **ONLINE_SELLER** — sells products online. Search campaigns for their brand/category work fine at $10/day; **Shopping-feed/product-catalog campaigns are out of scope** — say so plainly, note it as a future skill, and never fake one with a Search build.

Confirm the classification as the FIRST Stage 3 question ("Here's how I read your business — did I get that right?"). Store it as `[PROFILE]`.

**Mid-run question rule:** steps below tagged **[Profile filter]** behave differently per profile. When you reach one and the right choice is not obvious for this business, pause and ask ONE interactive question (AskUserQuestion) at that moment — the same way a permission prompt appears mid-task — with the recommended option first. Never guess silently, and never skip the step silently.

---

## Principles, in priority order

Ordered by leverage — the top items protect the budget and drive lead quality far more than clever ad copy.

1. **Negative keywords are the #1 lever.** Wasted spend, not missing clicks, kills small accounts. Build two layers:
   - **(A) Master shared negative list** — reusable, applied to *every* campaign: competitor brand names, out-of-market/out-of-state geographies, and low-intent qualifiers (free, cheap, DIY, jobs, salary, etc.).
   - **(B) Campaign-specific negatives** — block adjacent services you don't offer (service-mismatch) and specific out-of-area towns.
   - Mix **broad-match negatives** (wide concepts) with **exact-match negatives** (specific phrases you want to block precisely).
2. **Tight account architecture.** One campaign per service line. Naming convention `[Channel] - [Service]` (e.g. `Search - [SERVICE]`, `PMax - [SERVICE]`). One tightly-themed ad group per Search campaign. Structure beats volume.
3. **Lead with Search (control + high intent).** A single Search campaign first. Only add a small Performance Max later to test incremental reach, and keep its budget tiny while it learns.
4. **Precise geo-targeting.** [Profile filter] LOCAL_SERVICE/STOREFRONT: radius around the primary location, OR the metro/DMA, whichever fits the service area. REGIONAL_NATIONAL/ONLINE_SELLER: still start geographically constrained — a test region or handful of states is the cheapest way to learn at $10/day (ask; see step 5). All profiles: use **"Presence"** targeting (people physically *in* the area) — never "presence or interest." Actively **exclude** areas you don't serve, and reinforce with geographic negative keywords.
5. **Tight, on-theme included keywords.** ~4–6 keywords per campaign. **No broad match.** Deliberate **Phrase + Exact** blend — Phrase for head terms, Exact for high-intent variants. [Profile filter] "near me"/city variants belong to LOCAL_SERVICE/STOREFRONT only; REGIONAL_NATIONAL/ONLINE_SELLER swap them for buying-intent qualifiers ("hire", "pricing", "for [AUDIENCE]").
6. **Search network only.** For Search campaigns, turn **OFF** Search Partners and the Display Network. (PMax is cross-network by design — that's expected.)
7. **Dayparting to serviceable hours.** [Profile filter] Applies when phone calls are a lead type or a location has open hours: run during hours someone can actually answer/serve (e.g. ~6 AM–midnight); pause dead overnight hours. Form-only or online businesses can run 24/7 — ask if unclear.
8. **One strong RSA per Search campaign.** Fill all **15 headlines** and **4 descriptions** with distinct, keyword-rich variations. Aim for "Good/Excellent" Ad Strength. Add sitelink/callout/structured-snippet assets pulled from **real, verified** website pages.
9. **Track the conversions that match how this business gets customers**, as primary, across all campaigns. [Profile filter] LOCAL_SERVICE: calls + forms. STOREFRONT: calls + direction requests/bookings. REGIONAL_NATIONAL: forms/booked calls. ONLINE_SELLER: purchases (and email signups as secondary). The whole point is the phone ringing, the form filling, or the sale closing.
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

- The **business profile** — classify as LOCAL_SERVICE, STOREFRONT, REGIONAL_NATIONAL, or ONLINE_SELLER (see "Business profiles" above)
- Every **service/offering** they have (these become the options for "which one first")
- The **geography** — city served + plausible nearby towns for local profiles; states/regions or "everywhere" for the others
- The **phone number** and any posted **business hours** (or location hours)
- **Real page URLs** that resolve (for sitelinks and final URLs later — never guess)
- Phrasing, benefits, and trust claims (licensed, insured, free estimates, guarantees) for ad copy
- Likely **adjacent offerings they do NOT have** (campaign-negative candidates)

Tell the user in one line what you're doing ("Taking a quick look at your site so my questions come with answers built in").

### Stage 3 — interactive questionnaire (informed options)

Use the **interactive question tool (AskUserQuestion)** to present the remaining intake as a tap-to-answer questionnaire — small batches (max 4 questions per call), so they page one at a time above the chat. Every question's options come from the Stage 2 research; put the recommended choice FIRST and label it "(Recommended)". The customer can always type into "Something else."

Cover, in roughly this order:

1. **Profile confirm (always first)** — "Here's how I read your business: `[PROFILE]` (one plain-English sentence, e.g. 'a local service company serving the Lakeland area' / 'a consultancy selling nationwide'). Did I get that right?" → "Yes (Recommended)" / the other three profiles as options. Everything downstream keys off this answer.
2. **Which service/offering to launch first** — options = the actual offerings found on their site, most prominent first. This matters: at ≤$10/day the budget realistically runs ONE. Note unpicked ones as a backlog for when budget grows.
3. **Ideal client** — options inferred from the site (e.g. "Residential homeowners (Recommended)" / "Commercial & property managers" / "Both", or B2B vs. B2C equivalents). Shapes keywords, negatives, and copy tone.
4. **What counts as a lead** — options per profile: LOCAL_SERVICE "Phone calls and form submissions (Recommended)" / "Calls only" / "Forms only"; STOREFRONT adds bookings/visits; REGIONAL_NATIONAL leads with forms/booked calls; ONLINE_SELLER leads with purchases.
5. **Target area** — [Profile filter] LOCAL_SERVICE/STOREFRONT: "`[SERVICE_AREA_RADIUS]`-mile radius around `[PRIMARY_CITY]` (Recommended)" / "the `[PRIMARY_CITY]` metro" / "Something else", then follow up with **towns to exclude** (nearby towns from research, multi-select). REGIONAL_NATIONAL/ONLINE_SELLER: "Start with a test region — e.g. `[HOME_STATE]` or your top market (Recommended — cheapest way to learn at $10/day)" / "Target the whole country" / "Something else".
6. **Phone confirm** — "I found `[PHONE]` on your site — is that the number that should ring?" → "Yes (Recommended)" / "No, use a different number". Skip if calls aren't a lead type.
7. **Hours confirm** — confirm the posted hours (drives dayparting), or let them correct. Skip for 24/7 online businesses.
8. **Competitors to exclude** — offer any competitor names surfaced in research as options, plus "Something else" / "Skip".
9. **Which Google Ads account** — only if more than one account is accessible; list the account names as options.

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

5. **Locations + Presence.** [Profile filter]
   - LOCAL_SERVICE/STOREFRONT: set the target as radius `[SERVICE_AREA_RADIUS]` around `[PRIMARY_CITY]`, or the metro/DMA. Add **location exclusions** for towns not served.
   - REGIONAL_NATIONAL/ONLINE_SELLER: set the test region chosen in intake (state/top market). If the customer chose whole-country, set the country — but if intake never settled this, **pause and ask now** (mid-run question): "Limit ads to a test region first, or target the whole country?" with the test region recommended.
   - All profiles: open **Location options** and select **"Presence: People in or regularly in your targeted locations"** — NOT "presence or interest."

6. **Language:** English (add others only if the client serves them).

7. **Budget + bidding.**
   - **Daily budget: `10`** (a plain number, no `$`). Never exceed $10/day. If also running PMax, keep the total ≤ ~$10/day (e.g. Search $10, or split $7/$3).
   - **Bidding:** **Maximize clicks** to gather data (graduate to conversion-based bidding later, once conversions accumulate).

8. **Ad schedule (dayparting).** [Profile filter] If calls are a lead type or a location has open hours: add a schedule covering serviceable hours (default ~**6:00 AM–12:00 AM**, all days); pause dead overnight hours. Form-only or online businesses: run 24/7 (no schedule) unless the customer chose otherwise — if unclear, ask now.

9. **Create the ad group.** One tightly-themed ad group named for `[SERVICE]`.

10. **Add keywords (Phrase + Exact, ~4–6).** No broad match. Use the keyword template below. Head terms in **Phrase** (`"..."`), high-intent variants in **Exact** (`[...]`). [Profile filter] "near me"/city variants for LOCAL_SERVICE/STOREFRONT only; REGIONAL_NATIONAL/ONLINE_SELLER use buying-intent qualifiers instead (see template).

11. **Build the Responsive Search Ad.**
    - Final URL: the most relevant **verified** landing page (service page or homepage).
    - **15 headlines** and **4 descriptions**, all distinct and keyword-rich (see RSA prompts below). Include `[SERVICE]`, `[SERVICE] + [PRIMARY_CITY]`, service variants, benefits, and CTAs.
    - **Ad rotation: Optimize.** Aim for **Good/Excellent** Ad Strength; add headlines until you get there.

12. **Add assets from the real site.** Sitelinks (real URLs from step 1), callouts (e.g. "Licensed & Insured", "Free Estimates" — only if true), and structured snippets. Never invent `/services` or `/about` without confirming they resolve.

13. **Set up conversion tracking (do before or right after launch).** **Goals → Conversions.** [Profile filter] Create/confirm the **Primary** conversion actions that match the profile and intake answer: LOCAL_SERVICE **lead-form submission + phone calls** (calls from ads and/or website call tracking); STOREFRONT calls + bookings/direction requests; REGIONAL_NATIONAL form/booked-call submissions; ONLINE_SELLER purchases (signups secondary). Attach them to your new campaign. **Caution — account-level:** conversion goals apply account-wide, so *add* new actions rather than editing existing goals, and if the account already tracks conversions, confirm with the user before changing any account-default goal (it would affect existing campaigns too). If tag installation on the site is required and you can't complete it safely, flag it for the human.

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

**LOCAL_SERVICE / STOREFRONT:**
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

**REGIONAL_NATIONAL / ONLINE_SELLER** (no "near me"/city — swap in buying-intent qualifiers):
```
Phrase (head terms):
  "[SERVICE]"
  "[SERVICE] for [AUDIENCE]"
  "hire [SERVICE_PROVIDER]" / "buy [PRODUCT]"
Exact (high-intent):
  [[SERVICE] pricing]
  [[SERVICE] company]  /  [best [PRODUCT]]
  [[SERVICE_VARIANT] cost]   (only if buying-intent)
```

Keep it on-theme; if a term serves a different service, it belongs in a different campaign.

### RSA headline prompts (write 15 distinct, ≤30 chars each)
Cover this spread — no duplicates:
- `[SERVICE]` plain (2–3)
- `[SERVICE] in [PRIMARY_CITY]` / local (2–3) — [Profile filter] for REGIONAL_NATIONAL/ONLINE_SELLER swap these for audience/differentiator headlines (`[SERVICE] for [AUDIENCE]`)
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
