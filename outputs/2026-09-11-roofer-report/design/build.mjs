// build.mjs: the Florida Roofer Report, designed in Spark Sites "Quiet Voltage".
// Writes one Claude Design artboard per page (<Name>.dc.html), canvas.json, and print.html
// (all pages, letter size) that headless Chrome turns into the vector PDF.
// Run from this folder: node build.mjs
import fs from 'node:fs';

// Where the roof replacement cost range comes from (sources page, item 2).
const ROOF_COST_URL = 'https://modernize.com/roof/cost-calculator/florida';
const ROOF_COST_NAME = 'Modernize, Average Roof Replacement Cost Florida: 2026 Prices by Type and Material';

// ---------- Quiet Voltage tokens (tokens/spark-sites.css) ----------
const INK = '#101418', POR = '#F7F8F8', CYAN = '#0ECAEB', GRAPH = '#2A3138', MIST = '#E4E8EA', GRAY = '#8A939B', WHITE = '#FFFFFF';
const DISP = "'Hanken Grotesk', 'Helvetica Neue', Helvetica, sans-serif";
const BODY = "'Source Serif 4', Georgia, 'Times New Roman', serif";
const LOGO = "'Poppins', 'Helvetica Neue', Helvetica, sans-serif";
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin=""><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&amp;family=Poppins:wght@600&amp;family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&amp;display=swap">';
const ROOF_URL = 'https://sparkmysite.com/roofing-marketing/?utm_source=roofer-report&amp;utm_medium=pdf&amp;utm_campaign=roofer-report';
const BASE = `*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;} body{margin:0;background:${POR};-webkit-font-smoothing:antialiased;} p,h1,h2{margin:0;} a{color:inherit;text-decoration:underline;text-decoration-color:${GRAY};text-underline-offset:3px;} a:hover{color:${GRAPH};}`;

