// build.mjs: The 40% Problem (Florida law firms), designed in Spark Sites "Quiet Voltage".
// Cloned from ../../2026-09-11-roofer-report/design/build.mjs (2026-09-23).
// Writes one Claude Design artboard per page (<Name>.dc.html), canvas.json, and print.html
// (all pages, letter size) that headless Chrome turns into the vector PDF.
// Run from this folder: node build.mjs
import fs from 'node:fs';

// ---------- Quiet Voltage tokens (tokens/spark-sites.css) ----------
const INK = '#101418', POR = '#F7F8F8', CYAN = '#0ECAEB', GRAPH = '#2A3138', MIST = '#E4E8EA', GRAY = '#8A939B', WHITE = '#FFFFFF';
const SAFETY = '#F7C600'; // caution-tape yellow, used only by the "DO THIS THIS WEEK" callout stripe
const DISP = "'Hanken Grotesk', 'Helvetica Neue', Helvetica, sans-serif";
const BODY = "'Source Serif 4', Georgia, 'Times New Roman', serif";
const LOGO = "'Poppins', 'Helvetica Neue', Helvetica, sans-serif";
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin=""><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&amp;family=Poppins:wght@600&amp;family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&amp;display=swap">';
const LAW_URL = 'https://sparkmysite.com/law-firm-marketing/?utm_source=law-report&amp;utm_medium=pdf&amp;utm_campaign=law-40-percent-report';
const PHONE_TEL = 'tel:+18632251713';
const PHONE_TXT = '(863) 225-1713';
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
// a plain two-column row table (label / value), border-top then border-bottom per row (Truth1, Truth2)
const table = (rows) =>
  `<div style="display:flex;flex-direction:column;border-top:1px solid ${MIST};margin:2px 0;">${rows.map(([k, v]) => `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:24px;padding:10px 0;border-bottom:1px solid ${MIST};">${P(k)}<span style="font-family:${DISP};font-weight:600;font-size:20px;color:${INK};white-space:nowrap;">${v}</span></div>`).join('')}</div>`;
// 4-up stat-card grid (Truth8: the four numbers a firm needs)
const cards4 = (items) =>
  `<div style="display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));gap:12px;margin:4px 0;">${items.map((t, i) => `<div style="background:${WHITE};border:1px solid ${MIST};border-radius:10px;padding:14px 14px 16px;display:flex;flex-direction:column;gap:6px;"><span style="font-family:${DISP};font-weight:600;font-size:12px;letter-spacing:0.1em;color:${GRAY};">0${i + 1}</span><span style="font-family:${DISP};font-weight:600;font-size:16px;line-height:1.25;color:${INK};">${t}</span></div>`).join('')}</div>`;
const CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0;margin-top:1px;"><rect x="3" y="3" width="18" height="18" rx="4"></rect><path d="M8 12.5l2.8 2.8L16.5 9"></path></svg>`;
const TICK = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0;margin-top:3px;"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>`;
const SCISSORS = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${GRAY}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0;"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M20 4L8.1 15.9"></path><path d="M14.5 14.5L20 20"></path><path d="M8.1 8.1L12 12"></path></svg>`;
// caution-tape stripe down the left edge of every "Do this this week" card (kept from the roofer report system)
const callout = (text) =>
  `<div style="position:relative;overflow:hidden;background:${WHITE};border:1px solid ${MIST};border-radius:10px;padding:18px 22px 18px 30px;display:flex;gap:16px;align-items:flex-start;"><div style="position:absolute;top:0;left:0;bottom:0;width:8px;background:repeating-linear-gradient(-45deg, ${SAFETY} 0 7px, ${INK} 7px 14px);"></div>${CHECK}<div style="display:flex;flex-direction:column;gap:6px;"><span style="font-family:${DISP};font-weight:800;font-size:12px;letter-spacing:0.14em;color:${INK};">DO THIS THIS WEEK</span>${P(text)}</div></div>`;
// footer: Grant's name and town on the left, Spark Sites + page number on the right
const footer = (n) =>
  `<div style="margin-top:auto;padding:0 72px 30px;display:flex;align-items:center;gap:16px;"><span style="flex:1;font-family:${DISP};font-size:12px;letter-spacing:0.06em;color:${GRAY};"><span style="font-weight:600;color:${GRAPH};">Grant Sparks</span>&nbsp;&nbsp;Lakeland, Florida</span><a href="${LAW_URL}" style="font-family:${DISP};font-weight:600;font-size:12px;letter-spacing:0.06em;color:${GRAPH};text-decoration:underline;text-decoration-color:${GRAY};text-underline-offset:3px;">Law Firm Marketing</a><span style="flex:1;display:flex;justify-content:flex-end;align-items:center;gap:10px;">${lockupSmall(false)}<span style="font-family:${DISP};font-size:12px;letter-spacing:0.06em;color:${GRAY};">·&nbsp;&nbsp;${String(n).padStart(2, '0')}</span></span></div>`;
const byline = (onInk) =>
  `<div style="margin-top:auto;padding:0 72px 38px;display:flex;align-items:center;gap:20px;"><span style="flex:1;font-family:${DISP};font-weight:600;font-size:14px;color:${onInk ? WHITE : INK};">Grant Sparks<span style="font-weight:400;color:${GRAY};">&nbsp;&nbsp;Lakeland, Florida</span></span><a href="${LAW_URL}" style="font-family:${DISP};font-weight:600;font-size:13px;letter-spacing:0.04em;color:${onInk ? WHITE : INK};text-decoration:underline;text-decoration-color:${GRAY};text-underline-offset:3px;">Law Firm Marketing</a><span style="flex:1;display:flex;justify-content:flex-end;">${lockup(onInk)}</span></div>`;
const page = (bg, inner) =>
  `<div style="width:816px;height:1056px;background:${bg};position:relative;overflow:hidden;display:flex;flex-direction:column;">${inner}</div>`;
const header = (label) =>
  `<div style="padding:34px 72px 0;display:flex;justify-content:space-between;align-items:center;">${lockup(false)}${eyebrow(label, GRAY)}</div>`;

const truth = ({ n, stat, statSize = 120, caption, title, body, action, pageNo }) =>
  page(POR, `
<div style="position:relative;overflow:hidden;background:${INK};padding:34px 72px 40px;display:flex;flex-direction:column;gap:26px;">
  <div style="position:relative;display:flex;justify-content:space-between;align-items:center;">${lockup(true)}${eyebrow(`TRUTH 0${n} OF 08`, GRAY)}</div>
  <div style="position:relative;display:flex;flex-direction:row;align-items:center;gap:32px;">
    <span style="flex-shrink:0;font-family:${DISP};font-weight:600;font-size:${statSize}px;line-height:1;letter-spacing:-0.04em;color:${CYAN};white-space:nowrap;">${stat}</span>
    <p style="flex:1;min-width:0;max-width:440px;font-family:${BODY};font-size:18px;line-height:1.45;color:${MIST};text-wrap:pretty;hyphens:manual;">${caption}</p>
  </div>
</div>
<div style="padding:30px 72px 0;display:flex;flex-direction:column;gap:14px;">
  <h2 style="font-family:${DISP};font-weight:600;font-size:32px;line-height:1.12;letter-spacing:-0.03em;color:${INK};text-wrap:balance;">${n}. ${title}</h2>
  <div style="display:flex;flex-direction:column;gap:10px;">${body.join('')}</div>
  <div style="margin-top:6px;">${callout(action)}</div>
</div>
${footer(pageNo)}`);

// ---------- pages ----------
const pages = [];

// 01 Cover: a big "40%" / "picked up" treatment over an attorney-with-phone photo.
pages.push({ name: 'Main', title: '01 Cover', html: page(POR, `
<div style="position:relative;height:540px;overflow:hidden;background:${INK};">
  <img src="attorney-phone-files.webp" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:center 30%;filter:grayscale(0.35) contrast(1.05);">
  <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(16,20,24,0.6);"></div>
  <div style="position:relative;padding:48px 72px 0;display:flex;align-items:center;">${lockup(true)}</div>
  <div style="position:relative;padding:58px 72px 0;display:flex;flex-direction:column;gap:20px;">
    ${eyebrow('A FREE REPORT FOR FLORIDA LAW FIRMS', MIST)}
    <div style="display:flex;align-items:center;gap:30px;">
      <span style="flex-shrink:0;font-family:${DISP};font-weight:600;font-size:150px;line-height:1;letter-spacing:-0.045em;color:${CYAN};">40%</span>
      <p style="font-family:${DISP};font-weight:600;font-size:25px;line-height:1.28;letter-spacing:-0.015em;color:${WHITE};max-width:290px;">of law firms even picked up the phone in a 2024 study.</p>
    </div>
  </div>
