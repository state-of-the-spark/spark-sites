/*
 * build-ads.mjs - renders Meta feed creatives for the roofer report funnel.
 *
 * Hormozi-style matrix, held deliberately small: one CTA and one meat stay fixed,
 * only the HOOK varies, because the hook does most of the work and the ad set is
 * only running $10/day. Testing more than a handful at that budget teaches nothing.
 *
 * The design is lifted from the report cover (storm photo, caution tape, STOP sign,
 * Quiet Voltage palette) so the ad and the thing it downloads look like one piece.
 * "A State of the Spark company" is deliberately NOT here: Grant removed that from
 * the report, and these are the same family of asset.
 *
 * Usage:
 *   node build-ads.mjs                 reads selected-hooks.json, writes ads/*.html
 *   then render each to PNG with headless Chrome:
 *   chrome --headless --disable-gpu --screenshot=ads/ad-01.png \
 *          --window-size=1080,1350 --virtual-time-budget=6000 file:///.../ads/ad-01.html
 *
 * The fit check: every ad writes data-fit on the content column. Dump the DOM and
 * confirm the gap is >= 0 on all of them before shipping, the same guard print.html
 * uses for the report. A hook that overflows silently gets cropped by Meta.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, 'ads');

// Quiet Voltage
const INK = '#101418';
const CYAN = '#0ECAEB';
const MIST = '#E4E8EA';
const SAFETY = '#F7C600';
const WHITE = '#FFFFFF';

const DISPLAY = "'Hanken Grotesk', 'Helvetica Neue', Helvetica, sans-serif";
const WORDMARK = "'Poppins', 'Helvetica Neue', Helvetica, sans-serif";

// Meta feed 4:5. The single best-performing feed ratio, and it gives the hook room.
const W = 1080;
const H = 1350;

// The storm photo lives with the report. Referenced, not copied, so there is one
// source of truth for it.
const PHOTO = '../../2026-09-11-roofer-report/design/storm.jpg';

const sparkMark = (px) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${px}" height="${px}" style="display:block;flex-shrink:0;"><g transform="rotate(-14 50 50)" fill="${WHITE}"><polygon points="61,48.4 61,51.6 86,52.8 86,47.2"></polygon><polygon transform="rotate(38 50 50)" points="61,48.4 61,51.6 79,52.8 79,47.2"></polygon><polygon transform="rotate(76 50 50)" points="61,48.4 61,51.6 88,52.8 88,47.2"></polygon><polygon transform="rotate(114 50 50)" points="61,48.4 61,51.6 78,52.8 78,47.2"></polygon><polygon transform="rotate(152 50 50)" points="61,48.4 61,51.6 85,52.8 85,47.2"></polygon><polygon transform="rotate(190 50 50)" points="61,48.4 61,51.6 80,52.8 80,47.2"></polygon><polygon transform="rotate(228 50 50)" points="61,48.4 61,51.6 88,52.8 88,47.2"></polygon><polygon transform="rotate(266 50 50)" points="61,48.4 61,51.6 78,52.8 78,47.2"></polygon><polygon transform="rotate(304 50 50)" points="61,48.4 61,51.6 84,52.8 84,47.2"></polygon></g><circle cx="50" cy="50" r="4" fill="${CYAN}"></circle></svg>`;

const stopSign = (px) => `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 100 100" style="display:block;flex-shrink:0;"><polygon points="29.3,2 70.7,2 98,29.3 98,70.7 70.7,98 29.3,98 2,70.7 2,29.3" fill="none" stroke="${WHITE}" stroke-width="3.5"></polygon><polygon points="31.4,7.5 68.6,7.5 92.5,31.4 92.5,68.6 68.6,92.5 31.4,92.5 7.5,68.6 7.5,31.4" fill="none" stroke="${WHITE}" stroke-width="1.2"></polygon><text x="50" y="61" text-anchor="middle" font-family="Hanken Grotesk, Helvetica, sans-serif" font-weight="800" font-size="29" letter-spacing="1" fill="${WHITE}">STOP</text></svg>`;

/*
 * Hook length drives type size. A 40-character hook and a 110-character hook cannot
 * share a font size without one of them looking broken, and auto-fitting in the
 * browser would mean shipping whatever the last render happened to produce.
 */