// ---------- pieces ----------
const RAYS = [[0, 86], [38, 79], [76, 88], [114, 78], [152, 85], [190, 80], [228, 88], [266, 78], [304, 84]];
const mark = (size, ray, dot, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" style="display:block;flex-shrink:0;${extra}"><g transform="rotate(-14 50 50)" fill="${ray}">${RAYS.map(([r, l]) => `<polygon${r ? ` transform="rotate(${r} 50 50)"` : ''} points="61,48.4 61,51.6 ${l},52.8 ${l},47.2"></polygon>`).join('')}</g><circle cx="50" cy="50" r="4" fill="${dot}"></circle></svg>`;
const lockup = (onInk) =>
  `<div style="display:flex;align-items:center;gap:6px;">${mark(30, onInk ? WHITE : INK, CYAN)}<span style="font-family:${LOGO};font-weight:600;font-size:19px;letter-spacing:-0.02em;color:${onInk ? WHITE : INK};">spark sites</span></div>`;
const lockupSmall = (onInk) =>
  `<div style="display:flex;align-items:center;gap:5px;">${mark(18, onInk ? WHITE : INK, CYAN)}<span style="font-family:${LOGO};font-weight:600;font-size:13px;letter-spacing:-0.02em;color:${onInk ? WHITE : INK};">spark sites</span></div>`;
const eyebrow = (text, color) =>
  `<span style="font-family:${DISP};font-weight:600;font-size:12px;letter-spacing:0.14em;color:${color};">${text}</span>`;
const hairline = `<div style="width:44px;height:2px;background:${CYAN};"></div>`;
const B = (t) => `<strong style="font-weight:600;color:${INK};">${t}</strong>`;
const P = (t, extra = '') => `<p style="font-family:${BODY};font-size:17px;line-height:1.55;color:${GRAPH};${extra}">${t}</p>`;
// typographic apostrophes in text nodes only (attributes keep their straight quotes)
const smart = (h) => h.replace(/>([^<]*)</g, (m, t) => '>' + t.replace(/'/g, '’') + '<');
const bullets = (items) =>
  `<div style="display:flex;flex-direction:column;gap:6px;">${items.map((t) => `<div style="display:flex;gap:12px;align-items:flex-start;"><div style="flex-shrink:0;width:6px;height:6px;background:${INK};border-radius:1px;margin-top:10px;"></div>${P(t)}</div>`).join('')}</div>`;
const CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0;margin-top:1px;"><rect x="3" y="3" width="18" height="18" rx="4"></rect><path d="M8 12.5l2.8 2.8L16.5 9"></path></svg>`;
const TICK = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0;margin-top:3px;"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>`;
const SCISSORS = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${GRAY}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0;"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M20 4L8.1 15.9"></path><path d="M14.5 14.5L20 20"></path><path d="M8.1 8.1L12 12"></path></svg>`;
// warning graphics (drawn as SVG, not emoji: consistent on every device and in print)
const SAFETY = '#F7C600'; // safety yellow, used ONLY by cover direction A
const WARN = (size, fill, stroke, mark) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;flex-shrink:0;"><path d="M12 2.8L22.4 20.6H1.6Z" fill="${fill}" stroke="${stroke}" stroke-width="1.4" stroke-linejoin="round"></path><path d="M12 9v5.2" stroke="${mark}" stroke-width="2.2" stroke-linecap="round"></path><circle cx="12" cy="17.4" r="1.3" fill="${mark}"></circle></svg>`;
const STOP = (size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" style="display:block;flex-shrink:0;"><polygon points="29.3,2 70.7,2 98,29.3 98,70.7 70.7,98 29.3,98 2,70.7 2,29.3" fill="none" stroke="${WHITE}" stroke-width="3.5"></polygon><polygon points="31.4,7.5 68.6,7.5 92.5,31.4 92.5,68.6 68.6,92.5 31.4,92.5 7.5,68.6 7.5,31.4" fill="none" stroke="${WHITE}" stroke-width="1.2"></polygon><text x="50" y="61" text-anchor="middle" font-family="Hanken Grotesk, Helvetica, sans-serif" font-weight="800" font-size="29" letter-spacing="1" fill="${WHITE}">STOP</text></svg>`;
// caution-tape stripe down the left edge of every "Do this this week" card (Grant, 2026-09-11)
const callout = (text) =>
  `<div style="position:relative;overflow:hidden;background:${WHITE};border:1px solid ${MIST};border-radius:10px;padding:18px 22px 18px 30px;display:flex;gap:16px;align-items:flex-start;"><div style="position:absolute;top:0;left:0;bottom:0;width:8px;background:repeating-linear-gradient(-45deg, ${SAFETY} 0 7px, ${INK} 7px 14px);"></div>${CHECK}<div style="display:flex;flex-direction:column;gap:6px;"><span style="font-family:${DISP};font-weight:800;font-size:12px;letter-spacing:0.14em;color:${INK};">DO THIS THIS WEEK</span>${P(text)}</div></div>`;
// footer: Grant's name and town on the left, Spark Sites + page number on the right
// (no parent endorsement anywhere in this report: Grant 2026-09-11, "They just need to see Spark Sites")
const footer = (n) =>
  `<div style="margin-top:auto;padding:0 72px 30px;display:flex;align-items:center;gap:16px;"><span style="flex:1;font-family:${DISP};font-size:12px;letter-spacing:0.06em;color:${GRAY};"><span style="font-weight:600;color:${GRAPH};">Grant Sparks</span>&nbsp;&nbsp;Lakeland, Florida</span><a href="${ROOF_URL}" style="font-family:${DISP};font-weight:600;font-size:12px;letter-spacing:0.06em;color:${GRAPH};text-decoration:underline;text-decoration-color:${GRAY};text-underline-offset:3px;">Roofing Marketing</a><span style="flex:1;display:flex;justify-content:flex-end;align-items:center;gap:10px;">${lockupSmall(false)}<span style="font-family:${DISP};font-size:12px;letter-spacing:0.06em;color:${GRAY};">·&nbsp;&nbsp;${String(n).padStart(2, '0')}</span></span></div>`;
const page = (bg, inner) =>
  `<div style="width:816px;height:1056px;background:${bg};position:relative;overflow:hidden;display:flex;flex-direction:column;">${inner}</div>`;
const header = (label) =>
  `<div style="padding:34px 72px 0;display:flex;justify-content:space-between;align-items:center;">${lockup(false)}${eyebrow(label, GRAY)}</div>`;

const truth = ({ n, stat, statSize = 120, caption, title, body, action, pageNo, photo = null, warning = false }) =>
  page(POR, `
<div style="position:relative;overflow:hidden;background:${INK};padding:34px 72px ${warning ? 48 : 40}px;display:flex;flex-direction:column;gap:26px;">
  ${photo ? `<img src="${photo}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;filter:grayscale(0.3);"><div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(16,20,24,0.62);"></div>` : ''}
  <div style="position:relative;display:flex;justify-content:space-between;align-items:center;">${lockup(true)}${warning ? `<div style="display:flex;align-items:center;gap:8px;">${WARN(18, 'none', WHITE, WHITE)}${eyebrow(`WARNING 0${n} OF 08`, WHITE)}</div>` : eyebrow(`TRUTH 0${n} OF 08`, GRAY)}</div>
  <div style="position:relative;display:flex;flex-direction:row;align-items:center;gap:32px;">
    <span style="flex-shrink:0;font-family:${DISP};font-weight:600;font-size:${statSize}px;line-height:1;letter-spacing:-0.04em;color:${CYAN};white-space:nowrap;">${stat}</span>
    <p style="flex:1;min-width:0;max-width:440px;font-family:${BODY};font-size:18px;line-height:1.45;color:${MIST};text-wrap:pretty;hyphens:manual;">${caption}</p>
  </div>
  ${warning ? `<div style="position:absolute;left:0;right:0;bottom:0;height:8px;background:repeating-linear-gradient(-45deg, ${GRAY} 0 9px, ${INK} 9px 18px);"></div>` : ''}
</div>
<div style="padding:30px 72px 0;display:flex;flex-direction:column;gap:14px;">
  <h2 style="font-family:${DISP};font-weight:600;font-size:32px;line-height:1.12;letter-spacing:-0.03em;color:${INK};text-wrap:balance;">${n}. ${title}</h2>
  <div style="display:flex;flex-direction:column;gap:10px;">${body.join('')}</div>
  <div style="margin-top:6px;">${callout(action)}</div>
</div>
${footer(pageNo)}`);

// ---------- pages ----------
const pages = [];

const ORIGINAL_COVER = page(POR, `
<div style="position:absolute;right:-150px;top:-120px;">${mark(560, MIST, MIST)}</div>
<div style="position:relative;padding:48px 72px 0;display:flex;justify-content:space-between;align-items:center;">${lockup(false)}${eyebrow('A FREE REPORT FOR FLORIDA ROOFERS', GRAPH)}</div>
<div style="position:relative;padding:88px 72px 0;display:flex;flex-direction:column;gap:26px;">
  <h1 style="font-family:${DISP};font-weight:600;font-size:64px;line-height:1.04;letter-spacing:-0.035em;color:${INK};max-width:640px;">What your marketing company won't dare tell a Florida roofer.</h1>
  ${hairline}
  <p style="font-family:${BODY};font-size:20px;line-height:1.5;color:${GRAPH};max-width:560px;">Eight truths about leads, agencies, and the 15-year roof rule. From a Lakeland marketing team that would rather tell you than sell you.</p>
</div>
<div style="position:relative;margin-top:auto;background:${INK};padding:40px 72px 34px;display:flex;flex-direction:column;gap:22px;">
  ${eyebrow('INSIDE', GRAY)}
  <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));column-gap:40px;row-gap:16px;">
    ${[
      "You're renting leads, not buying them",
      'The retainer math was never built for you',
      'The monthly report is not results',
      'Three names on a map beat your ad budget',
      'The storm lead goes to whoever answers first',
      'The 15-year roof rule is your opening',
      'Storm chasers are beating you online',
      'Own everything. Make them teach you.',
    ].map((t, i) => `<div style="display:flex;gap:14px;align-items:baseline;"><span style="font-family:${DISP};font-weight:600;font-size:13px;letter-spacing:0.08em;color:${GRAY};">0${i + 1}</span><span style="font-family:${DISP};font-weight:500;font-size:16px;line-height:1.35;color:${WHITE};">${t}</span></div>`).join('')}
  </div>
  <div style="height:1px;background:${GRAPH};"></div>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:24px;"><span style="font-family:${DISP};font-weight:600;font-size:14px;color:${WHITE};">Grant Sparks<span style="font-weight:400;color:${GRAY};">&nbsp;&nbsp;Lakeland, Florida</span></span>${lockup(true)}</div>
</div>`);

pages.push({ name: 'Intro', title: '02 Read This First', html: page(POR, `
${header('READ THIS FIRST')}
<div style="padding:64px 72px 0;display:flex;flex-direction:column;gap:24px;">
  <h2 style="font-family:${DISP};font-weight:600;font-size:44px;line-height:1.08;letter-spacing:-0.03em;color:${INK};max-width:600px;">Nothing in this report is a secret.</h2>
  ${hairline}
  <div style="display:flex;flex-direction:column;gap:16px;max-width:610px;">
    ${[
      "Hey, it's Grant Sparks. I run Spark Sites here in Lakeland. We've been building websites since 2004 and marketing local businesses out of Lakeland since 2013.",
      'I wrote this because I keep having the same conversation with roofers.',
      'Good crew. Great work. Five-star reviews from the people who found them. And a marketing bill that makes no sense: leads rented from a lead service, a monthly agency report nobody can read, and a phone that only really rings after a storm.',
      "Everything in here is stuff the people selling you leads and retainers have no reason to say out loud. So I'll say it.",
    ].map((t) => `<p style="font-family:${BODY};font-size:18px;line-height:1.6;color:${GRAPH};">${t}</p>`).join('')}
  </div>
  <div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:16px;margin-top:8px;">
    ${[['15', 'minutes to read, start to finish'], ['8', 'truths, each ending with one thing to do this week'], ['10', 'questions to ask before you sign with anyone']]
      .map(([n, t]) => `<div style="background:${WHITE};border:1px solid ${MIST};border-radius:10px;padding:18px 18px 20px;display:flex;flex-direction:column;gap:6px;"><span style="font-family:${DISP};font-weight:600;font-size:32px;line-height:1;letter-spacing:-0.03em;color:${INK};">${n}</span><span style="font-family:${BODY};font-size:15px;line-height:1.4;color:${GRAPH};">${t}</span></div>`).join('')}
  </div>
  <div style="display:flex;flex-direction:column;gap:2px;margin-top:8px;"><span style="font-family:${DISP};font-weight:600;font-size:18px;color:${INK};">Grant Sparks</span><span style="font-family:${BODY};font-style:italic;font-size:15px;color:${GRAY};">Spark Sites, Lakeland, Florida</span></div>
</div>
${footer(2)}`) });

const T1 = { n: 1, pageNo: 3,
  stat: '$228',
  caption: 'is what one paid search lead costs a <span style="white-space:nowrap;">home-service</span> business, on average. A shared lead can be sold to as many as 16 contractors.',
  title: "You're not buying leads. You're renting them.",
  body: [
    P('Lead services sell the same homeowner request to several roofers at once. You pay whether you win the job or not, and you race the other roofers to the phone the second it lands.'),
    bullets([
      `Once you count the jobs you lose, a closed job from a shared-lead service costs ${B('$600 to $1,200')}.`,
      `The FTC ordered HomeAdvisor to pay up to ${B('$7.2 million')} after finding it misrepresented the quality, characteristics, and source of its leads.`,
    ]),
    P("But the price isn't the real problem. The day you stop paying, the leads stop. You never owned any of it. You rented a phone number."),
    P('Owned leads come from three things you control: a Google Business Profile in the top three on the map, a steady stream of reviews, and a website that ranks for the towns you serve. They take a few months to build. Then your cost per lead drops toward zero, because nobody is charging you for the click.'),
  ],
  action: "Add up what you paid lead services in the last 12 months. Divide it by the jobs you actually closed from those leads. That's your real cost per job. Measure every marketing decision against that number.",
};
pages.push({ name: 'Truth1', title: '03 Truth 1: Renting Leads', html: truth(T1) });

pages.push({ name: 'Truth2', title: '04 Truth 2: Retainer Math', html: truth({ n: 2, pageNo: 4,
  stat: '1.1 to 3.3',
  statSize: 80,
  caption: 'roof replacements of revenue, every year, just to cover a $3,000 to $5,000 a month agency retainer.',
  title: 'Their retainer was built for a bigger company than yours.',
  body: [
    P("Traditional marketing agencies quote $3,000 to $5,000 a month. That's $36,000 to $60,000 a year."),
    P('A full roof replacement in Florida runs about $18,000 to $32,000. So the retainer alone eats somewhere between 1.1 and 3.3 roofs of revenue a year. Before shingles. Before the crew. Before dump fees and the net-30 supplier bill. Shingle prices alone are up about 41% since 2020.'),
    P("The tactics agencies sell do work. Ads work. SEO works. Content works. What doesn't work is the budget. It was built for companies with a marketing department and six months of runway, not a one-to-four-crew roofing company making payroll while it waits on an adjuster's check."),
    P(B("That's the math nobody in my industry wants to talk about.")),
  ],
  action: 'Ask any marketing company one question: “How many roof jobs do I need to sell each month to pay you back?” If they can\'t answer in one sentence, they don\'t understand your business.',
}) });

pages.push({ name: 'Truth3', title: '05 Truth 3: Reports vs Results', html: truth({ n: 3, pageNo: 5,
  stat: '4',
  caption: 'numbers tell you whether your marketing works: calls, requests, inspections booked, and jobs sold.',
  title: 'The monthly report is not results.',
  body: [
    P('You know the report. A PDF full of impressions, click-through rates, and graphs that go up and to the right. It looks busy. It tells you almost nothing. A roofer needs four numbers:'),
    `<div style="display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));gap:12px;margin:4px 0;">${['Calls', 'Form and text requests', 'Inspections booked', 'Jobs sold']
      .map((t, i) => `<div style="background:${WHITE};border:1px solid ${MIST};border-radius:10px;padding:14px 14px 16px;display:flex;flex-direction:column;gap:6px;"><span style="font-family:${DISP};font-weight:600;font-size:12px;letter-spacing:0.1em;color:${GRAY};">0${i + 1}</span><span style="font-family:${DISP};font-weight:600;font-size:17px;line-height:1.25;color:${INK};">${t}</span></div>`).join('')}</div>`,
    P(`Here's an insider one. ${B('Calls from your website are not tracked unless someone sets it up on purpose.')} Google's standard analytics does not count a tap on your phone number out of the box. So a lot of roofing sites have no idea how many calls they generate, and a lot of agency reports count what's easy (clicks) instead of what's true (calls).`),
  ],
  action: "Ask whoever runs your marketing for last month's calls, form requests, inspections booked, and jobs sold. If they can't give you the first two, everything else in the report is a guess.",
}) });

pages.push({ name: 'Truth4', title: '06 Truth 4: The Map Pack', html: truth({ n: 4, pageNo: 6,
  stat: '3',
  caption: 'businesses make Google\'s map pack: the short list a homeowner sees first when they search “roofer near me.”',
  title: 'Three names on a map beat your whole ad budget.',
  body: [
    P("That list sits above everything else, and it's where the calls come from, especially the week after a storm. You get into it the boring way, done all the way:"),
    bullets([
      `A ${B('Google Business Profile')} filled out completely and kept active.`,
      `${B('Reviews')} coming in every month, with replies.`,
      `A ${B('website')} whose name, address, and phone match the profile, with one page per service and your towns in the page titles.`,
    ]),
    P("That's also the right order: profile, reviews, a website that converts, and only then ads. Most roofers start with ads and decide marketing doesn't work."),
    P(`Proof from a trade that runs on the same mechanics: when we did exactly this for Superior Spray, a Central Florida pest control company, search traffic climbed ${B('276% in the first 90 days')}, and they hit their annual target in seven months.`),
  ],
  action: 'Fill out your Google Business Profile completely: real hours, every service listed separately, your towns as the service area, and ten photos of real roofs your crew finished. Then text three happy customers for a review today.',
}) });

pages.push({ name: 'Truth5', title: '07 Truth 5: Speed to Lead', html: truth({ n: 5, pageNo: 7,
  stat: '84%',
  caption: "of people hang up on calls from numbers they don't recognize. After a storm, the lead goes to whoever answers first.",
  title: 'The storm lead goes to whoever answers first.',
  body: [
    P("After a storm, a homeowner doesn't call one roofer. They fill out three forms and wait to see who gets back to them."),
    `<div style="display:flex;flex-direction:column;border-top:1px solid ${MIST};margin:2px 0;">${[
      ['People who prefer texting a business over a call or email', '72%'],
      ['Average reply time to a text', 'about 90 seconds'],
      ['Average reply time to an email', 'about 90 minutes'],
    ].map(([k, v]) => `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:24px;padding:10px 0;border-bottom:1px solid ${MIST};">${P(k)}<span style="font-family:${DISP};font-weight:600;font-size:20px;color:${INK};white-space:nowrap;">${v}</span></div>`).join('')}</div>`,
    P('If your website form drops into an inbox you check at 9pm, you lost that lead at 6:15.'),
    P("The fix: every form and every missed call gets a text back within about a minute, day or night, with a simple way to book the inspection. Then when you call, it's from a number they've already seen."),
  ],
  action: "Fill out your own website form tonight, from your phone, like a homeowner would. Time how long it takes for anyone to respond. That's what every one of your leads experiences.",
}) });

pages.push({ name: 'Truth6', title: '08 Truth 6: The 15-Year Rule', html: truth({ n: 6, pageNo: 8,
  stat: '15',
  caption: 'years: the roof age where Florida insurers start asking questions. Under SB 808, a roofer can now do the inspection that answers them.',
  title: 'The 15-year roof rule is the biggest marketing opening in Florida roofing.',
  body: [
    P("Under SB 808, which took effect July 1, 2026, an insurer can't refuse or non-renew a policy just because the roof is older than 15 years if a licensed inspector certifies at least five years of life left. And the law now lets roofing contractors perform that inspection themselves."),
    P("Every Florida homeowner with an aging roof and a letter from their carrier is looking for a roofer who understands the paperwork. Most marketing companies haven't built a single page about it. What to build:"),
    bullets([
      'A page that answers “roof inspection for insurance,” with a button to book one.',
      'Insurance inspections listed as their own service on your Google Business Profile.',
      'Reviews that mention you helped with the insurance side.',
    ]),
    `<p style="font-family:${BODY};font-style:italic;font-size:14px;line-height:1.5;color:${GRAY};">This is marketing, not legal advice. Confirm the specifics with FRSA or your attorney before you promise a homeowner anything.</p>`,
  ],
  action: 'Add “insurance roof inspection” as a service on your Google Business Profile, and write one post explaining the 15-year rule in plain English, with your phone number at the end.',
}) });

pages.push({ name: 'Truth7', title: '09 Truth 7: Storm Chasers', html: truth({ n: 7, pageNo: 9,
  stat: '210',
  caption: "Facebook posts from 10 Polk County roofers, scanned. The one that performed best wasn't a roof.",
  title: 'Storm chasers are beating you online, not on the roof.',
  body: [
    P('Every big storm brings out-of-state crews who show up before local companies can mobilize, sign fast insurance jobs, and leave before the warranty calls start.'),
    P('Being local only wins if the homeowner can see it. In the three seconds they spend on your website or Google profile, a local roofer and a storm chaser look exactly the same.'),
    P('So show them. Your license number. “Locally owned since” and your year. Your towns by name. Real photos of your actual crew. Reviews from their neighbors.'),
    P(`In our scan, the best-performing post was a free back-to-school community event: ${B('60 likes, 30 shares')}. Employee spotlights drew the most comments. Community and crew beat roof photos every time. Storm chasers can't fake that. BAM.`),
  ],
  action: "Put your license number, how long you've been local, and a photo of your real crew at the top of your homepage and on your Google Business Profile.",
}) });