</div>
<div style="padding:42px 72px 0;display:flex;flex-direction:column;gap:20px;">
  <h1 style="font-family:${DISP};font-weight:600;font-size:60px;line-height:1.02;letter-spacing:-0.035em;color:${INK};max-width:640px;">The 40% Problem</h1>
  ${hairline}
  <p style="font-family:${BODY};font-size:19px;line-height:1.5;color:${GRAPH};max-width:580px;">Where Florida law firms lose clients before the first consultation. Eight truths about intake, Google, directories, and the Bar rules, from a Lakeland marketing team that would rather tell you than sell you.</p>
</div>
${byline(false)}`) });

pages.push({ name: 'Intro', title: '02 Read This First', html: page(POR, `
${header('READ THIS FIRST')}
<div style="padding:56px 72px 0;display:flex;flex-direction:column;gap:22px;">
  <h2 style="font-family:${DISP};font-weight:600;font-size:42px;line-height:1.08;letter-spacing:-0.03em;color:${INK};max-width:610px;">Nothing in this report is a secret.</h2>
  ${hairline}
  <div style="display:flex;flex-direction:column;gap:14px;max-width:610px;">
    ${[
      "Hey, it's Grant Sparks. I run Spark Sites here in Lakeland. We've been building websites since 2004 and marketing local businesses out of Lakeland since 2013, including family law, criminal defense, and general practice firms right here in Polk County.",
      'I wrote this because of one number. In 2024, a research firm posed as potential clients and contacted 500 law firms across the United States. Only 40% of them answered the phone. Five years earlier, it was 56%.',
      "That's the 40% problem. It isn't a lawyering problem. Every attorney I know is good at the work. It's a front-door problem, and it quietly costs small firms more than any marketing bill they've ever paid.",
      "It's just stuff the people selling you directory listings and retainers have no reason to say out loud. So I'll say it.",
    ].map((t) => P(t, 'font-size:17px;line-height:1.55;')).join('')}
  </div>
  <div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:16px;margin-top:6px;">
    ${[['15', 'minutes to read, start to finish'], ['8', 'truths, each ending with one thing to do this week'], ['10', 'questions to ask before you sign with anyone']]
      .map(([n, t]) => `<div style="background:${WHITE};border:1px solid ${MIST};border-radius:10px;padding:18px 18px 20px;display:flex;flex-direction:column;gap:6px;"><span style="font-family:${DISP};font-weight:600;font-size:32px;line-height:1;letter-spacing:-0.03em;color:${INK};">${n}</span><span style="font-family:${BODY};font-size:15px;line-height:1.4;color:${GRAPH};">${t}</span></div>`).join('')}
  </div>
  <p style="font-family:${BODY};font-style:italic;font-size:14px;line-height:1.5;color:${GRAY};max-width:610px;margin-top:2px;">A note up front: you know the Florida Bar rules far better than we do. This is marketing, not legal advice. Where the rules touch your marketing, we point to them so you can make the call.</p>
  <div style="display:flex;flex-direction:column;gap:2px;margin-top:4px;"><span style="font-family:${DISP};font-weight:600;font-size:18px;color:${INK};">Grant Sparks</span><span style="font-family:${BODY};font-style:italic;font-size:15px;color:${GRAY};">Spark Sites, Lakeland, Florida</span></div>
