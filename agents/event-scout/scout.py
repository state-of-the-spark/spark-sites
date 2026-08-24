#!/usr/bin/env python3
"""
Event Scout — Local event discovery agent for target avatars.

Scrapes Meetup, Eventbrite, Lu.ma, and Facebook Events,
then uses AI to score events against your target audience profiles.

Usage:
    python scout.py                    # Run with default config
    python scout.py --config my.yaml   # Run with custom config
    python scout.py --dry-run          # Show what would be searched (no API calls)
"""

import argparse
import json
import os
import smtplib
import sys
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

import yaml
from apify_client import ApifyClient
from dateutil import parser as dateparser


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

def load_config(config_path: str = None) -> dict:
    """Load configuration from YAML file."""
    if config_path is None:
        config_path = Path(__file__).parent / "config.yaml"
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def get_date_range() -> tuple[str, str]:
    """Return (start_date, end_date) for next 3 weeks."""
    today = datetime.now()
    end = today + timedelta(days=21)
    return today.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")


# ---------------------------------------------------------------------------
# Source: Event Scraper Pro (Meetup + Eventbrite + Lu.ma)
# ---------------------------------------------------------------------------

def scrape_event_scraper_pro(client: ApifyClient, config: dict) -> list[dict]:
    """Scrape events from Meetup, Eventbrite, and Lu.ma via Event Scraper Pro."""
    source_config = config["sources"]["event_scraper_pro"]
    if not source_config.get("enabled", True):
        return []

    date_from, date_to = get_date_range()
    cities = config["location"]["cities"]

    actor_input = {
        "keywords": source_config["search_keywords"],
        "country": config["location"]["country"],
        "cities": cities,
        "platforms": source_config["platforms"],
        "dateFrom": date_from,
        "dateTo": date_to,
        "includeOnline": source_config.get("include_online", False),
        "includeFree": True,
        "includePaid": True,
        "maxItemsPerPlatform": source_config.get("max_results_per_platform", 50),
        "useApifyProxy": True,
    }

    print(f"  Scraping Meetup/Eventbrite/Lu.ma for {', '.join(cities)}...")
    run = client.actor(source_config["actor"]).call(
        run_input=actor_input,
        run_timeout=timedelta(seconds=180),
    )
    items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
    print(f"  Found {len(items)} events from Event Scraper Pro")
    return items


def scrape_facebook_events(client: ApifyClient, config: dict) -> list[dict]:
    """Scrape events from Facebook Events."""
    source_config = config["sources"]["facebook_events"]
    if not source_config.get("enabled", True):
        return []

    actor_input = {
        "searchQueries": source_config["search_queries"],
        "maxEvents": source_config.get("max_events", 50),
    }

    print(f"  Scraping Facebook Events...")
    # Timeout after 3 minutes — Facebook scraper paginates aggressively
    run = client.actor(source_config["actor"]).call(
        run_input=actor_input,
        run_timeout=timedelta(seconds=180),
    )
    items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
    print(f"  Found {len(items)} events from Facebook")
    return items


# ---------------------------------------------------------------------------
# Normalize events to common schema
# ---------------------------------------------------------------------------