pages.push({ name: 'Truth8', title: '10 Truth 8: Own Everything', html: truth({ n: 8, pageNo: 10,
  stat: '100%',
  caption: "of your domain, website, Google Business Profile, ad accounts, and reviews should be in your name. Not your marketing company's.",
  title: 'You should own everything, and they should teach you.',
  body: [
    P("Some marketing companies keep your website, your domain, your Google profile, and your ad accounts under their own logins. Leave, and you start from zero. That's not a partnership. That's a hostage situation with a monthly invoice."),
    P('Everything should be in your name. Your marketing company gets added as a manager, not an owner.'),
    P("And here's the bigger one. Our industry builds dependence and confusion on purpose. It's how agencies keep clients on retainer for years without the client ever understanding what they're paying for."),
    P('Break that. Hire people who explain what they did, why they did it, and what happened, in plain English, every month.'),
  ],
  action: "Check who's listed as the owner of your domain, your Google Business Profile, and your ad accounts. If it isn't you, fix it this month.",
}) });

const QUESTIONS = [
  ['How many roof jobs do I need to sell each month to pay you back?'],
  ['Who owns my domain, website, Google Business Profile, and ad accounts?'],
  ['Is there a contract? What does it cost me to leave?'],
  ['What numbers will you report every month?', 'The right answer: calls, requests, inspections booked, jobs sold.'],
  ['Are calls from my website tracked? How?'],
  ['How fast does a new lead get a response at 9pm on a Saturday?'],
  ['How will you get me into the top three on the map for my towns?'],
  ['How will you get me new reviews every month without me asking by hand?'],
  ['Are my leads ever shared with another roofer?', 'The right answer: never.'],
  ["Will you teach me what you're doing, in plain English?"],
];
pages.push({ name: 'Checklist', title: '11 Tear-Out Checklist', html: page(POR, `
${header('TEAR-OUT CHECKLIST')}
<div style="padding:40px 72px 0;display:flex;flex-direction:column;gap:18px;">
  <div style="display:flex;align-items:center;gap:10px;">${SCISSORS}<div style="flex:1;border-top:1.5px dashed ${GRAY};"></div></div>
  <h2 style="font-family:${DISP};font-weight:600;font-size:40px;line-height:1.1;letter-spacing:-0.03em;color:${INK};text-wrap:balance;">10 questions to ask any marketing company before you sign.</h2>
  ${hairline}
  ${P('Bring this page to the meeting. If they fumble three or more, keep your checkbook closed.', 'font-size:17px;')}
  <div style="display:flex;flex-direction:column;border-top:1px solid ${MIST};">
    ${QUESTIONS.map(([q, a], i) => `<div style="display:flex;gap:14px;align-items:flex-start;padding:12px 0;border-bottom:1px solid ${MIST};"><div style="flex-shrink:0;width:18px;height:18px;border:1.5px solid ${INK};border-radius:4px;margin-top:3px;"></div><span style="flex-shrink:0;width:24px;font-family:${DISP};font-weight:600;font-size:14px;line-height:24px;color:${GRAY};">${String(i + 1).padStart(2, '0')}</span><div style="display:flex;flex-direction:column;gap:2px;">${P(q)}${a ? `<p style="font-family:${BODY};font-style:italic;font-size:14px;line-height:1.5;color:${GRAY};">${a}</p>` : ''}</div></div>`).join('')}
  </div>
</div>
${footer(11)}`) });