</div>
${footer(2)}`) });

pages.push({ name: 'Truth1', title: '03 Truth 1: Six in Ten Don’t Pick Up', html: truth({ n: 1, pageNo: 3,
  stat: '40%',
  caption: 'of law firms nationwide answered the phone when a 2024 study posed as potential clients. Down from 56% in 2019.',
  title: "Six in ten firms don't pick up.",
  body: [
    P('Here’s what that 2024 study found when it contacted 500 law firms across the United States:'),
    table([
      ['Firms that answered the phone', '40%'],
      ['Firms that never answered or called back', '48%'],
      ['Firms that replied to an email inquiry', '33%'],
    ]),
    P('Now think about who is calling. Someone was just arrested, or served, or told their marriage is over. They are scared, and they don’t call one lawyer. They call three, and they hire the first one who calls back and sounds like they know what to do next.'),
    P(`If your phone goes to voicemail at 12:15 while your assistant is at lunch, that person may already be sitting in ${B('another firm’s conference room by 2:00')}.`),
  ],
  action: "Call your own firm at 12:15 and again at 5:45, from a number your staff won't recognize. Then fill out your website's contact form at 9pm. Write down what happened each time. That's what every new client experiences.",
}) });

pages.push({ name: 'Truth2', title: '04 Truth 2: The Missed Click', html: truth({ n: 2, pageNo: 4,
  stat: '$239',
  statSize: 100,
  caption: 'is roughly what one missed call already cost you in ad money, once you count the clicks that never turned into anyone reaching you.',
  title: 'Every missed call is a paid click you threw away.',
  body: [
    P('Legal clicks are some of the most expensive in all of advertising. Here’s what one Google click costs in the US right now:'),
    table([
      ['“family law attorney near me”', '$8.25'],
      ['“divorce lawyer near me”', '$8.56'],
      ['“lawyer near me”', '$11.55'],
      ['“criminal defense lawyer near me”', '$16.73'],
      ['“DUI lawyer near me”', '$23.88'],
      ['“personal injury lawyer near me”', '$131.33'],
    ]),
    P(`And a click isn’t a call. On average, only about 7 of every 100 legal ad clicks turn into an inquiry at all. So a $16.73 click works out to roughly ${B('$239 for every person who actually reaches out')}. Then that person calls, and the phone rings out. This is why so many attorneys say ads don’t work. The ads worked. The front door didn’t.`),
  ],
  action: "Ask your phone provider for last month's call log. Count the calls that went to voicemail or were never returned. Multiply that number by $239. That's roughly what the missed calls would have cost you in ad money.",
}) });

pages.push({ name: 'Truth3', title: '05 Truth 3: Know Your Client Value', html: truth({ n: 3, pageNo: 5,
  stat: '7%',
  caption: 'of paid legal ad clicks turn into an inquiry at all. The close rate on those inquiries is the lever almost nobody pulls.',
  title: "Know what one client is worth before you decide what marketing costs.",
  body: [
    P('Most small firms have never done this math, so here it is with real Florida numbers. Typical flat fees Florida criminal defense firms publish:'),
    bullets([
      `Misdemeanor: ${B('$1,000 to $3,500')}`,
      `First-offense DUI: ${B('$2,500 to $7,500')}, often around $3,500`,
      `Third-degree felony drug charge: ${B('$3,500 to $10,000')}`,
    ]),
    P(`And for family law, a contested Florida divorce commonly runs ${B('$5,000 to $20,000 or more')}. If about 7% of clicks become inquiries, and a small firm turns 8% to 15% of paid inquiries into clients, one new criminal defense client from Google Ads costs around ${B('$1,400 to $3,000')}. Against a $3,500 DUI fee, that still works. Barely.`),
    P(`Here’s the lever almost nobody pulls: ${B('the close rate')}. Answer faster and you close more of the same inquiries. That lowers your cost per client without spending another dollar on ads.`),
    `<p style="font-family:${BODY};font-style:italic;font-size:14px;line-height:1.5;color:${GRAY};">These are illustrative numbers built from published averages, not a prediction for your firm. Your own fees and close rate are the ones that matter.</p>`,
  ],
  action: 'Write down your average fee for your most common matter, and how many consultations it took you to sign your last ten clients. That’s your close rate. Every marketing decision should be measured against those two numbers.',
}) });

pages.push({ name: 'Truth4', title: '06 Truth 4: Speed to First Reply', html: truth({ n: 4, pageNo: 6,
  stat: '60',
  caption: 'seconds: how fast a missed-call text should reach someone who just tried to reach your firm.',
  title: "You don't need a bigger front desk. You need a faster first reply.",
  body: [
    P('The fix for the 40% problem isn’t hiring someone to sit by the phone all day. It’s making sure no one who reaches out ever hears nothing. Here’s what that looks like done well:'),
    bullets([
      `${B('Missed call?')} Within about a minute, the caller gets a short, professional text: sorry we missed you, we’ll call you back shortly, and what’s the best time to reach you.`,
      `${B('Website form or email?')} An instant reply confirms you got it, asks two or three simple questions, and offers a consultation time.`,
      `${B('Your team gets the alert')} on their phones, and a real person at your firm makes the callback.`,
    ]),
    P(`Two rules keep this safe. The automatic replies ${B('never discuss the matter')}, and ${B('your firm approves every word')} before anything goes live. You still handle conflicts, confidentiality, and the actual conversation, like you always have.`),
  ],
  action: "Write the two sentences you'd want a scared stranger to read one minute after calling your office and getting no answer. Keep it warm, plain, and free of anything about their case. That's your missed-call text.",
}) });

pages.push({ name: 'Truth5', title: '07 Truth 5: Directories Rent You Clients', html: truth({ n: 5, pageNo: 7,
  stat: '$14,000',
  statSize: 78,
  caption: 'a year: what some firms report spending once every legal directory add-on is added up.',
  title: 'Legal directories rent you your own clients.',
  body: [
    P('Directories aren’t evil. A free, claimed profile on Avvo, Justia, or the Florida Bar’s own directory is worth ten minutes of your time.'),
    P(`The paid packages are a different story. Avvo’s paid tiers start around $49 to $100 a month, and the bigger all-in-one legal marketing contracts often lock small firms in for 12 to 24 months. One Connecticut firm sued Thomson Reuters after paying more than ${B('$28,000')} on a $2,336-a-month FindLaw contract and never getting its promised new website launched.`),
    P('The real problem is the same as renting leads in any business: the day you stop paying, it stops. You never owned any of it. You were renting a spot on someone else’s website, right next to your competitors.'),
  ],
  action: "Add up everything you paid directories and legal marketing platforms in the last 12 months. Divide by the clients you can actually trace back to them. If you can't trace any, that's your answer.",
}) });

pages.push({ name: 'Truth6', title: '08 Truth 6: The Map Pack', html: truth({ n: 6, pageNo: 8,
  stat: '3',
  caption: 'names Google shows first in the map pack, above everything else, when someone searches “divorce lawyer near me.”',
  title: 'Three names on a map beat your whole ad budget.',
  body: [
    P('That short local list is where the calls come from. You get into it the boring way, done all the way:'),
    bullets([
      `A ${B('Google Business Profile')} filled out completely, with every practice area listed as its own service.`,
      `${B('Reviews')} coming in every month, with replies.`,
      `A ${B('website')} with one page per practice area, your towns in the page titles, and a name, address, and phone that match your Google profile exactly.`,
    ]),
    P(`There’s a new front door too. People now ask ChatGPT and other AI assistants “who’s a good DUI lawyer in Lakeland?” Those tools lean on the same signals: clear practice-area pages, consistent listings, and reviews. That’s also the right order to market a law firm: ${B('profile, reviews, practice-area pages, a fast first reply, and only then paid ads')}.`),
  ],
  action: "Open your Google Business Profile. Add each practice area as its own service, set your service area to the counties you actually cover, and upload five real photos of your office and your team.",
}) });

pages.push({ name: 'Truth7', title: '09 Truth 7: Ask for Reviews the Right Way', html: truth({ n: 7, pageNo: 9,
  stat: '20',
  caption: 'days before many paid legal ads must be filed with the Florida Bar before they run.',
  title: 'You can ask for reviews. Just do it the way the Bar allows.',
  body: [
    P('Plenty of attorneys never ask for reviews because they’re not sure what’s allowed. So nothing happens, and the firm down the street with 140 reviews gets the call. Here’s how the Bar’s advertising rules touch this, in plain English (check the rules yourself; this is marketing, not legal advice):'),
    bullets([
      `${B('Testimonials')} (Rule 4-7.13) have to be a real client’s own experience, not written or edited by you, and the client can’t receive anything of value for giving it.`,
      `${B('Results.')} Don’t imply a guaranteed or predictable outcome. Past results need a clear disclaimer right next to them.`,
      `${B('“Expert” and “specialist”')} (Rule 4-7.14) are off-limits unless you’re actually Board Certified in that area. “Focuses on” and “practices in” are safe.`,
      `${B('Filing.')} Your website and blog are exempt from the Bar’s filing requirement, though the content still has to follow the rules. Many paid ads must be filed at least 20 days before they run.`,
    ]),
    P('For reviews, ask every satisfied client the same way, at the same moment (usually when the matter closes), with a direct link and nothing offered in return. When you reply, thank them without confirming they were a client or saying anything about the matter.'),
  ],
  action: "Pick the moment in your process when clients are happiest, usually the day their matter closes. Make asking for a Google review a standard step at that moment, with a text containing your direct review link.",
}) });

pages.push({ name: 'Truth8', title: '10 Truth 8: Own Everything', html: truth({ n: 8, pageNo: 10,
  stat: '4',
  caption: 'numbers a small firm needs every month: calls, inquiries, consultations booked, and clients signed.',
  title: 'You should own everything, and they should explain it.',
  body: [
    P('Some marketing companies keep your website, your domain, your Google Business Profile, and your ad accounts under their own logins. Leave, and you start from zero. That’s not a partnership. That’s a hostage situation with a monthly invoice.'),
    P('Everything should be in your firm’s name: the domain, the website, the Google Business Profile, the ad accounts, the reviews. Your marketing company should be added as a manager, not an owner.'),
    P('And they should tell you what they did, why they did it, and what happened, in plain English, every month. A small firm needs four numbers:'),
    cards4(['Calls', 'Inquiries', 'Consultations booked', 'Clients signed']),
    P(`A report full of impressions and click-through rates is ${B('not results')}.`),
  ],
  action: "Check who is listed as the owner of your domain, your Google Business Profile, and your ad accounts. If it isn't your firm, fix it this month.",
}) });

const QUESTIONS = [
  ['How many new clients do I need each month to pay you back?'],
  ['Who owns my domain, website, Google Business Profile, and ad accounts?'],
  ['How long is the contract, and what does it cost me to leave?'],
  ['What four numbers will you report every month?', 'The right answer: calls, inquiries, consultations, clients signed.'],
  ['Are calls from my website tracked? How?'],
  ['What happens when someone calls my firm at 6pm on a Friday and nobody answers?'],
  ['How will you get me into the top three on the map for my practice areas and towns?'],
  ['How will you get me new reviews every month in a way that fits the Bar rules?'],
  ['Do you work with my direct competitors in my county?', 'The right answer: never.'],
  ["Will you explain what you're doing, in plain English?"],
];
pages.push({ name: 'Checklist', title: '11 Tear-Out Checklist', html: page(POR, `
${header('TEAR-OUT CHECKLIST')}
<div style="padding:40px 72px 0;display:flex;flex-direction:column;gap:18px;">
  <div style="display:flex;align-items:center;gap:10px;">${SCISSORS}<div style="flex:1;border-top:1.5px dashed ${GRAY};"></div></div>
  <h2 style="font-family:${DISP};font-weight:600;font-size:38px;line-height:1.1;letter-spacing:-0.03em;color:${INK};text-wrap:balance;">10 questions to ask any marketing company before you sign.</h2>
  ${hairline}
  ${P('Bring this page to the meeting. If they fumble three or more, keep your checkbook closed.', 'font-size:17px;')}
  <div style="display:flex;flex-direction:column;border-top:1px solid ${MIST};">
    ${QUESTIONS.map(([q, a], i) => `<div style="display:flex;gap:14px;align-items:flex-start;padding:11px 0;border-bottom:1px solid ${MIST};"><div style="flex-shrink:0;width:18px;height:18px;border:1.5px solid ${INK};border-radius:4px;margin-top:3px;"></div><span style="flex-shrink:0;width:24px;font-family:${DISP};font-weight:600;font-size:14px;line-height:24px;color:${GRAY};">${String(i + 1).padStart(2, '0')}</span><div style="display:flex;flex-direction:column;gap:2px;">${P(q)}${a ? `<p style="font-family:${BODY};font-style:italic;font-size:14px;line-height:1.5;color:${GRAY};">${a}</p>` : ''}</div></div>`).join('')}
  </div>
