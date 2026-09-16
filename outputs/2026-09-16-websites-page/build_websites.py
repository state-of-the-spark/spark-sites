"""Build the /websites/ 3-tier landing page by heavily customizing the
contractor page template (45722). Reuses build_page.py mechanics for
hero/chips/proof/FAQ/CTA/css-injection, but section 4 (program cards) and
section 5 (pricing) are fully custom-written (3-tier pricing grid),
per Grant's + Amber's guardrails 2026-09-16.
"""
import html
import json
import re
import sys
import os

tpl_path, out_path = sys.argv[1:3]
page_id = sys.argv[3] if len(sys.argv) > 3 else None
raw = open(tpl_path, encoding="utf-8").read()
secs = re.split(r"(?=\[et_pb_section )", raw)
assert len(secs) >= 10, f"expected 9 sections, got {len(secs)-1}"


def esc(s):
    return html.escape(s, quote=False)


def code_module(inner_html):
    body = inner_html.replace("[", "&#91;").replace("]", "&#93;")
    return '[et_pb_code _builder_version="4.27.4" global_colors_info="{}"]' + body + "[/et_pb_code]"


HERO_IMG = "https://sparkmysite.com/wp-content/uploads/2026/09/websites-hero-laptop.webp"
HERO_CARD_IMG = "https://sparkmysite.com/wp-content/uploads/2026/09/websites-hero-phone.webp"
PAGE_URL = "https://sparkmysite.com/websites/"
PHONE = "+1-863-225-1713"
AREA_SERVED = ["Lakeland, FL", "Winter Haven, FL", "Plant City, FL", "Bartow, FL",
               "Auburndale, FL", "Haines City, FL", "Davenport, FL", "Polk County, FL",
               "Tampa Bay, FL", "Orlando, FL", "Central Florida"]

# ---------- Section 2 (secs[2]): HERO ----------
s = secs[2]
s = s.replace("BUILT FOR CONTRACTORS &amp; HOME SERVICES", esc("WEBSITES FOR CENTRAL FLORIDA BUSINESSES"))
s = re.sub(
    r"<h1([^>]*)>.*?</h1>",
    lambda m: f'<h1{m.group(1)}>A website that fits your business. <span style="color: #0891b2;">Starting at $34 a month.</span></h1>',
    s, count=1, flags=re.S,
)
s = s.replace(
    "Your website, SEO, reviews, and AI lead follow-up, run as one program, by one team, for one monthly number. Live in 30 days.",
    esc("Three ways to get your business online: a simple one-page site built with AI, a built-for-you site our team builds for you, or a website with marketing built in. One Lakeland team, real human support."),
)
s = s.replace(
    'button_url="https://sparkmysite.com/product/spark-care-growth/" button_text="Get started now"',
    'button_url="#pricing" button_text="See the 3 options"',
)
s = s.replace(
    'button_url="https://calendar.google.com/calendar/appointments/schedules/AcZssZ2L-OByW_l30ZamDR9N2kPF1gsttwOAgGbn4MF75GrDREzBKvN8pkVo969YKzHDuqLZyIylZYU6" url_new_window="on" button_text="Request a consult"',
    'button_url="#cta" button_text="Get a plan call"',
)
s = s.replace(
    "No contracts. No hidden fees. Just $297/month.",
    esc("Starting at $34/mo. No hidden fees."),
)
s = s.replace(
    'src="https://sparkmysite.com/wp-content/uploads/2026/08/contractor-hero-jobsite.webp" alt="Contractors reviewing blueprints on a jobsite"',
    f'src="{HERO_IMG}" alt="Small business owner reviewing a new website on a laptop"',
)
s = s.replace(
    '<div style="display:flex;flex-direction:column;gap:14px;margin-top:24px;">',
    f'<img src="{HERO_CARD_IMG}" alt="A small business website displayed on a phone" width="1024" height="768" style="display:block;width:100%;height:250px;object-fit:cover;border-radius:14px;box-shadow:0 24px 48px rgba(16,20,24,0.22);">'
    '<div style="display:flex;flex-direction:column;gap:14px;margin-top:24px;">',
    1,
)
stats = [
    ("$34/mo", "starts a one-page website, built with AI, hosted and supported by our team."),
    ("1 to 5", "pages in a Built-For-You site, designed and launched for you."),
    ("3", "ways to get online. Pick the one that fits where your business is today."),
]
cards = re.findall(
    r'(<span style="font-family:\'Hanken Grotesk\',sans-serif;font-weight:700;font-size:30px;[^"]*">)(.*?)(</span>\s*<span style="font-family:\'Source Serif 4\',serif;font-size:15px;[^"]*">)(.*?)(</span>)',
    s, flags=re.S,
)
assert len(cards) == 3, len(cards)
for (a, big, b, small, c), new in zip(cards, stats):
    s = s.replace(a + big + b + small + c, a + esc(new[0]) + b + esc(new[1]) + c, 1)