def normalize_event(raw: dict, source: str) -> dict:
    """Normalize a raw event from any source into a common schema."""
    if source == "event_scraper_pro":
        # Build location from available fields
        venue = raw.get("venueName") or ""
        address = raw.get("address") or ""
        city = raw.get("city") or ""
        location_parts = [p for p in [venue, address, city] if p]
        location = ", ".join(location_parts) or ""

        # Build price from ticketStatus / priceMin / priceMax
        ticket_status = raw.get("ticketStatus", "")
        price_min = raw.get("priceMin")
        price_max = raw.get("priceMax")
        if ticket_status == "free" or (not price_min and not price_max):
            price = "Free"
        elif price_min and price_max and price_min != price_max:
            price = f"${price_min}-${price_max}"
        elif price_min:
            price = f"${price_min}"
        else:
            price = "See event"

        return {
            "title": raw.get("title") or raw.get("name", "Untitled"),
            "description": raw.get("description", ""),
            "date": raw.get("startsAt") or raw.get("date", ""),
            "time": "",  # startsAt includes time as ISO timestamp
            "location": location,
            "city": city,
            "url": raw.get("eventUrl") or raw.get("ticketUrl") or "",
            "organizer": raw.get("organizerName") or "",
            "attendees": raw.get("rsvpCount") or raw.get("capacity") or 0,
            "price": price,
            "platform": raw.get("platform") or source,
            "source": source,
        }
    elif source == "facebook":
        # Extract clean location from Facebook's nested place object
        place = raw.get("location") or raw.get("place") or {}
        if isinstance(place, dict):
            place_name = place.get("name") or ""
            street = place.get("streetAddress") or ""
            city = place.get("city") or place.get("contextualName") or ""
            location_parts = [p for p in [place_name, street, city] if p]
            location = ", ".join(location_parts)
        else:
            location = str(place) if place else ""

        return {
            "title": raw.get("name") or raw.get("title", "Untitled"),
            "description": raw.get("description", ""),
            "date": raw.get("dateTimeSentence") or raw.get("startDate") or raw.get("date", ""),
            "time": raw.get("startTime") or raw.get("time", ""),
            "location": location,
            "city": city if isinstance(place, dict) else "",
            "url": raw.get("url", ""),
            "organizer": raw.get("organizer", {}).get("name", "") if isinstance(raw.get("organizer"), dict) else raw.get("organizer", ""),
            "attendees": raw.get("usersInterested", 0) or raw.get("usersGoing", 0),
            "price": raw.get("price", "See event"),
            "platform": "Facebook",
            "source": "facebook",
        }
    return raw


# ---------------------------------------------------------------------------
# AI Scoring — Score events against avatar profiles
# ---------------------------------------------------------------------------

def score_events_with_ai(events: list[dict], config: dict) -> list[dict]:
    """Use Gemini to rank each event 1-10 for networking relevance."""
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("  WARNING: GOOGLE_API_KEY not set. Skipping AI scoring.")
        for event in events:
            event["score"] = 0
            event["avatar_match"] = []
            event["reasoning"] = "AI scoring unavailable"
        return events

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)

    # Build avatar context for the prompt
    avatar_descriptions = []
    for name, avatar in config["avatars"].items():
        avatar_descriptions.append(f"- **{name}**: {avatar['description']}")
    avatar_context = "\n".join(avatar_descriptions)

    primary_city = config["location"]["primary_city"]

    # Batch events into groups of 10 for efficiency
    scored_events = []
    batch_size = 10

    for i in range(0, len(events), batch_size):
        batch = events[i : i + batch_size]
        events_text = ""
        for j, event in enumerate(batch):
            events_text += f"\n[Event {j+1}]\n"
            events_text += f"Title: {event['title']}\n"
            events_text += f"Description: {(event['description'] or '')[:500]}\n"
            events_text += f"Location: {event['location']}\n"
            events_text += f"Organizer: {event['organizer']}\n"
            events_text += f"Attendees: {event.get('attendees', 'N/A')}\n"

        prompt = f"""You are ranking events for a sales team at Spark Sites, a local web design and marketing company based in {primary_city}, FL.

Rank each event on a 1-10 scale for how valuable it would be to attend for networking with potential clients.

TARGET AVATARS (who we want to meet):
{avatar_context}

SCORING GUIDE:
- 9-10: Perfect fit. Event is specifically for our avatars (small business networking, entrepreneur meetups, women in business). High attendee count. Close to {primary_city}.
- 7-8: Strong fit. Our avatars will likely be there. Business-adjacent events, chamber of commerce, coworking meetups.
- 5-6: Decent fit. Some avatars might attend. General professional events, community gatherings, market/vendor events.
- 3-4: Weak fit. Mostly wrong audience but some crossover possible.
- 1-2: Not relevant. Purely social, niche hobby, corporate-only, or online-only.

FACTOR IN: avatar match (most important), proximity to {primary_city}, event size, networking opportunity, and specificity of the event to our ideal clients.

EVENTS TO SCORE:
{events_text}

For EACH event, respond with a JSON array. Each item must have:
- "index": the event number (1-based)
- "score": integer 1-10
- "avatar_match": array of matching avatar names (e.g., ["local_business_owner", "growing_entrepreneur"])
- "reasoning": one sentence explaining the score

Return ONLY the JSON array, no other text."""

        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json",
                ),
            )

            text = response.text.strip()
            scores = json.loads(text)

            for score_item in scores:
                idx = score_item["index"] - 1
                if 0 <= idx < len(batch):
                    raw_score = score_item.get("score", 1)
                    batch[idx]["score"] = int(raw_score) if isinstance(raw_score, (int, float)) else 1
                    batch[idx]["avatar_match"] = score_item.get("avatar_match", [])
                    batch[idx]["reasoning"] = score_item.get("reasoning", "")

        except Exception as e:
            print(f"  WARNING: AI scoring failed for batch: {e}")
            for event in batch:
                event.setdefault("score", 0)
                event.setdefault("avatar_match", [])
                event.setdefault("reasoning", "Scoring failed")

        scored_events.extend(batch)
        print(f"  Scored {min(i + batch_size, len(events))}/{len(events)} events...")

    return scored_events


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