</div>
${footer(11)}`) });

pages.push({ name: 'Offer', title: '12 The Offer', html: page(POR, `
<div style="background:${INK};padding:32px 72px 34px;display:flex;flex-direction:column;gap:18px;">
  <div style="display:flex;justify-content:space-between;align-items:center;">${lockup(true)}${eyebrow('THE ONLY PITCH IN THIS REPORT', GRAY)}</div>
  <h2 style="font-family:${DISP};font-weight:600;font-size:29px;line-height:1.14;letter-spacing:-0.03em;color:${WHITE};text-wrap:balance;">One program for law firms. It answers all ten questions the same way, every time.</h2>
  <div style="display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;"><span style="font-family:${DISP};font-weight:600;font-size:50px;line-height:1;letter-spacing:-0.04em;color:${CYAN};">$4,500</span><span style="font-family:${DISP};font-weight:500;font-size:17px;color:${WHITE};">setup, then $0/mo until your first inquiry, then $750/mo.</span></div>
  <p style="font-family:${BODY};font-size:15px;line-height:1.5;color:${MIST};">Month to month. Ad spend is separate and goes straight to Google. We work with one firm per practice area in each county.</p>
</div>
<div style="padding:24px 72px 0;display:flex;flex-direction:column;gap:13px;">
  ${eyebrow('THE SPARK SITES LAW FIRM PROGRAM INCLUDES', INK)}
  <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));column-gap:32px;row-gap:12px;">
    ${[
      'A custom attorney website with a page for every practice area, your bios, your reviews, and a short consultation form, built with the Bar’s advertising rules in mind.',
      'A fast first reply: missed calls get a text back in about a minute, forms get an instant reply that books the consultation. Your firm approves every word.',
      'Google Business Profile management and local SEO for your towns and practice areas.',
      'Review requests at the right moment, with replies that never discuss the matter.',
      'Monthly content shoots at your office. You give us about an hour; we plan, film, and edit everything else.',
      'A dedicated marketing consultant who explains every number in plain English.',
    ].map((t) => `<div style="display:flex;gap:10px;align-items:flex-start;">${TICK}${P(t, 'font-size:15px;line-height:1.48;')}</div>`).join('')}
  </div>
  <div style="margin-top:4px;background:${WHITE};border:1px solid ${MIST};border-radius:10px;padding:16px 20px;display:flex;flex-direction:column;gap:5px;">${eyebrow('WANT TO SEE YOUR OWN NUMBER FIRST? ASK FOR THE FREE INTAKE SPEED TEST', INK)}${P('With your permission, we’ll call your firm and fill out your website form after hours, then send you exactly how long it took to hear back, plus a review of your website and Google profile. No pitch required.', 'font-size:15px;')}</div>
  <p style="font-family:${BODY};font-size:15px;line-height:1.5;color:${GRAPH};margin-top:2px;">And we don’t hold sites hostage. If you ever leave, we help you take everything with you.</p>
  <div style="background:${INK};border-radius:10px;padding:18px 22px;display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;"><a href="${PHONE_TEL}" style="font-family:${DISP};font-weight:600;font-size:21px;letter-spacing:-0.01em;color:${WHITE};text-decoration:none;">Call or text ${PHONE_TXT}</a><a href="${LAW_URL}" style="font-family:${DISP};font-weight:500;font-size:14px;color:${WHITE};">sparkmysite.com/law-firm-marketing</a></div>
  <div style="display:flex;align-items:baseline;gap:10px;margin-top:2px;"><span style="font-family:${BODY};font-style:italic;font-size:16px;color:${GRAPH};">See you on the map,</span><span style="font-family:${DISP};font-weight:600;font-size:18px;color:${INK};">Grant Sparks</span></div>
  <p style="font-family:${BODY};font-style:italic;font-size:14px;line-height:1.5;color:${GRAY};">Adapted from Spark Demand, the upcoming book by Grant Sparks and Nicole Bradham.</p>