function hookSize(text) {
  const n = text.length;
  if (n <= 38) return 108;
  if (n <= 55) return 94;
  if (n <= 75) return 82;
  if (n <= 100) return 66;
  return 56;
}

// Typographic apostrophes, without touching any markup.
const smart = (s) => s.replace(/'/g, '’');

function ad({ id, hook, kicker, proof }) {
  const size = hookSize(hook);
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
<div id="ad" style="width:${W}px;height:${H}px;position:relative;overflow:hidden;background:${INK};">

  <img src="${PHOTO}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;filter:grayscale(0.3) contrast(1.05);">
  <!-- A light overall veil keeps the storm legible as a photograph. The gradient scrim
       underneath does the real work of making text readable, but only where text sits.
       A flat 0.66 veil across the whole frame was the first attempt: it washed the sky
       into grey mush and left the top two thirds of the ad dead. -->
  <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(16,20,24,0.34);"></div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:74%;background:linear-gradient(to bottom, rgba(16,20,24,0) 0%, rgba(16,20,24,0.70) 40%, rgba(16,20,24,0.94) 100%);"></div>

  <!-- Caution tape, the warning motif carried from the cover -->
  <div style="position:absolute;top:58px;right:-120px;width:460px;height:58px;transform:rotate(45deg);background:repeating-linear-gradient(-45deg, ${SAFETY} 0 22px, ${INK} 22px 44px);box-shadow:0 8px 20px rgba(0,0,0,0.35);"></div>

  <div id="col" style="position:relative;height:100%;padding:64px;display:flex;flex-direction:column;">

    <div style="display:flex;align-items:center;gap:9px;">
      ${sparkMark(38)}
      <span style="font-family:${WORDMARK};font-weight:600;font-size:25px;letter-spacing:-0.02em;color:${WHITE};">spark sites</span>
    </div>

    <div style="margin-top:10px;font-family:${DISPLAY};font-weight:600;font-size:15px;letter-spacing:0.16em;color:${MIST};text-transform:uppercase;">A free report for Florida roofers</div>

    <div style="margin-top:auto;display:flex;align-items:flex-start;gap:30px;">
      ${stopSign(116)}
      <h1 style="margin:0;font-family:${DISPLAY};font-weight:600;font-size:${size}px;line-height:1.04;letter-spacing:-0.03em;color:${WHITE};text-wrap:balance;">${smart(hook)}</h1>
    </div>

    <p style="margin:26px 0 0;font-family:'Source Serif 4', Georgia, serif;font-size:27px;line-height:1.45;color:${MIST};max-width:820px;">${smart(kicker)}</p>

    <div style="margin-top:30px;display:inline-flex;align-self:flex-start;background:${SAFETY};color:${INK};font-family:${DISPLAY};font-weight:800;font-size:26px;letter-spacing:-0.01em;padding:12px 20px;border-radius:4px;">${smart(proof)}</div>

    <div style="margin-top:34px;font-family:${DISPLAY};font-weight:600;font-size:22px;letter-spacing:0.04em;color:${WHITE};">sparkmysite.com/roofing-report</div>

  </div>
</div>

<script>
/* Fit check: negative gap means the composition overflows and Meta will crop it. */
(function(){
  var col = document.getElementById('col');
  var gap = col.clientHeight - col.scrollHeight;
  col.setAttribute('data-fit', String(gap));
  document.title = '${id} fit=' + gap;
})();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------

const sel = resolve(HERE, 'selected-hooks.json');
if (!existsSync(sel)) {
  console.error('Missing selected-hooks.json. Expected shape:\n' +
    '[{ "id":"ad-01", "hook":"...", "kicker":"...", "proof":"Free. 13 pages." }, ...]');
  process.exit(1);
}

const ads = JSON.parse(readFileSync(sel, 'utf8'));
mkdirSync(OUT, { recursive: true });

for (const a of ads) {
  const file = resolve(OUT, `${a.id}.html`);
  writeFileSync(file, ad(a), 'utf8');
  console.log(`${a.id}  hook=${a.hook.length}ch  size=${hookSize(a.hook)}px  ->  ads/${a.id}.html`);
}
console.log(`\n${ads.length} creatives written to ads/. Render each at ${W}x${H}, then check data-fit >= 0.`);
