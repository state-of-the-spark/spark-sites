/*
 * build-ads.mjs - renders Meta creatives for the law firm "40% Problem" report funnel.
 *
 * Cloned from spark-sites/outputs/2026-09-13-roofer-ads/build-ads.mjs. Same discipline:
 * one CTA and one meat stay fixed (see README.md), only the HOOK varies across the ship
 * set, because the hook does most of the work and this is a small test budget.
 *
 * Departure from the roofer clone: the roofing "caution tape + STOP sign" motif was
 * roofing/storm specific and doesn't fit a law firm. It's replaced with a "40%" stat
 * badge, the report's own headline number, which plays the same visual role (a bold
 * graphic anchor above the hook) without borrowing an unrelated hazard motif.
 *
 * Also new vs. the roofer clone: renders THREE aspect ratios per ad (Meta feed 4:5,
 * square 1:1, and Stories/Reels 9:16), and each ad can carry its own background photo
 * via the "image" field in selected-hooks.json (the roofer clone used one fixed photo).
 *
 * Usage:
 *   node build-ads.mjs                 reads selected-hooks.json, writes ads/*.html
 *   then render each to PNG with headless Chrome, e.g.:
 *   chrome --headless --disable-gpu --screenshot="ABSOLUTE\path\ads\ad-01-H26.png" \
 *          --window-size=1080,1350 --virtual-time-budget=6000 file:///ABS/ads/ad-01-H26.html
 *
 * The fit check: every ad writes data-fit on the content column. Dump the DOM and
 * confirm the gap is >= 0 on all of them before shipping. A hook that overflows
 * silently gets cropped by Meta.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, 'ads');

// Quiet Voltage (Spark Sites brand, same tokens as the roofer ad clone)
const INK = '#101418';
const CYAN = '#0ECAEB';
const MIST = '#E4E8EA';
const SAFETY = '#F7C600';
const WHITE = '#FFFFFF';

const DISPLAY = "'Hanken Grotesk', 'Helvetica Neue', Helvetica, sans-serif";
const WORDMARK = "'Poppins', 'Helvetica Neue', Helvetica, sans-serif";

// The four law images live with the report, referenced not copied, one source of truth.
const PHOTO_DIR = '../../2026-09-23-law-40-percent-report/design';

// Three canvases: Meta feed 4:5 (primary), square 1:1, Stories/Reels 9:16.
const SIZES = [
  { key: '',        w: 1080, h: 1350, label: '4:5 feed' },
  { key: '-1x1',    w: 1080, h: 1080, label: '1:1 square' },
  { key: '-story',  w: 1080, h: 1920, label: '9:16 story' },
];

const sparkMark = (px) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${px}" height="${px}" style="display:block;flex-shrink:0;"><g transform="rotate(-14 50 50)" fill="${WHITE}"><polygon points="61,48.4 61,51.6 86,52.8 86,47.2"></polygon><polygon transform="rotate(38 50 50)" points="61,48.4 61,51.6 79,52.8 79,47.2"></polygon><polygon transform="rotate(76 50 50)" points="61,48.4 61,51.6 88,52.8 88,47.2"></polygon><polygon transform="rotate(114 50 50)" points="61,48.4 61,51.6 78,52.8 78,47.2"></polygon><polygon transform="rotate(152 50 50)" points="61,48.4 61,51.6 85,52.8 85,47.2"></polygon><polygon transform="rotate(190 50 50)" points="61,48.4 61,51.6 80,52.8 80,47.2"></polygon><polygon transform="rotate(228 50 50)" points="61,48.4 61,51.6 88,52.8 88,47.2"></polygon><polygon transform="rotate(266 50 50)" points="61,48.4 61,51.6 78,52.8 78,47.2"></polygon><polygon transform="rotate(304 50 50)" points="61,48.4 61,51.6 84,52.8 84,47.2"></polygon></g><circle cx="50" cy="50" r="4" fill="${CYAN}"></circle></svg>`;

// The "40%" badge replaces the roofer clone's STOP sign: same job (a bold graphic
// anchor above the hook), but it's the report's own number instead of a borrowed motif.
const statBadge = (px) => `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 140 140" style="display:block;flex-shrink:0;"><circle cx="70" cy="70" r="66" fill="none" stroke="${WHITE}" stroke-width="3.5"></circle><circle cx="70" cy="70" r="58" fill="none" stroke="${WHITE}" stroke-width="1.2"></circle><text x="70" y="80" text-anchor="middle" font-family="Hanken Grotesk, Helvetica, sans-serif" font-weight="800" font-size="44" letter-spacing="-1" fill="${WHITE}">40%</text></svg>`;

/*
 * Hook length drives type size. Base sizes are tuned for the 1350-tall feed canvas;
 * shorter canvases (square, story-cropped-by-width) scale down proportionally so the
 * same hook doesn't blow past the frame on a narrower or shorter composition.
 */