</div>
${footer(12)}`) });

const SOURCES = [
  ['Law firm secret-shopper results (40% answered, down from 56% in 2019; 48% never answered or returned calls; 33% replied to email).', [['Clio 2024 Legal Trends Report, as summarized by 2Civility, Illinois Supreme Court Commission on Professionalism', 'https://www.2civility.org/2024-clio-legal-trends-report-fixing-the-first-impression-problem-for-law-firms/']]],
  ['Cost per click for legal searches.', [['Semrush keyword data, US database, September 2026', '']]],
  ['Legal search ads: about 7% click-to-inquiry conversion.', [['LocaliQ Legal Search Advertising Benchmarks', 'https://localiq.com/blog/legal-search-advertising-benchmarks/']]],
  ['Law firm lead-to-client close rates, 8% to 15% for paid search (industry estimate).', [['LEXGRO, Law Firm Lead Conversion Benchmarks', 'https://lexgro.com/insights/law-firm-lead-conversion-benchmarks/']]],
  ['Florida criminal defense fees.', [['Litvack Law Group', 'https://litvacklawgroup.com/how-much-does-a-criminal-defense-lawyer-cost-in-florida/'], ['Lotter Law', 'https://lotterlaw.com/blog/dui-lawyer-cost-orlando/'], ['Ansara Law', 'https://www.ansaralaw.com/how-much-does-a-florida-criminal-defense-lawyer-cost.html']]],
  ['Florida divorce costs.', [['HelloDivorce', 'https://hellodivorce.com/divorce-in-florida/cost-of-divorce'], ['Cheshire Family Law', 'https://www.cheshirefamilylaw.com/blog/2025/september/how-much-does-a-divorce-cost-in-florida-/']]],
  ['Directory pricing (published by the directory itself).', [['Martindale-Avvo', 'https://www.martindale-avvo.com/blog/determining-the-roi-of-legal-directory-advertising/']]],
  ['FindLaw lawsuit and contract terms.', [['Bigger Law Firm', 'https://www.biggerlawfirm.com/law-firm-sues-thomson-reuters-over-failure-to-launch-new-findlaw-website-after-exchanging-134-emails/'], ['Lawyerist', 'https://lawyerist.com/reviews/seo-marketing/findlaw/']]],
  ['Florida Bar advertising rules (Rules 4-7.13, 4-7.14, 4-7.19, 4-7.20).', [['The Florida Bar, Advertising Filing Requirements', 'https://www.floridabar.org/ethics/etad/advertising-filing-requirements/'], ['2025 Handbook on Lawyer Advertising', 'https://www-media.floridabar.org/uploads/2025/12/Handbook-2025-Approved-by-SCA-12-10-25.pdf']]],
];
pages.push({ name: 'Sources', title: '13 Sources', html: page(POR, `
<div style="padding:34px 72px 0;display:flex;justify-content:flex-end;">${eyebrow('SOURCES', GRAY)}</div>
<div style="padding:26px 72px 0;display:flex;flex-direction:column;gap:16px;">
  <h2 style="font-family:${DISP};font-weight:600;font-size:38px;line-height:1.1;letter-spacing:-0.03em;color:${INK};">Where the numbers come from.</h2>
  <div style="display:flex;flex-direction:column;border-top:1px solid ${MIST};">
    ${SOURCES.map(([claim, links], i) => `<div style="display:flex;gap:14px;align-items:flex-start;padding:11px 0;border-bottom:1px solid ${MIST};"><span style="flex-shrink:0;width:24px;font-family:${DISP};font-weight:600;font-size:13px;line-height:21px;color:${GRAY};">${String(i + 1).padStart(2, '0')}</span><p style="font-family:${BODY};font-size:14px;line-height:1.5;color:${GRAPH};">${claim}${links.length ? ' ' + links.map(([t, u]) => u ? `<a href="${u.replace(/&/g, '&amp;')}">${t}</a>` : t).join(' and ') : ''}</p></div>`).join('')}
  </div>