def event_fingerprint(event: dict) -> str:
    """Generate a stable fingerprint for an event (lowercase title + date prefix)."""
    title = event.get("title", "").lower().strip()
    date = str(event.get("date", ""))[:10]
    return f"{title}|{date}"


def deduplicate(events: list[dict]) -> list[dict]:
    """Remove duplicate events based on title + date similarity."""
    seen = set()
    unique = []
    for event in events:
        key = event_fingerprint(event)
        if key not in seen:
            seen.add(key)
            unique.append(event)
    print(f"  Deduplicated: {len(events)} -> {len(unique)} unique events")
    return unique


# ---------------------------------------------------------------------------
# Seen Events Tracking
# ---------------------------------------------------------------------------

def get_seen_events_path() -> Path:
    """Return the path to the seen events JSON file."""
    return Path(__file__).parent / "output" / "seen-events.json"


def load_seen_events() -> dict:
    """Load previously seen events from JSON file.

    Returns dict mapping fingerprint -> {first_seen, last_seen, times_seen, title, score}.
    """
    path = get_seen_events_path()
    if not path.exists():
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def save_seen_events(seen: dict) -> None:
    """Save seen events to JSON file."""
    path = get_seen_events_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(seen, f, indent=2, ensure_ascii=False)


def tag_seen_events(events: list[dict], seen: dict) -> tuple[list[dict], list[dict]]:
    """Split events into new and previously seen. Tags each event with 'seen' flag."""
    new_events = []
    seen_events = []
    for event in events:
        fp = event_fingerprint(event)
        if fp in seen:
            event["seen"] = True
            event["first_seen"] = seen[fp].get("first_seen", "")
            event["times_seen"] = seen[fp].get("times_seen", 1)
            seen_events.append(event)
        else:
            event["seen"] = False
            new_events.append(event)
    return new_events, seen_events


def update_seen_events(seen: dict, events: list[dict]) -> dict:
    """Add/update events in the seen registry. Prunes entries older than 60 days."""
    today = datetime.now().strftime("%Y-%m-%d")
    cutoff = (datetime.now() - timedelta(days=60)).strftime("%Y-%m-%d")

    for event in events:
        fp = event_fingerprint(event)
        if fp in seen:
            seen[fp]["last_seen"] = today
            seen[fp]["times_seen"] = seen[fp].get("times_seen", 1) + 1
            seen[fp]["score"] = event.get("score", seen[fp].get("score", 0))
        else:
            seen[fp] = {
                "title": event.get("title", ""),
                "date": str(event.get("date", ""))[:10],
                "score": event.get("score", 0),
                "first_seen": today,
                "last_seen": today,
                "times_seen": 1,
            }

    # Prune old entries
    pruned = {k: v for k, v in seen.items() if v.get("last_seen", "") >= cutoff}
    if len(pruned) < len(seen):
        print(f"  Pruned {len(seen) - len(pruned)} stale entries from seen-events.json")
    return pruned


# ---------------------------------------------------------------------------
# Markdown Digest Generation
# ---------------------------------------------------------------------------

MAX_DIGEST_EVENTS = 10