pages.push({ name: 'Offer', title: '12 The Offer', html: page(POR, `
<div style="background:${INK};padding:34px 72px 40px;display:flex;flex-direction:column;gap:22px;">
  <div style="display:flex;justify-content:space-between;align-items:center;">${lockup(true)}${eyebrow('THE ONLY PITCH IN THIS REPORT', GRAY)}</div>
  <h2 style="font-family:${DISP};font-weight:600;font-size:32px;line-height:1.12;letter-spacing:-0.03em;color:${WHITE};text-wrap:balance;">One program for roofers. It answers all ten questions the same way, every time.</h2>
  <div style="display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;"><span style="font-family:${DISP};font-weight:600;font-size:80px;line-height:1;letter-spacing:-0.04em;color:${CYAN};">$297</span><span style="font-family:${DISP};font-weight:500;font-size:20px;color:${WHITE};">a month, all in.</span></div>
  <p style="font-family:${BODY};font-size:17px;line-height:1.5;color:${MIST};">No contracts. 90-day money-back guarantee. We never hold your site hostage.</p>
</div>
<div style="padding:30px 72px 0;display:flex;flex-direction:column;gap:16px;">
  ${eyebrow('SPARK CARE FOR ROOFERS INCLUDES', INK)}
  <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));column-gap:32px;row-gap:14px;">
    ${[
      'A custom roofing website: replacement, repair, and storm pages, plus a quote form that hits your phone.',
      'Google Business Profile management and local SEO for your towns.',
      'Review requests by text the day the job closes, and replies to every review.',
      'AI follow-up that texts every new lead back in about a minute, day or night.',
      'Blog and social content built from your finished jobs.',
      'A dedicated consultant who explains every number in plain English.',
    ].map((t) => `<div style="display:flex;gap:10px;align-items:flex-start;">${TICK}${P(t)}</div>`).join('')}
  </div>
  <div style="margin-top:6px;background:${WHITE};border:1px solid ${MIST};border-radius:10px;padding:18px 22px;display:flex;flex-direction:column;gap:6px;">${eyebrow('NOT SURE IT FITS? ASK FOR THE FREE AUDIT', INK)}${P('We review your website, your Google Business Profile, and your reviews like you already hired us, then hand you the findings either way. No pitch required.')}</div>
  <div style="background:${INK};border-radius:10px;padding:20px 24px;display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;"><a href="tel:+18632251713" style="font-family:${DISP};font-weight:600;font-size:22px;letter-spacing:-0.01em;color:${WHITE};text-decoration:none;">Call or text (863) 225-1713</a><a href="https://sparkmysite.com/roofing-marketing/?utm_source=roofer-report&amp;utm_medium=pdf&amp;utm_campaign=roofer-report" style="font-family:${DISP};font-weight:500;font-size:15px;color:${WHITE};">sparkmysite.com/roofing-marketing</a></div>
  <div style="display:flex;align-items:baseline;gap:10px;margin-top:4px;"><span style="font-family:${BODY};font-style:italic;font-size:16px;color:${GRAPH};">See you on the map,</span><span style="font-family:${DISP};font-weight:600;font-size:18px;color:${INK};">Grant Sparks</span></div>
  <p style="font-family:${BODY};font-style:italic;font-size:14px;line-height:1.5;color:${GRAY};">Adapted from Spark Demand, the upcoming book by Grant Sparks and Nicole Bradham.</p>
</div>
${footer(12)}`) });

