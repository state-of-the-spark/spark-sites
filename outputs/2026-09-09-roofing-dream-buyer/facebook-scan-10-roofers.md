# Roofing Dream Buyer Profile - Facebook Scan of 10 Polk County Roofers

Source list: `outputs/2026-09-08-polk-roofing-leads/polk-roofing-leads.csv` (334 Polk County FL roofing companies, 55 with a Facebook page filled in).

Sample method: `random.seed(20260909)`, `random.sample(fb_list, 10)` where `fb_list` is the 55 companies with a Facebook page. Two of the original 10 returned zero public posts through the scraper (private/blocked), so they were swapped for the next names in the same seeded sequence (`random.sample(fb_list, 11)` then `12)`, keeping the first 10/11 names identical each time - this is what "cap total attempts at 16 pages" refers to). Total attempts: 12 of 16 allowed.

## The 10 companies scanned (with post counts, last ~90 days, up to 30/page)

| # | Company | Facebook page | Posts pulled |
|---|---------|---------------|--------------|
| 1 | 1st Class Roofing, Inc. | facebook.com/1stClassRoofingInc/ | 30 |
| 2 | Mighty Dog Roofing of Central Florida | facebook.com/MightyDogRoofingCentralFlorida/ | 30 |
| 3 | RIG Roofing | facebook.com/RIGroofing/ | 30 |
| 4 | Jack Hall Jr's Construction Aluminum | facebook.com/JackHallJrsConstructionAluminum/ | 30 |
| 5 | Central Florida Exterior Inc. | facebook.com/cfexterior/ | 23 |
| 6 | Skyview Roofing Experts LLC | facebook.com/p/Skyview-Roofing-Experts-61575704142678/ | 18 |
| 7 | K.L. Smith Inc. | facebook.com/klsmith.roofing/ | 18 |
| 8 | JHI Roofing | facebook.com/jhiroofing | 17 |
| 9 | Central Florida Roofing, LLC | facebook.com/p/Central-Florida-Roofing-LLC-100057556355073/ | 12 |
| 10 | Straight Forward Construction | facebook.com/straightforwardcon/ | 2 (thin - only 2 posts existed in the window; kept because the page is public and did return real posts) |

**Swapped out (returned nothing, replaced per instructions):**
- Graham Aluminum & Home Improvement (facebook.com/p/Graham-Aluminum-100068398339799/) - actor error `no_items`, "Empty or private data."
- Merritt Roofing and Construction Inc (facebook.com/p/Merritt-Roofing-And-Construction-Inc-100090185311237/) - same, `no_items`.

Total posts analyzed: **210** (189 had text; 21 were photo/video posts with no caption text).

Raw data: `outputs/2026-09-09-roofing-dream-buyer/facebook-posts-raw.json`
Flat CSV: `outputs/2026-09-09-roofing-dream-buyer/facebook-posts.csv`

---

## 1. What they post about

Categorized by keyword match against post text (189 posts with text; a post can land in more than one category, so percentages do not sum to 100). 63 posts (33%) did not clearly match any category - mostly one-line captions, "Happy [day]!" greetings, or a photo/video with no descriptive text.

| Category | Count | % of posts with text | Example (quoted, under 15 words, attributed) |
|---|---|---|---|
| Weather (seasonal/general weather talk) | 51 | 27% | "September is here, which means cooler weather isn't far behind" - Mighty Dog Roofing |
| Storm/insurance messaging | 35 | 19% | "Storm season is here, and we want to make sure our friends...are ready" - Central Florida Exterior |
| Promotions/financing/free inspection | 32 | 17% | "Contact us today for a free estimate!" - Straight Forward Construction |
| Personal/family/team spotlight | 27 | 14% | "Congratulations to Emory McTeer, our Sales Leader of the Month" - RIG Roofing |
| Finished-job photos | 23 | 12% | "MAKEOVER MONDAY...we just wrapped up this stunning transformation" - Central Florida Roofing |
| Community/charity | 23 | 12% | "We love being able to work right here in our local community" - Central Florida Roofing |
| Reviews/testimonials | 10 | 5% | "Another 5 star review!" - K.L. Smith Inc. |
| Hiring/crew | 4 | 2% | "Looking for a roofer you can actually trust?" - JHI Roofing (recruiting-adjacent, not a job posting) |
| Safety | 2 | 1% | "...understands scale, speed, safety, and precision" - JHI Roofing |
| Complaints about the industry | 1 | 1% | "Storm chasers come and go. Local roofers stay." - Central Florida Roofing |
| Humor/memes | 1 | 1% | "Water has a funny way of traveling before it shows up" - 1st Class Roofing |