secs[2] = s

# ---------- Section 3 (secs[3]): CHIPS ----------
s = secs[3]
s = s.replace("WHO WE HELP", esc("WHAT WE BUILD"))
chip_tpl = re.search(r'<span style="border:1px solid #C8E9F1[^>]*>', s).group(0)
chips = ["One-page sites", "Small business sites", "Service pages", "Quote & contact forms",
         "Mobile-friendly design", "Hosting & backups", "AI-enhanced content", "Local SEO basics",
         "Lakeland", "Winter Haven", "Polk County", "Central Florida"]
chips_html = "\n\n".join(f"{chip_tpl}{esc(c)}</span>" for c in chips)
s = re.sub(
    r'(<span style="border:1px solid #C8E9F1.*?</span>\s*)+',
    lambda m: chips_html + "\n\n", s, count=1, flags=re.S,
)
secs[3] = s

# ---------- Section 4 (secs[4]): PROGRAM CARDS -> 6 generic trust cards ----------
trust_cards = [
    ("Built to work everywhere", "Every site we build, from the $34/mo Starter to the full Growth program, is mobile-friendly, since that is where most of your customers will find you first."),
    ("Hosting & backups included", "Hosting, backups, and uptime are part of every tier. Nothing extra to track down."),
    ("Real human support", "A real person on our Lakeland team answers when something needs fixing, not a ticket queue."),
    ("AI-enhanced, human-reviewed", "We use AI to move faster on layout and copy, then a person on our team reviews it before anything goes live."),
    ("You keep your site", "If you ever cancel, we help you take your site with you. We do not hold it hostage."),
    ("Room to grow", "Start with the Starter or Built-For-You site, then move up to Spark Care: Growth whenever it makes sense for your business."),
]
blurb_tpl = (
    '[et_pb_blurb title="{title}" _builder_version="4.27.7" header_font="Hanken Grotesk|700|||||||" '
    'header_text_color="#101418" header_font_size="17px" body_font="Source Serif 4||||||||" '
    'body_text_color="#2A3138" body_font_size="14px" background_color="#FFFFFF" '
    'custom_margin="0px|0px|22px|0px" custom_padding="24px|26px|24px|26px" '
    'border_radii="on|14px|14px|14px|14px" border_width_all="1px" border_color_all="#E4E8EA" '
    'global_colors_info="{{}}"]<p style="margin:0;">{body}</p>[/et_pb_blurb]'
)
blurbs_html = "".join(blurb_tpl.format(title=esc(t), body=esc(b)) for t, b in trust_cards)
sec4 = (
    '[et_pb_section fb_built="1" _builder_version="4.27.4" background_color="#F7F8F8" global_colors_info="{}"]'
    '[et_pb_row _builder_version="4.27.4" custom_padding="80px|72px|10px|72px" global_colors_info="{}"]'
    '[et_pb_column type="4_4" _builder_version="4.27.4" global_colors_info="{}"]'
    '[et_pb_text _builder_version="4.27.4" module_alignment="left" global_colors_info="{}"]'
    '<span style="font-family:\'Hanken Grotesk\',sans-serif;font-size:13px;font-weight:600;letter-spacing:0.14em;color:#0891B2;">WHY SPARK SITES</span>\n\n'
    '<h2 style="font-family:\'Hanken Grotesk\',sans-serif;font-weight:600;font-size:38px;letter-spacing:-0.03em;line-height:1.14;color:#101418;max-width:700px;margin:10px 0;">What every Spark Sites website includes, no matter which tier you start on.</h2>\n\n'
    '<p style="font-family:\'Source Serif 4\',serif;font-size:17px;line-height:1.6;color:#2A3138;max-width:700px;margin:0 0 20px;">The tiers below differ on what we build. These six things do not change.</p>'
    '[/et_pb_text][/et_pb_column][/et_pb_row]'
    '[et_pb_row module_class="spark-proggrid" _builder_version="4.27.4" custom_padding="0px|72px|60px|72px" global_colors_info="{}"]'
    '[et_pb_column type="4_4" _builder_version="4.27.4" global_colors_info="{}"]'
    + blurbs_html +
    '[/et_pb_column][/et_pb_row][/et_pb_section]'
)
secs[4] = sec4