const SOURCES = [
  ['Cost per lead for home services, roofing average $228.15.', [['LocaliQ, 2025 Search Ad Benchmarks for Home Services', 'https://localiq.com/blog/home-services-search-advertising-benchmarks/']]],
  ['Florida roof replacement cost, about $18,000 to $32,000 for a typical 1,700 to 2,000 square foot roof.', [[ROOF_COST_NAME, ROOF_COST_URL]]],
  ['Shared Angi leads sold to up to 16 contractors; $600 to $1,200 per closed job.', [['LeadTruffle, The Complete Guide to Angi Leads for Home Service Contractors', 'https://www.leadtruffle.co/blog/complete-guide-angi-leads-home-service-contractors-2026/']]],
  ['HomeAdvisor misrepresented lead quality; up to $7.2 million in redress.', [['Federal Trade Commission order', 'https://www.ftc.gov/system/files/ftc_gov/pdf/Home%20Advisor%20Facts%20Order%20-%20final%20redacted.pdf']]],
  ['Shingle prices up about 41% since 2020.', [['AccuLynx, summarizing the ServiceTitan 2026 Roofing and Exterior Market Report', 'https://acculynx.com/navigating-the-2026-roofing-labor-shortage-scale-without-adding-headcount/']]],
  ['84% hang up on calls from unknown numbers.', [['Mosaicx', 'https://www.mosaicx.com/blog/customers-preferred-contact-method']]],
  ['72% prefer texting a business.', [['Leadferno survey', 'https://leadferno.com/blog/survey-texting-is-the-preferred-way-to-communicate']]],
  ['Text reply about 90 seconds, email about 90 minutes.', [['AccuLynx', 'https://acculynx.com/6-text-messaging-stats/']]],
  ['SB 808 and the 15-year roof rule.', [['Florida House bill detail', 'https://www.flhouse.gov/Sections/Bills/billsdetail.aspx?BillId=83313'], ['Extreme Roofing explainer', 'https://www.extremeroofingmiami.com/blog/florida-sb-808-roof-insurance-law-2026-miami']]],
  ['Storm chasers arriving before local companies mobilize.', [['Roofing Contractor', 'https://www.roofingcontractor.com/articles/102235-the-honest-roofers-playbook-for-post-storm-trust']]],
  ['Facebook scan of 210 posts from 10 Polk County roofers, and the Superior Spray result: Spark Sites internal research and client data, September 2026.', []],
];
pages.push({ name: 'Sources', title: '13 Sources', html: page(POR, `
<div style="padding:34px 72px 0;display:flex;justify-content:flex-end;">${eyebrow('SOURCES', GRAY)}</div>
<div style="padding:28px 72px 0;display:flex;flex-direction:column;gap:18px;">
  <h2 style="font-family:${DISP};font-weight:600;font-size:40px;line-height:1.1;letter-spacing:-0.03em;color:${INK};">Where the numbers come from.</h2>
  <div style="display:flex;flex-direction:column;border-top:1px solid ${MIST};">
    ${SOURCES.map(([claim, links], i) => `<div style="display:flex;gap:14px;align-items:flex-start;padding:9px 0;border-bottom:1px solid ${MIST};"><span style="flex-shrink:0;width:24px;font-family:${DISP};font-weight:600;font-size:13px;line-height:21px;color:${GRAY};">${String(i + 1).padStart(2, '0')}</span><p style="font-family:${BODY};font-size:14px;line-height:1.5;color:${GRAPH};">${claim}${links.length ? ' ' + links.map(([t, u]) => `<a href="${u.replace(/&/g, '&amp;')}">${t}</a>`).join(' and ') : ''}</p></div>`).join('')}
  </div>
</div>
<div style="margin-top:auto;background:${INK};padding:34px 72px 34px;display:flex;flex-direction:column;gap:16px;">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:24px;">${lockup(true)}<span style="font-family:${DISP};font-size:12px;letter-spacing:0.06em;color:${GRAY};"><span style="font-weight:600;color:${WHITE};">Grant Sparks</span>&nbsp;&nbsp;Lakeland, Florida</span></div>
  <p style="font-family:${DISP};font-weight:500;font-size:20px;line-height:1.4;color:${WHITE};">Ready when you are. Call or text <a href="tel:+18632251713" style="text-decoration:none;font-weight:600;">(863) 225-1713</a>, or visit <a href="https://sparkmysite.com/roofing-marketing/?utm_source=roofer-report&amp;utm_medium=pdf&amp;utm_campaign=roofer-report">sparkmysite.com/roofing-marketing</a>.</p>
  <span style="font-family:${DISP};font-size:12px;letter-spacing:0.06em;color:${GRAY};">© 2026 Spark Sites&nbsp;&nbsp;·&nbsp;&nbsp;Lakeland, Florida</span>
</div>`) });

