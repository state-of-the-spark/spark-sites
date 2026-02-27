#!/usr/bin/env python3
"""
Biz Scout — Florida Sunbiz business data scraper for Spark Sites.

Downloads Florida corporate registration data from the FL Division of
Corporations (Sunbiz) bulk data service, filters for Polk County businesses,
and outputs to CSV (local) and Google Sheets (via gspread service account).

Data source: https://dos.fl.gov/sunbiz/other-services/data-downloads/
SFTP server: sftp.floridados.gov
Credentials: Public / PubAccess1845! (published on the Sunbiz site)

Usage:
    python scraper.py                     # Download daily + parse + filter + CSV
    python scraper.py --quarterly         # Download quarterly full database
    python scraper.py --dry-run           # Show config, no downloads
    python scraper.py --skip-download     # Parse existing local file(s)
    python scraper.py --push-sheet        # Also push results to Google Sheets (needs GOOGLE_SERVICE_ACCOUNT_JSON env var)
"""

import argparse
import csv
import os
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SFTP_HOST = "sftp.floridados.gov"
SFTP_USER = "Public"
SFTP_PASS = "PubAccess1845!"

# Sunbiz SFTP directory structure (verify on first run — see README)
# Daily files:   /Public/Daily/cor_data_MMDDYYYY.txt  (or similar pattern)
# Quarterly files: /Public/Quarterly/cor_data_0.txt through cor_data_9.txt
#
# IMPORTANT: The exact directory paths and filename patterns may differ.
# On first run, the script will list the SFTP directory contents so you
# can update these constants if needed. See the --list-sftp flag.
SFTP_DAILY_DIR = "/Public/doc/cor"
SFTP_QUARTERLY_DIR = "/Public/doc/Quarterly/Cor"
SFTP_DAILY_PREFIX = ""          # Files are named YYYYMMDDc.txt
SFTP_DAILY_SUFFIX = "c.txt"    # e.g. 20260226c.txt
SFTP_QUARTERLY_PREFIX = "cordata"

RECORD_LENGTH = 1440

# ---------------------------------------------------------------------------
# Sunbiz Corporate File Field Layout (1440-char fixed-width records)
#
# Source: https://dos.fl.gov/sunbiz/other-services/data-downloads/corporate-data-file/
#
# NOTE: The official Sunbiz definitions page was behind Cloudflare at build
# time. The layout below is reconstructed from multiple references:
#   - Record length = 1440 chars (confirmed by multiple official sources)
#   - Up to 6 officers starting at field 37 (confirmed)
#   - Document numbers are 12 chars (confirmed — matches sunbiz.org search)
#   - Corp names are ~200 chars (estimated from search result display)
#
# ASSUMPTION FLAG: Field positions below are best estimates. After the first
# successful download, run `python scraper.py --inspect` to print the first
# 5 records with character positions so you can verify/adjust.
#
# Each entry: (field_name, start_position, length)
# Positions are 0-indexed.
# ---------------------------------------------------------------------------

FIELD_LAYOUT = [
    # --- Core identification ---
    # Calibrated 2026-02-27 against actual daily file (20260226c.txt)
    ("document_number",           0,   12),
    ("corp_name",                12,  192),
    ("status",                  204,    1),   # A=Active, I=Inactive
    ("filing_type",             205,    4),   # FLAL, FORL, DOMP, DOMNP, etc.

    # --- Principal address ---
    ("principal_address_1",     220,   40),
    ("principal_address_2",     260,   40),
    ("principal_city",          300,   30),
    ("principal_zip",           334,    5),

    # --- Mailing address ---
    ("mailing_address_1",       346,   40),
    ("mailing_address_2",       386,   40),
    ("mailing_city",            426,   30),
    ("mailing_state",           458,    2),
    ("mailing_zip",             460,    5),
    ("mailing_country",         470,    2),   # US, UN, ES, etc. (often blank)

    # --- Filing metadata ---
    ("filing_date",             472,    8),   # MMDDYYYY (no separators)
    ("fei_number",              480,   14),   # Federal EIN
    ("more_than_six_officers",  494,    1),   # N/Y
    ("state_of_incorporation",  503,    2),   # e.g. FL, VA, DE

    # --- Registered agent ---
    ("ra_name",                 544,   42),   # Person: "LAST  FIRST  MI" / Company: name
    ("ra_type",                 586,    1),   # P=person, C=company
    ("ra_address_1",            587,   40),
    ("ra_city",                 629,   28),
    ("ra_state",                657,    2),
    ("ra_zip",                  659,    5),

    # --- Officer 1 (stride=128 chars per officer block) ---
    ("officer1_title",          668,    4),   # MGR, AMBR, CEO, P, VP, etc.
    ("officer1_type",           672,    1),   # P=person, C=company
    ("officer1_last_name",      673,   20),
    ("officer1_first_name",     693,   20),
    ("officer1_address_1",      715,   40),
    ("officer1_city",           757,   28),
    ("officer1_state",          785,    2),
    ("officer1_zip",            787,    5),

    # --- Officer 2 (offset 796 = 668 + 128) ---
    ("officer2_title",          796,    4),
    ("officer2_type",           800,    1),
    ("officer2_last_name",      801,   20),
    ("officer2_first_name",     821,   20),
    ("officer2_address_1",      843,   40),
    ("officer2_city",           885,   28),
    ("officer2_state",          913,    2),
    ("officer2_zip",            915,    5),
]