def generate_digest(events: list[dict], config: dict, worth_watching: list[dict] = None,
                    new_events: list[dict] = None, seen_events: list[dict] = None) -> str:
    """Generate a markdown digest of the top-ranked events.

    Prioritizes new (unseen) events. Previously seen events are shown in a
    separate section only when there aren't enough new events to fill the digest.
    """
    today = datetime.now().strftime("%Y-%m-%d")
    date_from, date_to = get_date_range()

    # If new/seen split is provided, use it. Otherwise treat all as new (backwards compat).
    if new_events is not None:
        ranked_new = sorted(new_events, key=lambda e: e.get("score", 0), reverse=True)
        ranked_seen = sorted(seen_events or [], key=lambda e: e.get("score", 0), reverse=True)
    else:
        ranked_new = sorted(events, key=lambda e: e.get("score", 0), reverse=True)
        ranked_seen = []

    top_new = ranked_new[:MAX_DIGEST_EVENTS]
    total_scored = len(new_events or events) + len(seen_events or [])

    lines = [
        f"---",
        f"type: digest",
        f"date: {today}",
        f"agent: event-scout",
        f"status: active",
        f"---",
        f"",
        f"# Event Scout Digest — {today}",
        f"",
        f"**Business:** {config['business_name']}",
        f"**Geography:** {', '.join(config['location']['cities'])}",
        f"**Date range:** {date_from} to {date_to}",
        f"**{len(ranked_new)} new events | {len(ranked_seen)} previously seen | {total_scored} total scored**",
        f"",
        f"---",
        f"",
    ]

    # Section 1: New events
    if top_new and top_new[0].get("score", 0) > 0:
        lines.append("## New Events")
        lines.append("")
        for rank, event in enumerate(top_new, 1):
            lines.extend(_format_event_ranked(event, rank))
    elif not ranked_seen:
        lines.append("*No new events found.*")
        lines.append("")

    # Section 2: Previously seen events (backfill if few new ones, or show top seen)
    if ranked_seen:
        # Show seen events if we have fewer than MAX new events, or if seen events score 7+
        slots_remaining = MAX_DIGEST_EVENTS - len(top_new)
        top_seen = ranked_seen[:max(slots_remaining, 3)] if slots_remaining > 0 else [
            e for e in ranked_seen if e.get("score", 0) >= 7
        ][:5]

        if top_seen:
            lines.append("---")
            lines.append("")
            if not top_new:
                lines.append("## Events (Previously Seen)")
                lines.append("")
                lines.append("*No new events this run. Here are the best upcoming events from previous scans:*")
            else:
                lines.append("## Also on Your Radar (Previously Seen)")
                lines.append("")
                lines.append("*These showed up in a previous scan and are still upcoming.*")
            lines.append("")
            for event in top_seen:
                times = event.get("times_seen", 1)
                first = event.get("first_seen", "")
                lines.extend(_format_event_ranked(event, "", seen_label=f"Seen {times}x since {first}"))

    # Section 3: Worth Watching — high-scoring events outside the 21-day window
    if worth_watching:
        ww_ranked = sorted(worth_watching, key=lambda e: e.get("score", 0), reverse=True)
        lines.append("---")
        lines.append("")
        lines.append("## Worth Watching — Coming Up Later")
        lines.append("")
        lines.append("*These scored 8/10 or higher but are beyond the next 3 weeks (or don't have a confirmed date yet). Put them on your radar.*")
        lines.append("")
        for event in ww_ranked:
            lines.extend(_format_event_ranked(event, ""))

    return "\n".join(lines)


def _format_event_ranked(event: dict, rank, seen_label: str = "") -> list[str]:
    """Format a ranked event for the digest."""
    score = event.get("score", 0)
    platform = event.get("platform", "Unknown")
    title_prefix = f"#{rank}. " if rank else ""
    seen_tag = f" *(Previously Seen)*" if seen_label else ""
    lines = [
        f"### {title_prefix}{event['title']} (Score: {score}/10){seen_tag}",
        f"",
    ]
    if seen_label:
        lines.append(f"- **Status:** {seen_label}")
    lines.extend([
        f"- **Why:** {event.get('reasoning', '')}",
        f"- **Date:** {event.get('date', 'TBD')} {event.get('time', '')}".strip(),
        f"- **Location:** {event.get('location', 'TBD')}",
        f"- **Organizer:** {event.get('organizer', 'Unknown')}",
        f"- **Attendees:** {event.get('attendees', 'N/A')}",
        f"- **Price:** {event.get('price', 'See event')}",
        f"- **Found on:** {platform}",
        f"- **Best for:** {', '.join(event.get('avatar_match', [])) or 'General'}",
    ])
    if event.get("url"):
        lines.append(f"- **Link:** {event['url']}")
    else:
        lines.append(f"- **Link:** No direct link — search for this event on {platform}")
    lines.append("")
    return lines