// ---------- warning directions (canvas page 2: "Warning directions") ----------
const directions = [];
const KICKER = 'Eight truths about leads, retainers, and the 15-year roof rule. Read it before you pay for another lead.';
const H1 = (color, size) =>
  `<h1 style="font-family:${DISP};font-weight:600;font-size:${size}px;line-height:1.04;letter-spacing:-0.035em;color:${color};max-width:660px;text-wrap:balance;">What your marketing company won't dare tell a Florida roofer.</h1>`;
const byline = (onInk) =>
  `<div style="margin-top:auto;padding:0 72px 38px;display:flex;align-items:center;gap:20px;"><span style="flex:1;font-family:${DISP};font-weight:600;font-size:14px;color:${onInk ? WHITE : INK};">Grant Sparks<span style="font-weight:400;color:${GRAY};">&nbsp;&nbsp;Lakeland, Florida</span></span><a href="${ROOF_URL}" style="font-family:${DISP};font-weight:600;font-size:13px;letter-spacing:0.04em;color:${onInk ? WHITE : INK};text-decoration:underline;text-decoration-color:${GRAY};text-underline-offset:3px;">Roofing Marketing</a><span style="flex:1;display:flex;justify-content:flex-end;">${lockup(onInk)}</span></div>`;
const bar = (w) => `<span style="display:inline-block;width:${w}px;height:15px;background:${INK};border-radius:2px;vertical-align:-2px;"></span>`;
const mline = (...parts) => `<p style="font-family:${BODY};font-size:16px;line-height:1.6;color:${INK};">${parts.join('')}</p>`;
const mrow = (k, v) =>
  `<span style="font-family:${DISP};font-weight:600;font-size:12px;letter-spacing:0.12em;line-height:24px;color:${GRAY};">${k}</span><span style="font-family:${BODY};font-size:16px;line-height:24px;color:${INK};">${v}</span>`;