# ---------------------------------------------------------------------------
# Polk County ZIP Codes
# ---------------------------------------------------------------------------

POLK_COUNTY_ZIPS = {
    "33801", "33802", "33803", "33805", "33806", "33807", "33809",
    "33810", "33811", "33812", "33813", "33815", "33823", "33827",
    "33830", "33831", "33834", "33835", "33836", "33837", "33838",
    "33839", "33840", "33841", "33843", "33844", "33845", "33846",
    "33847", "33849", "33850", "33851", "33853", "33854", "33855",
    "33856", "33858", "33859", "33860", "33863", "33867", "33868",
    "33880", "33881", "33882", "33883", "33884", "33885", "33888",
}

# Entity type codes (Sunbiz filing types)
ENTITY_TYPE_MAP = {
    "DOMP":  "Domestic Profit Corporation",
    "FORP":  "Foreign Profit Corporation",
    "DOMNP": "Domestic Non-Profit Corporation",
    "FORNP": "Foreign Non-Profit Corporation",
    "DOMNA": "Domestic Non-Profit (Articles)",
    "FLAL":  "Florida Limited Liability Company",
    "FORL":  "Foreign Limited Liability Company",
    "LLLP":  "Limited Liability Limited Partnership",
    "FLLP":  "Florida Limited Partnership",
    "FORLP": "Foreign Limited Partnership",
    "FLGP":  "Florida General Partnership",
    "FORGP": "Foreign General Partnership",
}


# ---------------------------------------------------------------------------
# SFTP Download
# ---------------------------------------------------------------------------

def sftp_list_directory(remote_dir: str) -> list[str]:
    """List files in an SFTP directory. Useful for discovering paths."""
    import paramiko

    transport = paramiko.Transport((SFTP_HOST, 22))
    transport.connect(username=SFTP_USER, password=SFTP_PASS)
    sftp = paramiko.SFTPClient.from_transport(transport)

    try:
        files = sftp.listdir(remote_dir)
        return sorted(files)
    except FileNotFoundError:
        print(f"  Directory not found: {remote_dir}")
        return []
    finally:
        sftp.close()
        transport.close()


def sftp_download_file(remote_path: str, local_path: str) -> bool:
    """Download a single file from the Sunbiz SFTP server."""
    import paramiko

    local_dir = os.path.dirname(local_path)
    os.makedirs(local_dir, exist_ok=True)

    print(f"  Connecting to {SFTP_HOST}...")
    transport = paramiko.Transport((SFTP_HOST, 22))
    transport.connect(username=SFTP_USER, password=SFTP_PASS)
    sftp = paramiko.SFTPClient.from_transport(transport)

    try:
        file_stat = sftp.stat(remote_path)
        file_size_mb = file_stat.st_size / (1024 * 1024)
        print(f"  Downloading {remote_path} ({file_size_mb:.1f} MB)...")
        sftp.get(remote_path, local_path)
        print(f"  Saved to {local_path}")
        return True
    except FileNotFoundError:
        print(f"  ERROR: Remote file not found: {remote_path}")
        return False
    except Exception as e:
        print(f"  ERROR downloading: {e}")
        return False
    finally:
        sftp.close()
        transport.close()


def discover_sftp_structure() -> dict:
    """Explore the SFTP server to find directory structure and file names."""
    import paramiko

    print("\n[Discovery] Connecting to SFTP to explore directory structure...")
    transport = paramiko.Transport((SFTP_HOST, 22))
    transport.connect(username=SFTP_USER, password=SFTP_PASS)
    sftp = paramiko.SFTPClient.from_transport(transport)

    structure = {}
    try:
        # List root
        root_items = sftp.listdir("/")
        print(f"  Root: {root_items}")
        structure["/"] = root_items

        # Try common paths
        for test_dir in [
            "/Public", "/public",
            "/Public/Daily", "/Public/Quarterly",
            "/Daily", "/Quarterly",
            "/Corporate", "/corporate",
            "/Public/Corporate", "/Public/Corporate/Daily",
            "/Public/Corporate/Quarterly",
            "/cor", "/Corp",
        ]:
            try:
                items = sftp.listdir(test_dir)
                # Only show first 20 items if there are many
                display = items[:20]
                if len(items) > 20:
                    display.append(f"... and {len(items) - 20} more")
                print(f"  {test_dir}: {display}")
                structure[test_dir] = items
            except Exception:
                pass  # Directory doesn't exist

    finally:
        sftp.close()
        transport.close()

    return structure