# ---------- Section 5 (secs[5]): PRICING -> 3-tier grid ----------
UTM = "?utm_source=judah&utm_medium=landing&utm_campaign=websites"
tiers = [
    {
        "badge": "GET ONLINE",
        "name": "Starter",
        "price": "$34",
        "period": "/mo",
        "sub": "No build fee. Domain (about $20/yr) is separate.",
        "features": [
            "One-page website, built with AI",
            "Hosting, backups &amp; support included",
            "Mobile-friendly design",
            "Best for: a brand-new business that needs to be found online today",
        ],
        "cta": "Start for $34/mo",
        "url": "https://sparkmysite.com/product/get-online-diy-site/" + UTM,
        "highlight": False,
    },
    {
        "badge": "THE AVERAGE SMALL BUSINESS SITE",
        "name": "Built-For-You",
        "price": "$1,800",
        "period": " one-time",
        "sub": "+ $34/mo hosting &amp; support after launch",
        "features": [
            "1 to 5 pages, designed and written around your business",
            "We build it, launch it, and host it",
            "Mobile-friendly design",
            "Page count and content depend on the details and photos you provide",
            "Best for: an established business that wants a real site done for them",
        ],
        "cta": "Get a Built-For-You site",
        "url": "https://sparkmysite.com/product/get-online-built-for-you-site/" + UTM,
        "highlight": True,
    },
    {
        "badge": "WEBSITE + MARKETING",
        "name": "Spark Care: Growth",
        "price": "$297",
        "period": "/mo",
        "sub": "Site build, if needed, billed one-time at the Built-For-You rate. 6 to 12 month expectation.",
        "features": [
            "Google Business Profile monitoring",
            "Email &amp; CRM setup",
            "Google &amp; Meta ads setup with monitoring",
            "GA4 &amp; Meta pixel installed",
            "Dedicated consultant",
            "About 4 hrs/mo of AI-enhanced content",
            "Best for: a business ready to turn a website into leads",
        ],
        "cta": "Start Spark Care Growth",
        "url": "https://sparkmysite.com/product/spark-care-growth/" + UTM,
        "highlight": False,
    },
]