function hookSize(text, h) {
  const n = text.length;
  let base;
  if (n <= 38) base = 112;
  else if (n <= 55) base = 98;
  else if (n <= 75) base = 82;
  else if (n <= 100) base = 68;
  else base = 58;
  return Math.round(base * (h / 1350));
}

// Typographic apostrophes and quotes, without touching any markup.
const smart = (s) => s.replace(/'/g, '’');

function ad({ id, hook, kicker, proof, image }, size) {
  const { w, h } = size;
  const fSize = hookSize(hook, h);
  const scale = h / 1350;
  const pad = Math.round(64 * scale);
  const photo = `${PHOTO_DIR}/${image}`;
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Poppins:wght@600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600&display=swap">
<style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  body{margin:0;background:${INK};-webkit-font-smoothing:antialiased;}
</style>
</head>
<body>
<div id="ad" style="width:${w}px;height:${h}px;position:relative;overflow:hidden;background:${INK};">

  <img src="${photo}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;filter:grayscale(0.25) contrast(1.05);">
  <!-- A light overall veil keeps the photo legible. The gradient scrim underneath does
       the real work of making text readable, same two-layer technique as the roofer
       clone: a flat wash across the whole frame plus a top-down gradient where the
       copy actually sits. -->
  <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(16,20,24,0.36);"></div>
  <div style="position:absolute;left:0;right:0;top:0;height:${Math.round(h*0.8)}px;background:linear-gradient(to bottom, rgba(16,20,24,0.90) 0%, rgba(16,20,24,0.78) 45%, rgba(16,20,24,0) 100%);"></div>

  <div id="col" style="position:relative;height:100%;padding:${pad}px;display:flex;flex-direction:column;">

    <div style="display:flex;align-items:center;gap:9px;">
      ${sparkMark(Math.round(38*scale))}
      <span style="font-family:${WORDMARK};font-weight:600;font-size:${Math.round(25*scale)}px;letter-spacing:-0.02em;color:${WHITE};">spark sites</span>
    </div>

    <div style="margin-top:${Math.round(10*scale)}px;font-family:${DISPLAY};font-weight:600;font-size:${Math.round(15*scale)}px;letter-spacing:0.16em;color:${MIST};text-transform:uppercase;">A free report for Florida law firms</div>

    <!-- Same layout principle as the roofer clone: everything sits HIGH, in the top
         band of the photo, never anchored to the bottom where a face or desk could
         fight the headline. The stat badge sits above the headline, not beside it,
         so the type gets the full width of the frame. -->
    <div style="margin-top:${Math.round(38*scale)}px;">${statBadge(Math.round(104*scale))}</div>

    <h1 style="margin:${Math.round(26*scale)}px 0 0;font-family:${DISPLAY};font-weight:600;font-size:${fSize}px;line-height:1.05;letter-spacing:-0.03em;color:${WHITE};text-wrap:balance;">${smart(hook)}</h1>

    <p style="margin:${Math.round(30*scale)}px 0 0;font-family:'Source Serif 4', Georgia, serif;font-size:${Math.round(31*scale)}px;line-height:1.45;color:${MIST};max-width:880px;">${smart(kicker)}</p>

    <div style="margin-top:${Math.round(34*scale)}px;display:inline-flex;align-self:flex-start;background:${SAFETY};color:${INK};font-family:${DISPLAY};font-weight:800;font-size:${Math.round(30*scale)}px;letter-spacing:-0.01em;padding:${Math.round(14*scale)}px ${Math.round(22*scale)}px;border-radius:4px;">${smart(proof)}</div>

    <div style="margin-top:${Math.round(32*scale)}px;margin-bottom:auto;font-family:${DISPLAY};font-weight:600;font-size:${Math.round(26*scale)}px;letter-spacing:0.04em;color:${WHITE};">sparkmysite.com/law-firm-report</div>

  </div>
</div>

<script>
/* Fit check: negative gap means the composition overflows and Meta will crop it. */
(function(){
  var col = document.getElementById('col');
  var gap = col.clientHeight - col.scrollHeight;
  col.setAttribute('data-fit', String(gap));
  document.title = '${id}${size.key} fit=' + gap;
})();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------

const sel = resolve(HERE, 'selected-hooks.json');
if (!existsSync(sel)) {
  console.error('Missing selected-hooks.json. Expected shape:\n' +
    '[{ "id":"ad-01-H26", "hook":"...", "kicker":"...", "proof":"...", "image":"attorney-answering-lead.webp" }, ...]');
  process.exit(1);
}

const ads = JSON.parse(readFileSync(sel, 'utf8'));
mkdirSync(OUT, { recursive: true });

for (const a of ads) {
  for (const size of SIZES) {
    const file = resolve(OUT, `${a.id}${size.key}.html`);
    writeFileSync(file, ad(a, size), 'utf8');
    console.log(`${a.id}${size.key}  (${size.label})  hook=${a.hook.length}ch  ->  ads/${a.id}${size.key}.html`);
  }
}
console.log(`\n${ads.length * SIZES.length} creatives written to ads/ (${ads.length} ads x ${SIZES.length} sizes). Render each, then check data-fit >= 0.`);