No evidence in this sample of: dedicated hiring/job-posting content (the 4 hits above are trust-pitch posts that happen to open with "looking for a roofer," not "we're hiring"), or genuine meme/joke content (the 1 hit is a mild wordplay line in an educational post).

## 2. Hopes, dreams, desires they express

Word-frequency scan across all 189 texted posts:

| Theme word | Occurrences |
|---|---|
| family | 23 |
| trust | 22 |
| community | 20 |
| team | 19 |
| quality | 14 |
| proud | 13 |
| grateful | 9 |
| honor / honored | 13 |
| blessed | 5 |
| craftsmanship | 4 |
| faith | 2 |
| passion | 2 |
| dream | 2 |

Read together, the dominant aspirational themes are: **being trusted as the local, reliable choice** (not the "storm chaser" or out-of-towner), **crew and team pride** (spotlighting individual employees by name), **local community standing** (charity tie-ins, "our neighbors," sponsoring local events), and **craftsmanship/quality as identity**, not just a sales point. Faith language appears but is a minor thread (2 explicit mentions), present enough to note, not enough to call a dominant theme.

Quoted examples:
- "His success reflects more than sales, it reflects our whole team" - RIG Roofing
- "We love being able to work right here in our local community" - Central Florida Roofing
- "Roofing is serious business, but that doesn't mean we take ourselves too seriously" - K.L. Smith Inc.
- "We are so blessed to have been a part of this experience" - Central Florida Exterior

## 3. Fears and frustrations they express

This category had the thinnest direct evidence. Explicit fear/frustration language was rare and almost entirely concentrated in one company's post:

| Theme | Occurrences | Example |
|---|---|---|
| Storm chasers / out-of-town roofers | 1 post (same post repeats the phrase) | "Before You Sign With an Out-of-Town Roofer...Storm chasers come and go. Local roofers stay." - Central Florida Roofing |
| Homeowner price-shopping / trust gap | 1 | "Finding a reliable contractor shouldn't feel like a gamble" - JHI Roofing |
| Roof neglect / "small leak" mentality | 1 | "If you've ever said, 'it's just a small leak, we'll fix it later'..." - (unattributed generic post, company not confidently identifiable from short quote - flagged, not used above as attributed) |

**No evidence in this sample of:** insurance-company frustration stated directly, labor shortage complaints, cash-flow complaints, permit-delay complaints, or direct competitor call-outs by name. This does not mean roofers don't feel these things; it means none of the 10 sampled Facebook pages said so publicly in the last ~90 days. Public Facebook pages are a marketing channel, not a vent channel; frustration language is more likely in private groups, texts, or in-person conversation than in a company's own public post.

## 4. Insider language and exact phrases

Counted across all 210 posts (text only):

| Phrase | Count |
|---|---|
| shingle(s) | 39 |
| metal roof | 29 |
| flashing | 13 |
| free inspection | 12 |
| storm damage | 5 |
| architectural shingle(s) | 4 |
| GAF (brand) | 4 |
| underlayment | 3 |
| warranty | 3 |
| tarp | 3 |
| standing seam | 2 |
| tear-off | 1 |
| Owens Corning (brand) | 1 |

**No evidence in this sample of:** "squares" (as a unit of measure), "drip edge," "adjuster," "supplement," "AOB," "5V metal," "CCC license," "licensed and insured" appearing as an exact phrase, "wind mitigation," or "ridge vent." These sampled pages write in homeowner-facing plain language (roof, leak, shingles, metal roof) rather than trade jargon - the jargon that does appear (flashing, underlayment, standing seam, architectural shingles) is the homeowner-legible layer of the trade, not adjuster/paperwork terms.

## 5. Posting rhythm