def tier_card(t):
    ring = "border:2px solid #0ECAEB;" if t["highlight"] else "border:1px solid #2A3138;"
    lift = "transform:translateY(-6px);" if t["highlight"] else ""
    feats = "".join(
        f'<li style="margin:0 0 10px;padding-left:22px;position:relative;font-family:\'Source Serif 4\',serif;font-size:14px;line-height:1.5;color:#2A3138;">'
        f'<span style="position:absolute;left:0;top:1px;color:#0891B2;font-weight:700;">&#10003;</span>{f}</li>'
        for f in t["features"]
    )
    badge_html = (
        f'<span style="display:inline-block;background:#0ECAEB;color:#06313A;font-family:\'Hanken Grotesk\',sans-serif;'
        f'font-weight:700;font-size:11px;letter-spacing:0.06em;padding:6px 14px;border-radius:8px;margin-bottom:14px;">{esc(t["badge"])}</span>'
    )
    return (
        f'<div class="pricing-card" style="background:#FFFFFF;border-radius:16px;padding:30px 26px;{ring}{lift}'
        f'display:flex;flex-direction:column;box-shadow:0 18px 40px rgba(0,0,0,0.28);">'
        f'{badge_html}'
        f'<h3 style="font-family:\'Hanken Grotesk\',sans-serif;font-weight:700;font-size:20px;color:#101418;margin:0 0 10px;text-transform:none!important;">{esc(t["name"])}</h3>'
        f'<div style="margin-bottom:6px;"><span style="font-family:\'Hanken Grotesk\',sans-serif;font-weight:700;font-size:34px;color:#101418;">{t["price"]}</span>'
        f'<span style="font-family:\'Hanken Grotesk\',sans-serif;font-weight:600;font-size:16px;color:#8A939B;">{t["period"]}</span></div>'
        f'<p style="margin:0 0 18px;font-family:\'Source Serif 4\',serif;font-size:13px;line-height:1.5;color:#8A939B;">{t["sub"]}</p>'
        f'<ul style="list-style:none;margin:0 0 22px;padding:0;flex-grow:1;">{feats}</ul>'
        f'<a href="{t["url"]}" style="display:block;text-align:center;background:{"#0ECAEB" if t["highlight"] else "#101418"};'
        f'color:{"#06313A" if t["highlight"] else "#FFFFFF"};font-family:\'Hanken Grotesk\',sans-serif;font-weight:600;'
        f'font-size:15px;padding:14px 20px;border-radius:10px;text-decoration:none;">{esc(t["cta"])}</a>'
        f'</div>'
    )


cards_html = '<div class="pricing-cards" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:26px;align-items:stretch;margin-top:10px;">' + "".join(tier_card(t) for t in tiers) + "</div>"
note_html = (
    '<p style="margin:24px 0 0;font-family:\'Source Serif 4\',serif;font-size:14px;line-height:1.6;color:#9AA4AC;text-align:center;">'
    'No long-term contract on hosting; cancel anytime and we help you take your site with you. Spark Care: Growth is built to run 6 to 12 months so the marketing has time to work.'
    '<br>Need an online store instead? Ask about Marketing-Ready E-commerce ($3,500+ one-time, $297/mo).</p>'
)
sec5 = (
    '[et_pb_section fb_built="1" _builder_version="4.27.4" background_color="#101418" module_id="pricing" global_colors_info="{}"]'
    '[et_pb_row _builder_version="4.27.4" custom_padding="72px|72px|72px|72px" global_colors_info="{}"]'
    '[et_pb_column type="4_4" _builder_version="4.27.4" global_colors_info="{}"]'
    '[et_pb_text _builder_version="4.27.4" module_alignment="left" global_colors_info="{}"]'
    '<span style="font-family:\'Hanken Grotesk\',sans-serif;font-size:13px;font-weight:600;letter-spacing:0.14em;color:#0ECAEB;">SIMPLE, HONEST PRICING</span>\n\n'
    '<h2 style="font-family:\'Hanken Grotesk\',sans-serif;font-weight:600;font-size:38px;letter-spacing:-0.03em;line-height:1.14;color:#FFFFFF;margin:10px 0 16px;text-align:center;">Three ways to get online. Pick where you start.</h2>'
    '[/et_pb_text]'
    '[et_pb_text _builder_version="4.27.4" module_alignment="left" global_colors_info="{}"]'
    + cards_html + note_html +
    '[/et_pb_text][/et_pb_column][/et_pb_row][/et_pb_section]'
)
secs[5] = sec5