def download_daily_file(data_dir: str, date_str: str = None) -> str | None:
    """Download today's (or specified date's) daily corporate data file.

    Tries several filename patterns since the exact naming convention
    varies. Returns the local file path on success, None on failure.
    """
    if date_str is None:
        date_str = datetime.now().strftime("%m%d%Y")

    # Try multiple filename patterns
    patterns = [
        f"{SFTP_DAILY_PREFIX}{date_str}.txt",
        f"cor{date_str}.txt",
        f"corp_{date_str}.txt",
        f"corporate_{date_str}.txt",
        f"cor_data_{date_str}.dat",
        f"cor_{date_str}.dat",
    ]

    # Also try YYYYMMDD format (actual Sunbiz naming: YYYYMMDDc.txt)
    try:
        dt = datetime.strptime(date_str, "%m%d%Y")
        alt_date = dt.strftime("%Y%m%d")
        patterns.extend([
            f"{alt_date}{SFTP_DAILY_SUFFIX}",     # 20260226c.txt (primary)
            f"{SFTP_DAILY_PREFIX}{alt_date}.txt",
            f"cor{alt_date}.txt",
            f"corp_{alt_date}.txt",
        ])
    except ValueError:
        pass

    # Daily files live directly in /Public/doc/cor/ alongside year subdirectories.
    # Files are named YYYYMMDDc.txt (e.g. 20260226c.txt).
    print(f"\n  Checking daily files in {SFTP_DAILY_DIR}...")
    available = sftp_list_directory(SFTP_DAILY_DIR)
    if available:
        # Filter to only actual daily data files (ending in c.txt), not subdirs or WELCOME.TXT
        daily_files = sorted([f for f in available if f.endswith(SFTP_DAILY_SUFFIX)])
        print(f"  Found {len(daily_files)} daily files (last 5: {daily_files[-5:]})")

        # Try exact matches first
        for pattern in patterns:
            if pattern in available:
                remote_path = f"{SFTP_DAILY_DIR}/{pattern}"
                local_path = os.path.join(data_dir, f"daily_{date_str}.txt")
                if sftp_download_file(remote_path, local_path):
                    return local_path

        # Fall back to most recent daily file
        if daily_files:
            latest = daily_files[-1]
            print(f"  Using most recent daily file: {latest}")
            remote_path = f"{SFTP_DAILY_DIR}/{latest}"
            local_path = os.path.join(data_dir, f"daily_{latest}")
            if sftp_download_file(remote_path, local_path):
                return local_path
    else:
        # Directory listing failed — try patterns blindly
        for pattern in patterns:
            remote_path = f"{SFTP_DAILY_DIR}/{pattern}"
            local_path = os.path.join(data_dir, f"daily_{date_str}.txt")
            if sftp_download_file(remote_path, local_path):
                return local_path

    print("  Could not find a matching daily file.")
    return None


def download_quarterly_files(data_dir: str) -> list[str]:
    """Download all quarterly corporate data files (cor_data_0 through cor_data_9).

    Returns list of local file paths that were successfully downloaded.
    """
    downloaded = []

    print(f"\n  Checking quarterly files in {SFTP_QUARTERLY_DIR}...")
    available = sftp_list_directory(SFTP_QUARTERLY_DIR)
    if available:
        print(f"  Available: {available[:15]}")

    # Try known patterns for quarterly files (split into 10 parts, 0-9)
    for i in range(10):
        patterns = [
            f"{SFTP_QUARTERLY_PREFIX}{i}.txt",
            f"cor_data_{i}.dat",
            f"cor{i}.txt",
            f"corp_{i}.txt",
        ]

        found = False
        for pattern in patterns:
            if available and pattern in available:
                remote_path = f"{SFTP_QUARTERLY_DIR}/{pattern}"
                local_path = os.path.join(data_dir, f"quarterly_{i}.txt")
                if sftp_download_file(remote_path, local_path):
                    downloaded.append(local_path)
                    found = True
                    break

        if not found and not available:
            # Try blind download
            remote_path = f"{SFTP_QUARTERLY_DIR}/{patterns[0]}"
            local_path = os.path.join(data_dir, f"quarterly_{i}.txt")
            if sftp_download_file(remote_path, local_path):
                downloaded.append(local_path)

    # If numbered files failed, look for any corporate files
    if not downloaded and available:
        cor_files = [f for f in available if f.lower().startswith("cor")]
        for cf in cor_files[:10]:
            remote_path = f"{SFTP_QUARTERLY_DIR}/{cf}"
            local_path = os.path.join(data_dir, f"quarterly_{cf}")
            if sftp_download_file(remote_path, local_path):
                downloaded.append(local_path)

    print(f"  Downloaded {len(downloaded)} quarterly files")
    return downloaded


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def extract_field(line: str, start: int, length: int) -> str:
    """Extract a fixed-width field from a record line, stripping whitespace."""
    try:
        return line[start:start + length].strip()
    except IndexError:
        return ""


def parse_record(line: str) -> dict | None:
    """Parse a single 1440-char fixed-width record into a dict.

    Returns None if the record appears invalid (too short, blank doc number).
    """
    # Skip lines that are too short or clearly not data
    if len(line.rstrip()) < 100:
        return None

    record = {}
    for field_name, start, length in FIELD_LAYOUT:
        record[field_name] = extract_field(line, start, length)

    # Validate — must have a document number
    if not record.get("document_number"):
        return None

    return record


def normalize_zip(raw_zip: str) -> str:
    """Extract the 5-digit ZIP from various formats (33801, 33801-1234, etc.)."""
    if not raw_zip:
        return ""
    # Take first 5 digits
    digits = re.sub(r"[^0-9]", "", raw_zip)
    return digits[:5] if len(digits) >= 5 else digits