- **Days of week (210 posts):** Tuesday 52, Thursday 43, Wednesday 39, Monday 36, Friday 28, Saturday 6, Sunday 6. Posting is a weekday, business-hours habit - weekends are close to silent.
- **Time of day:** heaviest windows are midday to late afternoon - 12pm hour (33 posts) and 1pm hour (36 posts) are the single biggest blocks, with a second smaller bump at 4pm (29) and 7pm (20). Very little posting overnight (a handful of 10pm-midnight posts, likely scheduled/automated).
- **Format mix:** of 210 posts, 46 (22%) were video (Reels/native video), 164 (78%) were photo or text posts. The scraper did not separately flag pure-text vs photo, so "photo or text" is combined; based on manual review most non-video posts carry at least one image (job photos, graphics, or review screenshots).
- **Frequency varies a lot by company:** four of the ten (1st Class, Mighty Dog, RIG, Jack Hall Jr's) hit the 30-post cap in 90 days, i.e., posting several times a week. The bottom of the sample (Central Florida Roofing at 12, Straight Forward at 2) posts far less often - once every week or two, or barely at all.

## 6. Engagement - which post types get the most comments and shares

- **Highest comments:** a "Sales Leader of the Month" employee-spotlight post (RIG Roofing, 9 comments) and a community-partnership post pairing the roofer with a local diner for a charity meal night (1st Class Roofing, 8 comments, 21 shares) top the list. Personal/team-spotlight and community/charity posts out-perform plain finished-job photos on comments.
- **Highest shares:** a free community event post - a "Back to School" giveaway/open house (Skyview Roofing Experts, 30 shares, 60 likes, 5 comments) was the single best-performing post in the whole sample by a wide margin. The next-best shared posts are again the charity/diner post (21 shares) and a "gives back" charity teaser (14 shares), both 1st Class Roofing.
- **Pattern:** posts that give something to the community (an event, a charity tie-in, a giveaway) or spotlight a real person (an employee, a happy customer) consistently out-shared and out-commented plain "here's a roof we finished" photos. Storm/insurance educational posts got decent shares individually (RIG Roofing's metal-roof financing post, 13 shares; Central Florida Exterior's storm-prep post, 10 shares) but rarely drove comments.
- Video posts averaged slightly higher likes than non-video (6.6 vs 4.0 average likes) but comment rates were roughly flat between formats (0.41 vs 0.38 average comments) - video helps reach/likes more than it drives conversation, in this sample.

## 7. Preferred communication clues

| Clue | Posts | Example |
|---|---|---|
| "Call or text" | 9 | "Dealing with roof damage? Call or text us for a free inspection" (paraphrase pattern, several companies) |
| "Give us a call" | 7 | "Storm season is here...give us a call" - Central Florida Exterior |
| "Contact us today" | 7 | "Contact us today for a free estimate!" - Straight Forward Construction |
| Phone number printed directly in the post text | 59 of 210 posts (28%) | Straight Forward Construction prints "863.289.6654" at the end of nearly every caption |
| "Link in bio" / "click the link" | 5 | pointing to a website or booking link |
| "Message us" / "text us" | 3 | Messenger-style CTA |
| "Visit our website" | 1 | |

**Reading:** the phone number is the dominant CTA - printed directly in the caption on more than a quarter of all posts, well ahead of website links or Messenger prompts. "Call or text" (not "call" alone) shows up often enough to be a real preference, not a one-off. Facebook Lives were not observed in this sample (no live-video items in the dataset); video is used, but as pre-recorded Reels, not live broadcasts.

---

## What this means for how we market to them

- Lead with trust and locality, not price. "Trust," "family," "community," and "team" outnumber every price/discount word in what these roofers themselves post - a pitch built on "we help you look like the reliable local guy, not the storm chaser" will land closer to their own language than a pure cost-savings pitch.
- Put a phone number front and center, everywhere. More than a quarter of their own posts end with a bare phone number as the call to action. Any landing page, ad, or funnel built for this niche should treat "call or text" as the primary conversion path, with a form as the backup, not the other way around.
- Community and people beat finished-job photos for engagement. Their own data shows charity tie-ins and employee spotlights out-perform plain "here's a roof we finished" posts on shares and comments. A content plan or ad angle built around "feature their crew and their community involvement" will likely outperform generic before/after roof photo ads for this audience.
- They post on a weekday 9-to-5 rhythm, not a hustle-around-the-clock one. Midday and mid-afternoon on Tuesday through Thursday is when this audience is most active online; that is also a reasonable guess for when they are most reachable for outbound sales calls or when a scheduled ad/post from us will find them scrolling.
- Don't lean on adjuster/insurance jargon to build rapport. This sample almost never used "adjuster," "supplement," "AOB," or "squares" in public posts - those are back-office/trade words, not what they use to talk to homeowners or to their own audience. Homeowner-facing plain language (roof, leak, metal roof, shingles) is what actually shows up; sales and marketing copy aimed at THEM (not their customers) should not assume they respond to heavy insurance jargon as a rapport-builder.