</div>
<div style="margin-top:auto;background:${INK};padding:32px 72px 32px;display:flex;flex-direction:column;gap:15px;">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:24px;">${lockup(true)}<span style="font-family:${DISP};font-size:12px;letter-spacing:0.06em;color:${GRAY};"><span style="font-weight:600;color:${WHITE};">Grant Sparks</span>&nbsp;&nbsp;Lakeland, Florida</span></div>
  <p style="font-family:${DISP};font-weight:500;font-size:19px;line-height:1.4;color:${WHITE};">Ready when you are. Call or text <a href="${PHONE_TEL}" style="text-decoration:none;font-weight:600;">${PHONE_TXT}</a>, or visit <a href="${LAW_URL}">sparkmysite.com/law-firm-marketing</a>.</p>
  <span style="font-family:${DISP};font-size:12px;letter-spacing:0.06em;color:${GRAY};">© 2026 Spark Sites&nbsp;&nbsp;·&nbsp;&nbsp;Lakeland, Florida</span>
</div>`) });

// ---------- write artboards, canvas.json, print.html ----------
for (const p of pages) {
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
  pages: [{ id: 'page-1', name: 'Report' }],
  artboards: pages.map((p, i) => ({ file: `${p.name}.dc.html`, title: p.title, x: (i % 4) * 912, y: Math.floor(i / 4) * 1216, w: 816, h: 1056, print: 'fixed', page: 'page-1' })),
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
console.log('wrote', pages.length, 'artboards + canvas.json + print.html');