def is_polk_county(record: dict) -> bool:
    """Check if a record's principal OR mailing address is in Polk County."""
    principal_zip = normalize_zip(record.get("principal_zip", ""))
    mailing_zip = normalize_zip(record.get("mailing_zip", ""))
    return principal_zip in POLK_COUNTY_ZIPS or mailing_zip in POLK_COUNTY_ZIPS


def get_entity_type(code: str) -> str:
    """Convert filing type code to human-readable entity type."""
    return ENTITY_TYPE_MAP.get(code.upper().strip(), code.strip() or "Unknown")


def build_full_address(addr1: str, addr2: str, city: str, state: str,
                       zip_code: str) -> str:
    """Combine address fields into a single string."""
    parts = [p for p in [addr1, addr2] if p]
    addr = ", ".join(parts)
    city_state_zip = ", ".join([p for p in [city, state] if p])
    if zip_code:
        city_state_zip += f" {zip_code}"
    if addr and city_state_zip:
        return f"{addr}, {city_state_zip}"
    return addr or city_state_zip


def record_to_output(record: dict) -> dict:
    """Transform a parsed record into the output schema for CSV/Sheets."""
    principal_zip_raw = record.get("principal_zip", "")
    mailing_zip_raw = record.get("mailing_zip", "")

    # Determine which address is in Polk County for the city/state/zip columns
    # Note: principal address has no explicit state field (FL implied)
    principal_zip5 = normalize_zip(principal_zip_raw)
    mailing_state = record.get("mailing_state", "")
    if principal_zip5 in POLK_COUNTY_ZIPS:
        city = record.get("principal_city", "")
        state = "FL"
        zip_code = principal_zip_raw
    else:
        city = record.get("mailing_city", "")
        state = mailing_state
        zip_code = mailing_zip_raw

    principal_address = build_full_address(
        record.get("principal_address_1", ""),
        record.get("principal_address_2", ""),
        record.get("principal_city", ""),
        "FL",
        principal_zip_raw,
    )
    mailing_address = build_full_address(
        record.get("mailing_address_1", ""),
        record.get("mailing_address_2", ""),
        record.get("mailing_city", ""),
        mailing_state,
        mailing_zip_raw,
    )

    # Get primary officer (last + first name fields)
    off_type = record.get("officer1_type", "")
    off_last = record.get("officer1_last_name", "")
    off_first = record.get("officer1_first_name", "")
    if off_type == "C":
        # Company name spans both fields as one string
        officer_name = " ".join(f"{off_last} {off_first}".split())
    else:
        officer_name = " ".join(f"{off_first} {off_last}".split()) if (off_last or off_first) else ""
    officer_title = record.get("officer1_title", "")

    return {
        "business_name":     record.get("corp_name", ""),
        "document_number":   record.get("document_number", ""),
        "entity_type":       get_entity_type(record.get("filing_type", "")),
        "filing_date":       normalize_filing_date(record.get("filing_date", "")),
        "status":            "Active" if record.get("status", "") == "A" else record.get("status", ""),
        "principal_address": principal_address,
        "mailing_address":   mailing_address,
        "city":              city,
        "state":             state,
        "zip":               normalize_zip(zip_code),
        "registered_agent":  " ".join(record.get("ra_name", "").split()),
        "officer_name":      officer_name,
        "officer_title":     officer_title,
        "fei_number":        record.get("fei_number", ""),
    }


def parse_file(filepath: str, filter_polk: bool = True,
               active_only: bool = False) -> list[dict]:
    """Parse a Sunbiz fixed-width file and return filtered output records.

    Args:
        filepath: Path to the downloaded .txt data file.
        filter_polk: If True, only return Polk County records.
        active_only: If True, only return records with ACT status.

    Returns:
        List of output-format dicts ready for CSV/Sheets.
    """
    results = []
    errors = 0
    total = 0

    # Try multiple encodings — Sunbiz files may use latin-1 or cp1252
    for encoding in ["utf-8", "latin-1", "cp1252"]:
        try:
            with open(filepath, "r", encoding=encoding, errors="replace") as f:
                for line_num, line in enumerate(f, 1):
                    total += 1
                    record = parse_record(line)
                    if record is None:
                        errors += 1
                        continue

                    if active_only and record.get("status", "").upper() != "A":
                        continue

                    if filter_polk and not is_polk_county(record):
                        continue

                    results.append(record_to_output(record))
            break  # Encoding worked
        except UnicodeDecodeError:
            continue

    print(f"  Parsed {filepath}: {total} records, {errors} skipped, "
          f"{len(results)} matched")
    return results


# ---------------------------------------------------------------------------
# Inspection (for verifying field layout)
# ---------------------------------------------------------------------------

