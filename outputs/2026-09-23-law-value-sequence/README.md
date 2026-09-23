# Law Firm Value Sequence, review HTML (2026-09-23)

Source copy: `grant-sparks/research/2026-09-23-law-value-sequence.md` (draft, not yet approved by Grant).
Builder: `grant-sparks/tools/niche-bundle/build_value_sequence_preview_law.py` — a law-niche-local copy of the proven roofing builder (`build_value_sequence_preview.py`), with three changes only: the landing URL/utm_campaign in `email_html()` swapped to `https://sparkmysite.com/law-firm-marketing/` / `law-value-sequence`, the `COMPANY` merge-tag fallback text changed from "your roofing company" to "your law firm", and the review page's title/eyebrow/h1/lede/meta/build-note copy rewritten to describe the law offer. All CSS/layout/parsing logic is untouched.

**Mailchimp mode was skipped.** Unlike the roofing sequence (which has real Mailchimp File Manager URLs for its logo and headshot from an earlier approved run), no images for this niche have been uploaded to Mailchimp File Manager yet, and this sequence has not been approved by Grant. Running the builder in `mailchimp` mode today would produce paste-ready email HTML with broken image tags. Re-run `build_value_sequence_preview_law.py <md> <out.html> mailchimp <logo_url> <headshot_url>` once (a) Grant approves the copy and (b) the real logo and headshot are uploaded to Mailchimp File Manager and their URLs are known.

**Logo asset caveat.** No verified black-text Spark Sites wordmark file was found in the repo for this build. The logo used in this review page (`spark-sites-logo-black-text.png` in the build's `SCRATCH` directory) is actually a copy of `reference/brand/spark-brand-system/uploads/spark-sites-logo-animated.png` — the animated/gradient mark, not a real black-text logo. Swap in the correct asset before this goes anywhere client-facing or before running mailchimp mode for real.

**Headshot.** Resized from the canonical `reference/brand/assets/grant-headshot.png` (a rectangular source image) to a 240x240 JPG via Pillow (center-cropped to square, then Lanczos-resized), saved as `grant-headshot-240.jpg` in the build's `SCRATCH` directory.

Build command used:
```
SCRATCH=<scratch dir with spark-sites-logo-black-text.png and grant-headshot-240.jpg>
python grant-sparks/tools/niche-bundle/build_value_sequence_preview_law.py \
  grant-sparks/research/2026-09-23-law-value-sequence.md \
  spark-sites/outputs/2026-09-23-law-value-sequence/preview.html \
  artifact
```
Output: "emails parsed: 15" on the first run, no parse errors.

Screenshot: `preview-screenshot.png` (and any additional numbered screenshots) in this same folder, taken with headless Chrome against `file:///` for visual verification before reporting this done.