# ---------- Section 6 (secs[6]): PROOF + ABOUT ----------
s = secs[6]
s = s.replace(
    "Trusted by owners who&#8217;d rather be on the job.", esc("Trusted by small businesses that would rather run their business than fight with a website builder.")
).replace(
    "Trusted by owners who'd rather be on the job.", esc("Trusted by small businesses that would rather run their business than fight with a website builder.")
)
s = s.replace(
    "Not sure it&#8217;s right for you? Our free audit will show you.", esc("Not sure which tier fits your business? We will tell you straight.")
).replace(
    "Not sure it's right for you? Our free audit will show you.", esc("Not sure which tier fits your business? We will tell you straight.")
)
audit_p = "Not a generic &ldquo;free audit.&rdquo; Tell us what you have today, even nothing, and we will tell you honestly which tier fits and why, whether that leads to a sale or not."
s = re.sub(
    r"(<p style=\"margin:0;font-family:'Source Serif 4',serif;font-size:15px;line-height:1.55;color:#2A3138;max-width:640px;\">).*?(</p>)",
    lambda m: m.group(1) + audit_p + m.group(2), s, count=1, flags=re.S,
)
about_html = (
    '<div class="niche-about" style="border-top:1px solid #E4E8EA;padding-top:28px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:28px;">'
    '<div><h3 style="font-family:\'Hanken Grotesk\',sans-serif;font-weight:700;font-size:16px;color:#101418;margin:0 0 6px;">Who we are</h3>'
    '<p style="margin:0;font-family:\'Source Serif 4\',serif;font-size:14px;line-height:1.6;color:#2A3138;">Spark Sites is a Lakeland, Florida website and marketing company. We have been building websites since 2004 and running Spark Sites out of Lakeland since 2013.</p></div>'
    '<div><h3 style="font-family:\'Hanken Grotesk\',sans-serif;font-weight:700;font-size:16px;color:#101418;margin:0 0 6px;">Where we work</h3>'
    '<p style="margin:0;font-family:\'Source Serif 4\',serif;font-size:14px;line-height:1.6;color:#2A3138;">Small businesses in Lakeland, Winter Haven, Plant City, Bartow, Auburndale, Haines City, Davenport, and across Polk County, Tampa Bay, and Orlando.</p></div>'
    '<div><h3 style="font-family:\'Hanken Grotesk\',sans-serif;font-weight:700;font-size:16px;color:#101418;margin:0 0 6px;">How to reach us</h3>'
    '<p style="margin:0;font-family:\'Source Serif 4\',serif;font-size:14px;line-height:1.6;color:#2A3138;">Call or text (863) 225-1713, or fill out the form below and we text you within one business hour.</p></div></div>'
)
s = s.replace(
    "[/et_pb_text][/et_pb_column][/et_pb_row][/et_pb_section]",
    '<div style="margin-top:34px;">' + about_html + "</div>" + "[/et_pb_text][/et_pb_column][/et_pb_row][/et_pb_section]",
    1,
)
secs[6] = s