def inspect_file(filepath: str, num_records: int = 5):
    """Print the first N records with character positions for layout verification.

    Use this to check if the FIELD_LAYOUT positions are correct.
    """
    print(f"\n{'=' * 80}")
    print(f"INSPECTING: {filepath}")
    print(f"{'=' * 80}")

    for encoding in ["utf-8", "latin-1", "cp1252"]:
        try:
            with open(filepath, "r", encoding=encoding, errors="replace") as f:
                for i, line in enumerate(f):
                    if i >= num_records:
                        break

                    line = line.rstrip("\n\r")
                    print(f"\n--- Record {i + 1} (length: {len(line)}) ---")

                    # Print ruler
                    ruler = ""
                    for j in range(0, min(len(line), 200), 10):
                        ruler += f"{j:<10}"
                    print(f"POS:  {ruler}")
                    print(f"DATA: {line[:200]}")
                    if len(line) > 200:
                        print(f"      ... ({len(line) - 200} more chars)")

                    # Extract and display known fields
                    print(f"\n  Extracted fields:")
                    for field_name, start, length in FIELD_LAYOUT[:20]:
                        value = extract_field(line, start, length)
                        if value:
                            print(f"    {field_name:30s} [{start:4d}:{start+length:4d}] = '{value}'")
            break
        except UnicodeDecodeError:
            continue

    print(f"\n{'=' * 80}")


# ---------------------------------------------------------------------------
# CSV Output
# ---------------------------------------------------------------------------

CSV_COLUMNS = [
    "business_name", "document_number", "entity_type", "filing_date",
    "status", "principal_address", "mailing_address", "city", "state",
    "zip", "registered_agent", "officer_name", "officer_title", "fei_number",
]