directions.push({ name: 'CoverCaution', title: 'A · Caution Label',
  note: 'A · CAUTION LABEL\nReads as a warning from across the room: caution tape, a warning label, then the headline.\nTradeoff: adds safety yellow, a color outside the Spark Sites brand.',
  html: page(POR, `
<div style="position:relative;padding:48px 72px 0;display:flex;justify-content:space-between;align-items:center;">${lockup(false)}${eyebrow('A FREE REPORT FOR FLORIDA ROOFERS', GRAPH)}</div>
<div style="position:relative;margin:44px -60px 0;height:46px;transform:rotate(-2.5deg);background:repeating-linear-gradient(-45deg, ${SAFETY} 0 23px, ${INK} 23px 46px);"></div>
<div style="position:relative;padding:48px 72px 0;display:flex;flex-direction:column;gap:28px;">
  <div style="border:3px solid ${INK};border-radius:10px;overflow:hidden;background:${WHITE};">
    <div style="background:${SAFETY};padding:12px 20px;display:flex;align-items:center;gap:14px;border-bottom:3px solid ${INK};">${WARN(34, INK, INK, SAFETY)}<span style="font-family:${DISP};font-weight:800;font-size:28px;letter-spacing:0.22em;color:${INK};">CAUTION</span></div>
    <p style="padding:16px 20px 18px;font-family:${DISP};font-weight:600;font-size:21px;line-height:1.35;color:${INK};">This report contains things your marketing company would rather you never read.</p>
  </div>
  ${H1(INK, 76)}
  <p style="font-family:${BODY};font-size:22px;line-height:1.5;color:${GRAPH};max-width:600px;">${KICKER}</p>
</div>
${byline(false)}`) });

directions.push({ name: 'CoverRedacted', title: 'B · Redacted File',
  note: 'B · REDACTED FILE\nThe most on-brand option: ink, porcelain, one cyan stamp. A leaked agency memo with the good parts blacked out sells the "won\'t dare tell" promise.\nTradeoff: quieter than A or C at thumbnail size.',
  html: page(INK, `
<div style="position:relative;padding:48px 72px 0;display:flex;justify-content:space-between;align-items:center;">${lockup(true)}${eyebrow('A FREE REPORT FOR FLORIDA ROOFERS', GRAY)}</div>
<div style="position:relative;padding:60px 72px 0;">
  <div style="background:${POR};border-radius:6px;padding:26px 30px 28px;transform:rotate(-1.5deg);box-shadow:0 24px 48px rgba(0,0,0,0.45);display:flex;flex-direction:column;gap:14px;">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;">${eyebrow('INTERNAL MEMO', INK)}${eyebrow('DO NOT FORWARD TO CLIENTS', GRAY)}</div>
    <div style="height:1px;background:${MIST};"></div>
    <div style="display:grid;grid-template-columns:64px minmax(0, 1fr);row-gap:4px;">${mrow('TO', 'Florida roofers')}${mrow('FROM', 'Your marketing company')}${mrow('RE', 'Things we would rather you never find out')}</div>
    <div style="height:1px;background:${MIST};"></div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${mline('Your leads also went to ', bar(150), '.')}
      ${mline(bar(230), ' is not in the monthly report.')}
      ${mline('Our retainer costs you ', bar(64), ' roofs a year.')}
      ${mline('Your website is registered to ', bar(170), '.')}
      ${mline(bar(310), ' ', bar(130))}
    </div>
  </div>
  <div style="position:absolute;right:40px;bottom:-26px;transform:rotate(-9deg);border:3px solid ${CYAN};border-radius:8px;padding:8px 16px;background:${INK};font-family:${DISP};font-weight:800;font-size:24px;letter-spacing:0.2em;color:${CYAN};">CONFIDENTIAL</div>
</div>
<div style="position:relative;padding:52px 72px 0;display:flex;flex-direction:column;gap:22px;">
  ${H1(WHITE, 58)}
  <p style="font-family:${BODY};font-size:20px;line-height:1.5;color:${MIST};max-width:580px;">${KICKER}</p>
</div>
${byline(true)}`) });