# ---------- Section 7 (secs[7]): FAQ + schema ----------
s = secs[7]
s = s.replace("Questions? Answers.", esc("Website pricing questions, answered plainly."))
faq = [
    ("What is the difference between the three website tiers?",
     "The $34 a month Starter is a one-page site we build with AI: your business name, what you do, and how to reach you, live fast. Built-For-You is 1 to 5 pages we design and write for you, for a one-time build fee plus the same $34 a month hosting. Spark Care: Growth adds marketing on top of a site, Google Business Profile monitoring, ads setup, and more, for $297 a month."),
    ("What do I get for $34 a month?",
     "A one-page website built with AI: your business name, what you do, your contact info, and a simple way for people to reach you, plus hosting, backups, and support from a real person. No build fee. Domain registration is separate, about $20 a year."),
    ("What does \"built with AI\" actually mean?",
     "We use AI to draft the layout and copy for your one-page site quickly, then a person on our team reviews it before it goes live. It is not a do-it-yourself builder you have to figure out; you tell us about your business and we build the page."),
    ("What is a Built-For-You website?",
     "It is our team designing and building a real small business website for you: 1 to 5 pages such as home, about, services, and contact. It is a one-time $1,800 build fee, then $34 a month for hosting and support. How many pages you get and what goes on them depends on what you can send us: your business info, photos, and any project details. A bigger build is quoted separately."),
    ("Do you write the content for my site, or do I have to?",
     "We write and organize it around what you give us. The more you can send us, your services, your story, photos of your work, the more specific your site can be. If you do not have much yet, we can still get a simple site live and add to it later."),
    ("What does Spark Care: Growth add on top of a website?",
     "Growth is the website plus ongoing marketing: Google Business Profile monitoring, email and CRM setup, Google and Meta ads setup with monitoring, GA4 and Meta pixel installed, a dedicated consultant, and about 4 hours a month of AI-enhanced content work, all for $297 a month. It is built to run 6 to 12 months to give the marketing time to work."),
    ("Do you run my ads for me, or just set them up?",
     "On Growth, we set up your Google and Meta ads, install the tracking, and monitor performance and report on it. You fund the ad budget. Ongoing hands-on ad management beyond setup and monitoring is a separate service; ask us if that is what you need."),
    ("Do you handle my social media posting?",
     "No, social media posting is not part of any tier on this page. Growth includes about 4 hours a month of AI-enhanced content work on your site and marketing assets. If you need social media managed separately, ask us and we will tell you honestly whether that is a fit."),
    ("Do I own my website if I cancel?",
     "Yes. We do not hold sites hostage. If you cancel, we help you take your site with you."),
    ("How fast can I get a website live?",
     "It depends on the tier and how quickly you can send us what we need. The Starter site moves fastest since it is one page built with AI. A Built-For-You site depends on getting your content and one or two rounds of review. Tell us your timeline on the call and we will give you a straight answer for your situation."),
]
faq_items = []
for q, a in faq:
    faq_items.append(
        "<div>\n\n  <h3 style=\"font-family:'Hanken Grotesk',sans-serif;font-weight:700;font-size:16px;letter-spacing:-0.01em;color:#101418;margin:0 0 8px;\">"
        + esc(q) + "</h3>\n\n  <p style=\"margin:0;font-family:'Source Serif 4',serif;font-size:14px;line-height:1.6;color:#2A3138;\">"
        + esc(a) + "</p>\n\n</div>"
    )