def save_csv(records: list[dict], filepath: str):
    """Save filtered records to a CSV file."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)

    print(f"  Saved {len(records)} records to {filepath}")


# ---------------------------------------------------------------------------
# Google Sheets Output
# ---------------------------------------------------------------------------

SHEET_HEADERS = [
    "Business Name", "Document Number", "Entity Type", "Filing Date",
    "Status", "Principal Address", "Mailing Address", "City", "State",
    "ZIP", "Registered Agent", "Officer Name", "Officer Title", "FEI/EIN",
    "First Seen", "Last Updated",
]

MAIL_QUEUE_HEADERS = [
    "Business Name", "Address", "City", "State", "ZIP",
    "Date Added", "Status", "Notes",
]

MAILED_HEADERS = [
    "Business Name", "Address", "City", "State", "ZIP",
    "Date Mailed", "Postcard Design", "Response", "Notes",
]


def records_to_sheet_rows(records: list[dict]) -> list[list[str]]:
    """Convert output records to a list of lists for Google Sheets."""
    rows = []
    for r in records:
        rows.append([
            r.get("business_name", ""),
            r.get("document_number", ""),
            r.get("entity_type", ""),
            r.get("filing_date", ""),
            r.get("status", ""),
            r.get("principal_address", ""),
            r.get("mailing_address", ""),
            r.get("city", ""),
            r.get("state", ""),
            r.get("zip", ""),
            r.get("registered_agent", ""),
            r.get("officer_name", ""),
            r.get("officer_title", ""),
            r.get("fei_number", ""),
            r.get("first_seen", ""),
            r.get("last_updated", ""),
        ])
    return rows


def generate_sheets_payload(all_records: list[dict],
                            new_records: list[dict]) -> dict:
    """Generate a payload dict with all tab data for Google Sheets.

    Returns a dict with keys for each tab, containing headers and rows.
    This can be used directly by the MCP integration or saved as JSON.
    """
    return {
        "sheet_name": "Polk County Business Directory — Spark Sites",
        "tabs": {
            "All Businesses": {
                "headers": SHEET_HEADERS,
                "rows": records_to_sheet_rows(all_records),
            },
            "New This Week": {
                "headers": SHEET_HEADERS,
                "rows": records_to_sheet_rows(new_records),
            },
            "Mail Queue": {
                "headers": MAIL_QUEUE_HEADERS,
                "rows": [],  # Starts empty
            },
            "Mailed": {
                "headers": MAILED_HEADERS,
                "rows": [],  # Starts empty
            },
        },
    }


def save_sheets_payload(payload: dict, filepath: str):
    """Save the sheets payload as JSON for Claude Code to process."""
    import json
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    print(f"  Sheets payload saved to {filepath}")


# ---------------------------------------------------------------------------
# Google Sheets Push (via gspread + service account)
# ---------------------------------------------------------------------------

SHEET_ID = "1-zz0XifJir4UkioL97nGXWxshYMwXPUaEpjbMRC_RfE"


# Map from sheet column headers to internal dict keys
_HEADER_TO_KEY = {
    "Business Name": "business_name",
    "Document Number": "document_number",
    "Entity Type": "entity_type",
    "Filing Date": "filing_date",
    "Status": "status",
    "Principal Address": "principal_address",
    "Mailing Address": "mailing_address",
    "City": "city",
    "State": "state",
    "ZIP": "zip",
    "Registered Agent": "registered_agent",
    "Officer Name": "officer_name",
    "Officer Title": "officer_title",
    "FEI/EIN": "fei_number",
    "First Seen": "first_seen",
    "Last Updated": "last_updated",
}


def _row_to_record(row: list[str]) -> dict:
    """Convert a sheet row back to an internal record dict."""
    record = {}
    for i, header in enumerate(SHEET_HEADERS):
        key = _HEADER_TO_KEY.get(header, header.lower().replace(" ", "_"))
        record[key] = row[i] if i < len(row) else ""
    return record


def push_to_google_sheets(today_records: list[dict], new_records: list[dict]):
    """Push data to Google Sheets with accumulation (merge, don't replace).

    Reads existing "All Businesses" data, merges in today's records
    (deduplicating by document_number), preserves "First Seen" dates for
    existing records, and updates "Last Updated" for everything seen today.

    "New This Week" shows businesses first seen within the last 7 days.

    Does NOT touch "Mail Queue" or "Mailed" tabs.

    Requires env var GOOGLE_SERVICE_ACCOUNT_JSON containing the full
    JSON key file contents for a Google Cloud service account that has
    Editor access to the target sheet.
    """
    import json as _json
    import gspread
    from google.oauth2.service_account import Credentials

    sa_json = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "")
    if not sa_json:
        print("  ERROR: GOOGLE_SERVICE_ACCOUNT_JSON env var not set.")
        print("  Set it to the full JSON contents of your service account key.")
        sys.exit(1)

    print("  Authenticating with Google Sheets API...")
    creds_info = _json.loads(sa_json)
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ]
    creds = Credentials.from_service_account_info(creds_info, scopes=scopes)
    gc = gspread.authorize(creds)

    print(f"  Opening sheet {SHEET_ID}...")
    spreadsheet = gc.open_by_key(SHEET_ID)

    today_str = datetime.now().strftime("%m/%d/%Y")

    # --- Read existing "All Businesses" data ---
    existing = {}  # document_number -> dict
    try:
        ws = spreadsheet.worksheet("All Businesses")
        rows = ws.get_all_values()
        if len(rows) > 1:  # Has header + data
            headers = rows[0]
            doc_num_idx = headers.index("Document Number") if "Document Number" in headers else 1
            first_seen_idx = headers.index("First Seen") if "First Seen" in headers else None
            last_updated_idx = headers.index("Last Updated") if "Last Updated" in headers else None
            for row in rows[1:]:
                if len(row) > doc_num_idx and row[doc_num_idx]:
                    doc_num = row[doc_num_idx]
                    existing[doc_num] = {
                        "row": row,
                        "first_seen": row[first_seen_idx] if first_seen_idx is not None and len(row) > first_seen_idx else "",
                        "last_updated": row[last_updated_idx] if last_updated_idx is not None and len(row) > last_updated_idx else "",
                    }
            print(f"  Read {len(existing)} existing records from 'All Businesses'")
    except gspread.WorksheetNotFound:
        print(f"  'All Businesses' tab not found — will create it")

    # --- Merge today's records into existing ---
    new_count = 0
    updated_count = 0
    for r in today_records:
        doc_num = r.get("document_number", "")
        if not doc_num:
            continue
        if doc_num in existing:
            # Existing record — preserve first_seen, update the rest
            r["first_seen"] = existing[doc_num]["first_seen"] or today_str
            r["last_updated"] = today_str
            updated_count += 1
        else:
            # New record — set first_seen to today
            r["first_seen"] = today_str
            r["last_updated"] = today_str
            new_count += 1
        existing[doc_num] = {"record": r}

    # Build merged list: update existing entries with today's data, keep old ones unchanged
    merged_records = []
    for doc_num, entry in existing.items():
        if "record" in entry:
            # This was seen today (new or updated)
            merged_records.append(entry["record"])
        else:
            # Old record not seen today — convert row back to dict
            row = entry["row"]
            record = _row_to_record(row)
            merged_records.append(record)

    print(f"  Merge result: {new_count} new, {updated_count} updated, "
          f"{len(merged_records)} total")

    # --- Write "All Businesses" tab ---
    all_rows = [SHEET_HEADERS] + records_to_sheet_rows(merged_records)
    _update_tab(spreadsheet, "All Businesses", all_rows)

    # --- "New This Week" = businesses first seen within the last 7 days ---
    cutoff = datetime.now() - timedelta(days=7)
    new_this_week = []
    for r in merged_records:
        first_seen = r.get("first_seen", "")
        if not first_seen:
            continue
        for fmt in ["%m/%d/%Y", "%m%d%Y", "%Y-%m-%d"]:
            try:
                fs_dt = datetime.strptime(first_seen, fmt)
                if fs_dt >= cutoff:
                    new_this_week.append(r)
                break
            except ValueError:
                continue

    new_rows = [SHEET_HEADERS] + records_to_sheet_rows(new_this_week)
    _update_tab(spreadsheet, "New This Week", new_rows)

    print(f"  Google Sheets updated: {len(merged_records)} total, "
          f"{len(new_this_week)} new this week, {new_count} first-time seen today")

    return {
        "total": len(merged_records),
        "new_today": new_count,
        "updated_today": updated_count,
        "new_this_week": len(new_this_week),
    }


def _update_tab(spreadsheet, tab_name: str, rows: list[list[str]]):
    """Clear a tab and write new rows. Creates the tab if it doesn't exist."""
    import gspread

    try:
        ws = spreadsheet.worksheet(tab_name)
    except gspread.WorksheetNotFound:
        print(f"  Creating tab '{tab_name}'...")
        ws = spreadsheet.add_worksheet(title=tab_name, rows=len(rows), cols=len(rows[0]))

    ws.clear()
    if rows:
        ws.update(rows, "A1")
    print(f"  '{tab_name}' updated: {len(rows) - 1} data rows")


# ---------------------------------------------------------------------------
# Email Notification
# ---------------------------------------------------------------------------

SHEET_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit"
EMAIL_FROM = "grant@stateofthespark.com"
EMAIL_TO = ["grant@grantsparks.me"]


def send_notification_email(stats: dict):
    """Send a simple notification email after a successful Biz Scout run.

    Requires env var GMAIL_APP_PASSWORD (same as Event Scout).
    """
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    app_password = os.environ.get("GMAIL_APP_PASSWORD")
    if not app_password:
        print("  WARNING: GMAIL_APP_PASSWORD not set. Skipping email.")
        return

    today_str = datetime.now().strftime("%A, %b %d")
    subject = f"Biz Scout — {today_str}"

    total = stats.get("total", 0)
    new_today = stats.get("new_today", 0)
    new_this_week = stats.get("new_this_week", 0)

    plain = (
        f"Biz Scout ran successfully on {today_str}.\n\n"
        f"New businesses found today: {new_today}\n"
        f"New this week: {new_this_week}\n"
        f"Total in directory: {total}\n\n"
        f"View the sheet: {SHEET_URL}\n"
    )

    html = f"""\
<html><body style="font-family: Arial, sans-serif; color: #333; max-width: 500px;">
<h2 style="color: #e8491d; margin-bottom: 4px;">Biz Scout</h2>
<p style="color: #888; margin-top: 0;">{today_str}</p>
<hr style="border: none; border-top: 1px solid #eee;">
<table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
  <tr>
    <td style="padding: 8px 12px; background: #f9f9f9; font-weight: bold;">New today</td>
    <td style="padding: 8px 12px; background: #f9f9f9; text-align: right; font-size: 18px;">{new_today}</td>
  </tr>
  <tr>
    <td style="padding: 8px 12px;">New this week</td>
    <td style="padding: 8px 12px; text-align: right; font-size: 18px;">{new_this_week}</td>
  </tr>
  <tr>
    <td style="padding: 8px 12px; background: #f9f9f9;">Total in directory</td>
    <td style="padding: 8px 12px; background: #f9f9f9; text-align: right; font-size: 18px;">{total}</td>
  </tr>
</table>
<p><a href="{SHEET_URL}" style="display: inline-block; padding: 10px 20px; background: #e8491d; color: #fff; text-decoration: none; border-radius: 4px;">Open Spreadsheet</a></p>
<hr style="border: none; border-top: 1px solid #eee;">
<p style="color: #aaa; font-size: 12px;">Polk County Business Directory — automated by Biz Scout</p>
</body></html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = EMAIL_FROM
    msg["To"] = ", ".join(EMAIL_TO)
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_FROM, app_password)
            server.sendmail(EMAIL_FROM, EMAIL_TO, msg.as_string())
        print(f"  Email sent to: {', '.join(EMAIL_TO)}")
    except Exception as e:
        print(f"  ERROR sending email: {e}")


# ---------------------------------------------------------------------------
# Recent filings filter (for "New This Week" tab)
# ---------------------------------------------------------------------------

def normalize_filing_date(raw_date: str) -> str:
    """Convert MMDDYYYY to MM/DD/YYYY for display."""
    raw_date = raw_date.strip()
    if len(raw_date) == 8 and raw_date.isdigit():
        return f"{raw_date[0:2]}/{raw_date[2:4]}/{raw_date[4:8]}"
    return raw_date  # Already formatted or unknown


def filter_recent(records: list[dict], days: int = 7) -> list[dict]:
    """Filter records to only those filed within the last N days."""
    cutoff = datetime.now() - timedelta(days=days)
    recent = []
    for r in records:
        filing_date_str = r.get("filing_date", "")
        if not filing_date_str:
            continue
        # Try all known date formats
        for fmt in ["%m/%d/%Y", "%m%d%Y", "%Y-%m-%d"]:
            try:
                filing_dt = datetime.strptime(filing_date_str, fmt)
                if filing_dt >= cutoff:
                    recent.append(r)
                break
            except ValueError:
                continue
    return recent


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Biz Scout — Sunbiz business data scraper for Polk County"
    )
    parser.add_argument(
        "--quarterly", action="store_true",
        help="Download the full quarterly database (large, ~500MB+ total)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Show configuration without downloading anything"
    )
    parser.add_argument(
        "--skip-download", action="store_true",
        help="Parse existing local files instead of downloading"
    )
    parser.add_argument(
        "--inspect", action="store_true",
        help="Print first 5 records with character positions for layout verification"
    )
    parser.add_argument(
        "--list-sftp", action="store_true",
        help="Explore SFTP server directory structure and exit"
    )
    parser.add_argument(
        "--push-sheet", action="store_true",
        help="Push results directly to Google Sheets via service account"
    )
    parser.add_argument(
        "--active-only", action="store_true",
        help="Only include businesses with ACT (active) status"
    )
    parser.add_argument(
        "--date", type=str, default=None,
        help="Date for daily file in MMDDYYYY format (default: today)"
    )
    parser.add_argument(
        "--days", type=int, default=7,
        help="Number of days back for 'New This Week' filter (default: 7)"
    )
    args = parser.parse_args()

    script_dir = Path(__file__).parent
    data_dir = script_dir / "data"

    print("=" * 60)
    print("BIZ SCOUT — Sunbiz Business Data Scraper")
    print("=" * 60)
    print(f"  SFTP Server:    {SFTP_HOST}")
    print(f"  Target:         Polk County, FL ({len(POLK_COUNTY_ZIPS)} ZIP codes)")
    print(f"  Mode:           {'Quarterly (full DB)' if args.quarterly else 'Daily (new filings)'}")
    print(f"  Active only:    {args.active_only}")
    print(f"  Output dir:     {data_dir}")

    if args.dry_run:
        print("\n[DRY RUN] Configuration shown above. No downloads or processing.")
        print(f"\n  Polk County ZIPs: {', '.join(sorted(POLK_COUNTY_ZIPS))}")
        print(f"  Entity types tracked: {len(ENTITY_TYPE_MAP)}")
        print(f"  Field layout: {len(FIELD_LAYOUT)} fields defined")
        print(f"  Record length: {RECORD_LENGTH} chars")
        return

    if args.list_sftp:
        structure = discover_sftp_structure()
        print("\n[Discovery Complete]")
        print("  Update SFTP_DAILY_DIR, SFTP_QUARTERLY_DIR, and filename")
        print("  patterns in scraper.py based on the paths found above.")
        return

    # --- Download or locate files ---
    files_to_parse = []

    if args.skip_download:
        print("\n[1/4] Skipping download — looking for local files...")
        local_files = list(data_dir.glob("*.txt")) + list(data_dir.glob("*.dat"))
        if not local_files:
            print("  ERROR: No data files found in", data_dir)
            print("  Run without --skip-download to fetch from Sunbiz.")
            sys.exit(1)
        files_to_parse = [str(f) for f in local_files]
        print(f"  Found {len(files_to_parse)} local files")
    elif args.quarterly:
        print("\n[1/4] Downloading quarterly data (this may take a while)...")
        files_to_parse = download_quarterly_files(str(data_dir))
        if not files_to_parse:
            print("  ERROR: No quarterly files downloaded.")
            print("  Run --list-sftp to check the SFTP directory structure.")
            sys.exit(1)
    else:
        date_str = args.date or datetime.now().strftime("%m%d%Y")
        print(f"\n[1/4] Downloading daily data for {date_str}...")
        daily_file = download_daily_file(str(data_dir), date_str)
        if daily_file:
            files_to_parse = [daily_file]
        else:
            # Try yesterday and day before
            for days_back in [1, 2, 3]:
                alt_date = (datetime.now() - timedelta(days=days_back)).strftime("%m%d%Y")
                print(f"  Trying {days_back} day(s) ago ({alt_date})...")
                daily_file = download_daily_file(str(data_dir), alt_date)
                if daily_file:
                    files_to_parse = [daily_file]
                    break

            if not files_to_parse:
                print("  ERROR: Could not download any daily file.")
                print("  Try --list-sftp to discover the directory structure.")
                sys.exit(1)

    # --- Inspect mode ---
    if args.inspect:
        for fp in files_to_parse:
            inspect_file(fp)
        return

    # --- Parse files ---
    print(f"\n[2/4] Parsing {len(files_to_parse)} file(s)...")
    all_records = []
    for fp in files_to_parse:
        records = parse_file(fp, filter_polk=True, active_only=args.active_only)
        all_records.extend(records)

    # Deduplicate by document_number
    seen_docs = set()
    unique_records = []
    for r in all_records:
        doc_num = r.get("document_number", "")
        if doc_num and doc_num not in seen_docs:
            seen_docs.add(doc_num)
            unique_records.append(r)

    print(f"  Total Polk County records: {len(all_records)}")
    print(f"  After dedup: {len(unique_records)}")
    all_records = unique_records

    # --- Filter recent filings ---
    print(f"\n[3/4] Filtering recent filings (last {args.days} days)...")
    new_records = filter_recent(all_records, days=args.days)
    print(f"  New filings in last {args.days} days: {len(new_records)}")

    # --- Output ---
    print(f"\n[4/4] Saving output...")

    # CSV
    csv_path = str(data_dir / "polk-county-businesses.csv")
    save_csv(all_records, csv_path)

    if new_records:
        new_csv_path = str(data_dir / "polk-county-new-this-week.csv")
        save_csv(new_records, new_csv_path)

    # Google Sheets push + email notification
    if args.push_sheet:
        print(f"\n[5/5] Pushing to Google Sheets...")
        stats = push_to_google_sheets(all_records, new_records)
        if stats:
            send_notification_email(stats)

    # --- Summary ---
    print(f"\n{'=' * 60}")
    print(f"DONE!")
    print(f"  Total Polk County businesses: {len(all_records)}")
    print(f"  New this week: {len(new_records)}")
    print(f"  CSV saved: {csv_path}")
    if args.push_sheet:
        print(f"  Google Sheet updated: {SHEET_ID}")
    print(f"{'=' * 60}")

    # Show a few sample records
    if all_records:
        print(f"\n  Sample records:")
        for r in all_records[:5]:
            print(f"    {r['business_name'][:50]:50s} | {r['entity_type']:30s} | {r['city']}, {r['state']} {r['zip']}")


if __name__ == "__main__":
    main()