// THE COVER (Grant picked C, Storm Warning, 2026-09-11): stop sign + line up in the clouds,
// a short strip of caution tape across the top-right corner at 45 degrees.
pages.unshift({ name: 'Main', title: '01 Cover',
  html: page(POR, `
<div style="position:relative;height:540px;overflow:hidden;background:${INK};">
  <img src="storm.jpg" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;filter:grayscale(0.3) contrast(1.05);">
  <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(16,20,24,0.48);"></div>
  <div style="position:relative;padding:48px 72px 0;display:flex;align-items:center;">${lockup(true)}</div>
  <div style="position:relative;padding:50px 72px 0;display:flex;flex-direction:column;gap:18px;">
    ${eyebrow('A FREE REPORT FOR FLORIDA ROOFERS', MIST)}
    <div style="display:flex;align-items:center;gap:26px;">${STOP(120)}<p style="font-family:${DISP};font-weight:600;font-size:32px;line-height:1.18;letter-spacing:-0.02em;color:${WHITE};max-width:420px;">Read this before you pay for another lead!</p></div>
  </div>
  <div style="position:absolute;top:40px;right:-78px;width:320px;height:46px;transform:rotate(45deg);background:repeating-linear-gradient(-45deg, ${SAFETY} 0 18px, ${INK} 18px 36px);box-shadow:0 6px 16px rgba(0,0,0,0.35);"></div>
</div>
<div style="padding:44px 72px 0;display:flex;flex-direction:column;gap:22px;">
  ${H1(INK, 56)}
  ${hairline}
  <p style="font-family:${BODY};font-size:20px;line-height:1.5;color:${GRAPH};max-width:580px;">Eight truths about leads, retainers, and the 15-year roof rule. From a Lakeland marketing team that would rather tell you than sell you.</p>
</div>
${byline(false)}`) });

directions.push({ name: 'TruthWarning', title: 'D · Inside Page, Warning Theme',
  note: 'D · INSIDE PAGES (optional)\nCarries the warning theme through the report: a photo behind each big number, "Warning 01" instead of "Truth 01," and a caution stripe under the band. Shown on Truth 1 with an AI-generated storm-tarp photo.',
  html: truth({ ...T1, photo: 'tarp.jpg', warning: true }) });

directions.push({ name: 'CoverOriginal', title: 'Previous Cover',
  note: 'PREVIOUS COVER\nThe calm version from before the warning pass. Kept for reference.',
  html: ORIGINAL_COVER });

// ---------- write artboards, canvas.json, print.html ----------
for (const p of [...pages, ...directions]) {
  fs.writeFileSync(`${p.name}.dc.html`, `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  ${FONTS}
  <style>${BASE}</style>
</helmet>
${smart(p.html).trim()}
</x-dc>
</body>
</html>
`);
}
const canvas = {
  pages: [{ id: 'page-1', name: 'Report' }, { id: 'page-2', name: 'Other directions' }],
  artboards: [
    ...pages.map((p, i) => ({ file: `${p.name}.dc.html`, title: p.title, x: (i % 4) * 912, y: Math.floor(i / 4) * 1216, w: 816, h: 1056, print: 'fixed', page: 'page-1' })),
    ...directions.map((p, i) => ({ file: `${p.name}.dc.html`, title: p.title, x: i * 912, y: 0, w: 816, h: 1056, print: 'fixed', page: 'page-2' })),
  ],
  annotations: directions.map((p, i) => ({ id: `dir-note-${i + 1}`, x: i * 912, y: -300, w: 816, text: p.note, page: 'page-2' })),
  launch: { view: 'canvas', page: 'page-1' },
};
fs.writeFileSync('canvas.json', JSON.stringify(canvas, null, 2));

const pageHtml = pages.map((p) => `<div class="pg" data-name="${p.name}">${smart(p.html)}</div>`).join('\n');
fs.writeFileSync('print.html', `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE} @page{size:8.5in 11in;margin:0;} html,body{margin:0;padding:0;} .pg{break-after:page;} .pg:last-child{break-after:auto;}</style></head><body>
${pageHtml}
<script>
// Fit check: after the real fonts load, report any page whose content runs past 1056px.
document.fonts.ready.then(() => setTimeout(() => {
  const out = [...document.querySelectorAll('.pg')].map((pg) => {
    // gap = free space between the last content block and the footer / closing block (the page's slack)
    const root = pg.firstElementChild; const kids = [...root.children];
    const last = kids[kids.length - 1], prev = kids[kids.length - 2];
    const gap = prev ? Math.round(last.getBoundingClientRect().top - prev.getBoundingClientRect().bottom) : 0;
    return pg.dataset.name + ':' + Math.round(root.scrollHeight) + ':gap' + gap;
  });
  document.body.setAttribute('data-fit', out.join('|'));
  document.body.setAttribute('data-fonts', [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.weight + ' ' + f.style).join(','));
}, 500));
</script>
</body></html>`);
const dirHtml = directions.map((p) => `<div class="pg" data-name="${p.name}">${smart(p.html)}</div>`).join('\n');
fs.writeFileSync('print-directions.html', fs.readFileSync('print.html', 'utf8').replace(pageHtml, dirHtml));
console.log('wrote', pages.length + directions.length, 'artboards + canvas.json + print.html + print-directions.html');