grid = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px 40px;">\n\n' + "\n\n".join(faq_items) + "\n\n</div>"
s = re.sub(
    r'<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px 40px;">.*?</div>\[/et_pb_text\]',
    lambda m: grid + "[/et_pb_text]", s, count=1, flags=re.S,
)
schema = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "LocalBusiness", "@id": "https://sparkmysite.com/#business", "name": "Spark Sites",
            "url": "https://sparkmysite.com/", "telephone": PHONE, "email": "support@sparkmysite.com",
            "address": {"@type": "PostalAddress", "addressLocality": "Lakeland", "addressRegion": "FL", "addressCountry": "US"},
            "areaServed": AREA_SERVED, "foundingDate": "2013",
            "description": "Spark Sites is a Lakeland, Florida website and marketing company for small businesses. Building websites since 2004, serving Central Florida since 2013.",
        },
        {
            "@type": "Service", "@id": PAGE_URL + "#service", "name": "Small Business Website Plans",
            "serviceType": "Website design, hosting, and marketing plans for small businesses: a one-page AI-built starter site, a built-for-you 1 to 5 page site, or a website plus ongoing marketing",
            "provider": {"@id": "https://sparkmysite.com/#business"}, "areaServed": AREA_SERVED,
            "audience": {"@type": "BusinessAudience", "name": "Small business owners in Central Florida"},
            "description": "Three website tiers for small businesses in Central Florida: a $34/mo one-page AI-built Starter site, a $1,800 one-time Built-For-You site (1 to 5 pages) plus $34/mo hosting, and Spark Care: Growth at $297/mo (website plus ongoing marketing).",
            "offers": [
                {"@type": "Offer", "name": "Starter", "url": tiers[0]["url"], "price": "34", "priceCurrency": "USD",
                 "priceSpecification": {"@type": "UnitPriceSpecification", "price": "34", "priceCurrency": "USD", "billingIncrement": 1, "unitCode": "MON"},
                 "availability": "https://schema.org/InStock"},
                {"@type": "Offer", "name": "Built-For-You", "url": tiers[1]["url"], "price": "1800", "priceCurrency": "USD",
                 "availability": "https://schema.org/InStock"},
                {"@type": "Offer", "name": "Spark Care: Growth", "url": tiers[2]["url"], "price": "297", "priceCurrency": "USD",
                 "priceSpecification": {"@type": "UnitPriceSpecification", "price": "297", "priceCurrency": "USD", "billingIncrement": 1, "unitCode": "MON"},
                 "availability": "https://schema.org/InStock"},
            ],
        },
        {
            "@type": "WebPage", "@id": PAGE_URL, "url": PAGE_URL,
            "name": "Small Business Websites Starting at $34/mo | Spark Sites",
            "description": "AI-built one-page sites, built-for-you sites, and website plus marketing plans for Central Florida small businesses. Starting at $34 a month.",
            "isPartOf": {"@type": "WebSite", "url": "https://sparkmysite.com/", "name": "Spark Sites"},
            "about": {"@id": PAGE_URL + "#service"},
        },
        {
            "@type": "FAQPage", "@id": PAGE_URL + "#faq",
            "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq],
        },
    ],
}
ld = '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False) + "</script>"
s = s.replace("[/et_pb_column][/et_pb_row][/et_pb_section]", code_module(ld) + "[/et_pb_column][/et_pb_row][/et_pb_section]", 1)
secs[7] = s

# ---------- Section 8 (secs[8]): CTA with form ----------
s = secs[8]
s = s.replace('[et_pb_section fb_built="1"', '[et_pb_section fb_built="1" module_id="cta"', 1)
s = s.replace("Tell us about your business. We&#8217;ll handle the rest.", esc("Tell us about your business. We will help you pick the right start.")).replace(
    "Tell us about your business. We'll handle the rest.", esc("Tell us about your business. We will help you pick the right start.")
)
s = s.replace(
    "A no-pressure call about your goals, and a straight answer on whether the program fits.",
    esc("Fill this out and we text you within one business hour. A no-pressure call about your website, and a straight answer on which tier fits."),
)
form_html = '<div class="niche-form" style="max-width:560px;margin:0 auto 30px;text-align:left;">[gravityform id="30" title="false" description="false" ajax="true"]</div>'
s = s.replace(
    'global_colors_info="{}"]<div style="display:flex;gap:16px;',
    'global_colors_info="{}"]' + form_html + '<div style="display:flex;gap:16px;',
    1,
)
s = s.replace(
    'button_text="Get started now" button_url="https://sparkmysite.com/product/spark-care-growth/"',
    'button_text="See the 3 tiers" button_url="#pricing"',
)
s = s.replace(
    'button_text="Request a consult" button_url="https://calendar.google.com/calendar/appointments/schedules/AcZssZ2L-OByW_l30ZamDR9N2kPF1gsttwOAgGbn4MF75GrDREzBKvN8pkVo969YKzHDuqLZyIylZYU6"',
    'button_text="Call (863) 225-1713" button_url="tel:+18632251713"',
)
s = s.replace(
    "No contracts &middot; 90-day money-back guarantee &middot; $297/month",
    esc("Three tiers, one flat price each. No hidden fees."),
)
secs[8] = s