# ---------------------------------------------------------------------------
# Email Notification
# ---------------------------------------------------------------------------

def send_digest_email(digest: str, config: dict, new_events: list[dict] = None,
                      seen_events: list[dict] = None, worth_watching: list[dict] = None) -> None:
    """Send the digest as a styled HTML email via Gmail SMTP."""
    output_config = config.get("output", {})
    if not output_config.get("email", False):
        return

    app_password = os.environ.get("GMAIL_APP_PASSWORD")
    if not app_password:
        print("  WARNING: GMAIL_APP_PASSWORD not set. Skipping email.")
        return

    email_from = output_config.get("email_from", "grant@stateofthespark.com")
    email_to = output_config.get("email_to", [])
    if not email_to:
        print("  WARNING: No email_to addresses configured. Skipping email.")
        return

    today_str = datetime.now().strftime("%A, %b %d")
    subject = f"Event Scout — {today_str}"

    html_body = build_digest_html_(config, new_events or [], seen_events or [], worth_watching or [])

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = email_from
    msg["To"] = ", ".join(email_to)
    msg.attach(MIMEText(digest, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(email_from, app_password)
            server.sendmail(email_from, email_to, msg.as_string())
        print(f"  Email sent to: {', '.join(email_to)}")
    except Exception as e:
        print(f"  ERROR sending email: {e}")


def build_digest_html_(config: dict, new_events: list[dict],
                        seen_events: list[dict], worth_watching: list[dict]) -> str:
    """Build a fully styled HTML email matching the Grant Daily / BizDev Daily format."""
    import html as html_mod

    today_str = datetime.now().strftime("%A, %b %d")
    date_from, date_to = get_date_range()
    cities = ", ".join(config["location"]["cities"])

    ranked_new = sorted(new_events, key=lambda e: e.get("score", 0), reverse=True)[:10]
    ranked_seen = sorted(seen_events, key=lambda e: e.get("score", 0), reverse=True)
    ranked_ww = sorted(worth_watching, key=lambda e: e.get("score", 0), reverse=True)

    # Backfill seen events if not enough new
    slots_remaining = 10 - len(ranked_new)
    top_seen = ranked_seen[:max(slots_remaining, 3)] if slots_remaining > 0 else [
        e for e in ranked_seen if e.get("score", 0) >= 7
    ][:5]

    h = '<!DOCTYPE html><html><head><meta charset="utf-8"></head>'
    h += '<body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;'
    h += 'max-width:700px;margin:0 auto;padding:20px;color:#2c3e50;background:#ffffff;">'

    # --- Header ---
    h += '<div style="padding:20px;background:linear-gradient(135deg,#2ecc71 0%,#27ae60 100%);'
    h += 'color:white;border-radius:8px;margin-bottom:20px;">'
    h += '<div style="font-size:22px;font-weight:bold;">Event Scout</div>'
    h += f'<div style="font-size:16px;margin-top:6px;">Events for {today_str}</div>'
    h += f'<div style="font-size:13px;margin-top:8px;opacity:0.9;">{len(new_events)} new &middot; '
    h += f'{len(seen_events)} previously seen &middot; {cities}</div>'
    h += '</div>'

    # --- Summary stats ---
    top_score = ranked_new[0].get("score", 0) if ranked_new else 0
    high_count = len([e for e in new_events if e.get("score", 0) >= 7])
    h += '<div style="display:flex;gap:12px;margin-bottom:20px;">'
    h += _stat_box_("New Events", str(len(new_events)), "#3498db")
    h += _stat_box_("Score 7+", str(high_count), "#27ae60")
    h += _stat_box_("Top Score", f"{top_score}/10", "#e74c3c" if top_score >= 8 else "#f39c12")
    h += '</div>'

    # --- New Events ---
    if ranked_new:
        h += '<h2 style="font-size:18px;color:#2c3e50;border-bottom:1px solid #eee;'
        h += 'padding-bottom:8px;margin:0 0 12px 0;">New Events</h2>'
        for rank, event in enumerate(ranked_new, 1):
            h += _event_card_html_(event, rank, html_mod)
    else:
        h += '<div style="padding:15px;background:#f0f4ff;border-left:4px solid #3498db;border-radius:4px;margin-bottom:20px;">'
        h += 'No new events found this run.</div>'

    # --- Previously Seen ---
    if top_seen:
        label = "Events (Previously Seen)" if not ranked_new else "Also on Your Radar"
        h += f'<h2 style="font-size:18px;color:#2c3e50;border-bottom:1px solid #eee;'
        h += f'padding-bottom:8px;margin:20px 0 12px 0;">{label}</h2>'
        h += '<p style="font-size:13px;color:#999;margin:0 0 12px 0;">These showed up in a previous scan and are still upcoming.</p>'
        for event in top_seen:
            times = event.get("times_seen", 1)
            first = event.get("first_seen", "")
            h += _event_card_html_(event, "", html_mod, seen_label=f"Seen {times}x since {first}")

    # --- Worth Watching ---
    if ranked_ww:
        h += '<h2 style="font-size:18px;color:#2c3e50;border-bottom:1px solid #eee;'
        h += 'padding-bottom:8px;margin:20px 0 12px 0;">Worth Watching — Coming Up Later</h2>'
        h += '<p style="font-size:13px;color:#999;margin:0 0 12px 0;">Scored 8+ but beyond the next 3 weeks.</p>'
        for event in ranked_ww:
            h += _event_card_html_(event, "", html_mod)

    # --- Footer ---
    h += '<div style="border-top:1px solid #eee;padding-top:15px;margin-top:30px;'
    h += 'font-size:12px;color:#95a5a6;text-align:center;">'
    h += 'Generated by Event Scout (GitHub Actions)<br>'
    h += f'Runs Wed/Fri at 8 AM ET | Scanning {date_from} to {date_to}<br>'
    h += 'Powered by Spark Sites</div>'

    h += '</body></html>'
    return h


def _stat_box_(label: str, value: str, color: str) -> str:
    """Build a small stat box for the summary row."""
    return (
        f'<div style="flex:1;text-align:center;padding:12px;border:1px solid #eee;border-radius:8px;'
        f'border-top:3px solid {color};">'
        f'<div style="font-size:24px;font-weight:bold;color:{color};">{value}</div>'
        f'<div style="font-size:11px;color:#999;margin-top:2px;">{label}</div></div>'
    )


def _event_card_html_(event: dict, rank, html_mod, seen_label: str = "") -> str:
    """Build a styled card for a single event."""
    score = event.get("score", 0)
    title = html_mod.escape(event.get("title", "Untitled"))
    reasoning = html_mod.escape(event.get("reasoning", ""))
    location = html_mod.escape(event.get("location", "TBD"))
    organizer = html_mod.escape(event.get("organizer", "Unknown"))
    platform = html_mod.escape(event.get("platform", "Unknown"))
    date_str = html_mod.escape(str(event.get("date", "TBD")))
    time_str = html_mod.escape(str(event.get("time", "")))
    price = html_mod.escape(str(event.get("price", "See event")))
    attendees = event.get("attendees", "N/A")
    url = event.get("url", "")
    avatars = ", ".join(event.get("avatar_match", [])) or "General"

    # Score color
    if score >= 8:
        score_color = "#27ae60"
        score_bg = "#eafaf1"
    elif score >= 6:
        score_color = "#f39c12"
        score_bg = "#fef9e7"
    else:
        score_color = "#95a5a6"
        score_bg = "#f8f9fa"

    rank_html = ""
    if rank:
        rank_html = (
            f'<div style="width:28px;height:28px;border-radius:50%;background:#3498db;color:white;'
            f'text-align:center;line-height:28px;font-weight:bold;font-size:13px;'
            f'flex-shrink:0;margin-right:10px;">#{rank}</div>'
        )

    card = f'<div style="border:1px solid #eee;border-radius:8px;padding:15px;margin-bottom:12px;'
    card += f'border-left:4px solid {score_color};">'

    # Title row with score badge
    card += '<div style="display:flex;align-items:center;margin-bottom:8px;">'
    card += rank_html
    card += f'<div style="flex:1;font-weight:bold;font-size:15px;color:#2c3e50;">'
    if url:
        card += f'<a href="{html_mod.escape(url)}" style="color:#2c3e50;text-decoration:none;">{title}</a>'
    else:
        card += title
    card += '</div>'
    card += f'<div style="background:{score_bg};color:{score_color};border-radius:10px;'
    card += f'padding:3px 10px;font-weight:bold;font-size:13px;white-space:nowrap;margin-left:8px;">'
    card += f'{score}/10</div></div>'

    # Seen label
    if seen_label:
        card += f'<div style="font-size:12px;color:#9b59b6;margin-bottom:6px;font-style:italic;">{seen_label}</div>'

    # Reasoning
    if reasoning:
        card += f'<div style="font-size:13px;color:#555;margin-bottom:8px;font-style:italic;">{reasoning}</div>'

    # Detail grid
    card += '<div style="display:flex;flex-wrap:wrap;gap:4px 16px;font-size:12px;color:#666;">'
    card += f'<div><strong>Date:</strong> {date_str} {time_str}</div>'
    card += f'<div><strong>Location:</strong> {location}</div>'
    card += f'<div><strong>Organizer:</strong> {organizer}</div>'
    card += f'<div><strong>Attendees:</strong> {attendees}</div>'
    card += f'<div><strong>Price:</strong> {price}</div>'
    card += f'<div><strong>Platform:</strong> {platform}</div>'
    card += f'<div><strong>Best for:</strong> {html_mod.escape(avatars)}</div>'
    card += '</div>'

    card += '</div>'
    return card


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Event Scout — Local event discovery agent")
    parser.add_argument("--config", type=str, help="Path to config YAML file")
    parser.add_argument("--dry-run", action="store_true", help="Show config without making API calls")
    args = parser.parse_args()

    print("=" * 60)
    print("EVENT SCOUT — Local Event Discovery Agent")
    print("=" * 60)

    # Load config
    config = load_config(args.config)
    print(f"\nBusiness: {config['business_name']}")
    print(f"Cities: {', '.join(config['location']['cities'])}")
    print(f"Avatars: {', '.join(config['avatars'].keys())}")

    if args.dry_run:
        print("\n[DRY RUN] Would search:")
        for source_name, source_config in config["sources"].items():
            if source_config.get("enabled", True):
                print(f"  - {source_name} ({source_config['actor']})")
        print("\nNo API calls made.")
        return

    # Check API keys
    apify_token = os.environ.get("APIFY_API_TOKEN")
    if not apify_token:
        # Try loading from vip env
        env_path = os.path.expanduser("~/.config/vip/env.sh")
        if os.path.exists(env_path):
            print("  Loading API keys from ~/.config/vip/env.sh...")
            import subprocess
            result = subprocess.run(
                ["bash", "-c", f"source {env_path} && echo $APIFY_API_TOKEN"],
                capture_output=True, text=True
            )
            apify_token = result.stdout.strip()
            os.environ["APIFY_API_TOKEN"] = apify_token

            # Also load GOOGLE_API_KEY if not set
            if not os.environ.get("GOOGLE_API_KEY"):
                result = subprocess.run(
                    ["bash", "-c", f"source {env_path} && echo $GOOGLE_API_KEY"],
                    capture_output=True, text=True
                )
                google_key = result.stdout.strip()
                if google_key:
                    os.environ["GOOGLE_API_KEY"] = google_key

    if not apify_token:
        print("\nERROR: APIFY_API_TOKEN not found.")
        print("Set it as an environment variable or add it to ~/.config/vip/env.sh")
        print("Get your token at: https://console.apify.com/account/integrations")
        sys.exit(1)

    client = ApifyClient(apify_token)

    # --- Scrape all sources ---
    print("\n[1/4] Scraping event sources...")
    all_raw_events = []

    # Event Scraper Pro (Meetup + Eventbrite + Lu.ma)
    try:
        esp_events = scrape_event_scraper_pro(client, config)
        all_raw_events.extend(
            [normalize_event(e, "event_scraper_pro") for e in esp_events]
        )
    except Exception as e:
        print(f"  ERROR with Event Scraper Pro: {e}")

    # Facebook Events
    try:
        fb_events = scrape_facebook_events(client, config)
        all_raw_events.extend(
            [normalize_event(e, "facebook") for e in fb_events]
        )
    except Exception as e:
        print(f"  ERROR with Facebook Events: {e}")

    print(f"\n  Total raw events: {len(all_raw_events)}")

    # --- Filter to future events within 21 days ---
    print("\n[2/5] Filtering to future events (next 21 days)...")
    date_from, date_to = get_date_range()
    today = datetime.now()
    cutoff = today + timedelta(days=21)
    future_events = []
    outside_window = []  # Far-future, no date, or unparseable — scored separately
    for event in all_raw_events:
        event_date_str = str(event.get("date", "")).strip()
        if not event_date_str:
            outside_window.append(event)
            continue
        try:
            event_date = dateparser.parse(event_date_str, fuzzy=True)
            if event_date and today.date() <= event_date.date() <= cutoff.date():
                future_events.append(event)
            elif event_date and event_date.date() > cutoff.date():
                outside_window.append(event)  # Future but beyond 21 days
            # Past events are dropped entirely
        except Exception:
            outside_window.append(event)  # Unparseable — might be worth watching
    print(f"  Kept {len(future_events)} events in next 21 days")
    print(f"  {len(outside_window)} events outside window (will check for high scorers)")

    # --- Deduplicate ---
    print("\n[3/6] Deduplicating...")
    unique_events = deduplicate(future_events)
    unique_outside = deduplicate(outside_window) if outside_window else []

    # --- AI Score ---
    print("\n[4/6] Scoring events against target avatars...")
    scored_events = score_events_with_ai(unique_events, config)

    # Score outside-window events too (for "Worth Watching" section)
    scored_outside = []
    if unique_outside:
        print(f"\n[5/6] Scoring {len(unique_outside)} outside-window events...")
        scored_outside = score_events_with_ai(unique_outside, config)
        # Only keep high scorers (8+)
        scored_outside = [e for e in scored_outside if e.get("score", 0) >= 8]
        print(f"  {len(scored_outside)} scored 8+ (worth watching)")
    else:
        print("\n[5/6] No outside-window events to score.")

    # --- Check seen events ---
    print("\n[6/7] Checking seen events...")
    seen_registry = load_seen_events()
    new_events, previously_seen = tag_seen_events(scored_events, seen_registry)
    print(f"  {len(new_events)} new | {len(previously_seen)} previously seen")

    # --- Generate digest ---
    print("\n[7/7] Generating digest...")
    digest = generate_digest(
        scored_events, config,
        worth_watching=scored_outside,
        new_events=new_events,
        seen_events=previously_seen,
    )

    # Save markdown — single file, overwritten each run
    output_dir = Path(__file__).parent / config["output"]["markdown_path"].replace("agents/event-scout/", "")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "digest-latest.md"
    output_path.write_text(digest, encoding="utf-8")

    # Update seen events registry with all scored events
    seen_registry = update_seen_events(seen_registry, scored_events)
    save_seen_events(seen_registry)
    print(f"  Seen events registry: {len(seen_registry)} total entries")

    # Send email notification
    send_digest_email(digest, config, new_events=new_events,
                      seen_events=previously_seen, worth_watching=scored_outside)

    # Show top results summary
    ranked_new = sorted(new_events, key=lambda e: e.get("score", 0), reverse=True)
    top = ranked_new[:MAX_DIGEST_EVENTS]

    print(f"\n{'=' * 60}")
    print(f"DONE! Digest saved to: {output_path}")
    print(f"  {len(new_events)} NEW events | {len(previously_seen)} previously seen")
    if top:
        print(f"  Top new events:")
        for i, e in enumerate(top, 1):
            print(f"    #{i}. [{e.get('score', 0)}/10] {e['title']}")
    else:
        print(f"  No new events — digest shows best previously seen events")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