# ---------- Section 1 (secs[1]): page-scoped CSS ----------
if page_id:
    css = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "grant-sparks", "tools", "niche-bundle", "page-scoped.css"), encoding="utf-8").read()
    css = css.replace("{{SCOPE}}", f".page-id-{page_id}").replace("{{HERO_IMG}}", HERO_IMG)
    fonts = (
        '<link rel="preconnect" href="https://fonts.googleapis.com">'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;1,8..60,400&display=swap">'
    )
    scope = f".page-id-{page_id}"
    extra = (
        f'{scope} .et_pb_text h3{{text-transform:none!important;}} '
        f'{scope} .niche-form .gform_wrapper{{max-width:560px;margin:0 auto;}} '
        f'{scope} .niche-form .gform_wrapper .gfield_label{{font-family:\'Hanken Grotesk\',sans-serif!important;font-weight:600!important;font-size:13px!important;color:#2A3138!important;}} '
        f'{scope} .niche-form .gform_wrapper .gfield_required{{color:#0891B2!important;font-style:normal!important;}} '
        f'{scope} .niche-form .gform_wrapper input[type=text],{scope} .niche-form .gform_wrapper input[type=email],{scope} .niche-form .gform_wrapper input[type=tel],{scope} .niche-form .gform_wrapper select{{width:100%;border:1px solid #E4E8EA;border-radius:10px;padding:12px 14px;font-family:\'Source Serif 4\',serif;font-size:15px;background:#FFFFFF;color:#101418;}} '
        f'{scope} .niche-form .gform_wrapper .gform_footer{{text-align:center;}} '
        f'{scope} .niche-form .gform_wrapper input[type=submit],{scope} .niche-form .gform_wrapper button.gform_button{{background:#101418!important;color:#FFFFFF!important;border:0!important;border-radius:10px!important;padding:14px 30px!important;font-family:\'Hanken Grotesk\',sans-serif!important;font-weight:600!important;font-size:15px!important;cursor:pointer;}} '
        f'{scope} .niche-form .gform_wrapper input[type=submit]:hover{{background:#0891B2!important;}} '
        f'{scope} .niche-form .gform_confirmation_message{{font-family:\'Source Serif 4\',serif;font-size:17px;color:#101418;text-align:center;padding:20px;border:1px solid #C8E9F1;border-radius:14px;background:rgba(14,202,235,0.08);}} '
        f'@media(max-width:700px){{ {scope} .niche-about{{grid-template-columns:1fr!important;}} {scope} .niche-form{{padding:0 4px;}} }} '
        f'{scope} .et_pb_section_1{{background-image:linear-gradient(rgba(247,248,248,0.85),rgba(247,248,248,0.85)), url(\'{HERO_IMG}\')!important;}} '
        f'{scope} .pricing-cards{{grid-template-columns:1fr 1fr 1fr!important;}} '
        f'@media(max-width:980px){{ {scope} .pricing-cards{{grid-template-columns:1fr!important;}} {scope} .pricing-card{{transform:none!important;}} }} '
        f'{scope} .pricing-card h3, {scope} .pricing-card span, {scope} .pricing-card p, {scope} .pricing-card li{{text-transform:none!important;}} '
        f'@media(max-width:700px){{ {scope} .et_pb_section_6 div[style*="grid-template-columns:1fr 1fr"]{{grid-template-columns:1fr!important;}} '
        f'{scope} .et_pb_row_8{{grid-template-columns:1fr!important;gap:20px!important;}} '
        f'{scope} .et_pb_row_1{{grid-template-columns:1fr!important;gap:20px!important;}} }} '
    )
    style_mod = code_module(fonts + f'<style id="spark-websites">' + css + extra + "</style>")
    secs[1] = secs[1].replace("[/et_pb_column][/et_pb_row][/et_pb_section]", style_mod + "[/et_pb_column][/et_pb_row][/et_pb_section]", 1)

out = "".join(secs)
open(out_path, "w", encoding="utf-8").write(out)
print("built", len(out), "chars; sections", len(re.findall(r"\[et_pb_section", out)))
