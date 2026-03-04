# Biz Scout — Sunbiz Business Data Scraper

Headless agent that downloads Florida business registration data from the Division of Corporations (Sunbiz), filters for Polk County, and outputs to CSV and Google Sheets.

## Data Source

- **Provider:** Florida Division of Corporations (Sunbiz)
- **URL:** https://dos.fl.gov/sunbiz/other-services/data-downloads/
- **SFTP Server:** sftp.floridados.gov
- **Credentials:** Public / PubAccess1845! (published on the Sunbiz site)
- **Format:** Fixed-width ASCII text, 1440 characters per record

### File Types

| Type | What | Size |
|------|------|------|
| **Daily** | New filings from that day | Small (~1-5 MB) |
| **Quarterly** | All active entities (split into 10 files, 0-9) | Large (~500 MB total) |

## Setup

```bash
cd agents/biz-scout
pip install -r requirements.txt
```

The only dependency is `paramiko` for SFTP access. Everything else uses the Python standard library.

## Usage

### First Run: Discover SFTP Structure

The SFTP directory paths may change. Run this first to verify:

```bash
python scraper.py --list-sftp
```

This connects to the SFTP server and prints the directory tree. Update the path constants in `scraper.py` if they differ from the defaults.

### Verify Field Layout

After downloading your first file, verify the fixed-width field positions:

```bash
python scraper.py --inspect
```

This prints the first 5 records with character positions and extracted field values. If the data looks misaligned, adjust `FIELD_LAYOUT` in `scraper.py`.

### Daily Run (New Filings)

```bash
python scraper.py                    # Download today's daily file
python scraper.py --date 02272026    # Specific date (MMDDYYYY)
python scraper.py --active-only      # Only active businesses
```

### Full Database (Quarterly)

```bash
python scraper.py --quarterly        # Download all 10 quarterly files
```

Warning: This downloads ~500 MB of data and takes several minutes.

### Skip Download (Parse Existing Files)

```bash
python scraper.py --skip-download    # Parse whatever is in data/
```

### Google Sheets Integration

```bash
python scraper.py --push-sheet       # Generate sheets-payload.json
```

This creates a JSON file at `data/sheets-payload.json` containing all tab data formatted for Google Sheets. The actual push to Google Sheets is handled by Claude Code's MCP tools.

**Sheet structure:**
- **All Businesses** — Full Polk County database
- **New This Week** — Recent registrations (last 7 days by default)
- **Mail Queue** — Businesses to send postcards to (starts empty)
- **Mailed** — Tracking sent postcards (starts empty)

### Dry Run

```bash
python scraper.py --dry-run          # Show config, no downloads
```

## Output

| File | What |
|------|------|
| `data/polk-county-businesses.csv` | All Polk County businesses |
| `data/polk-county-new-this-week.csv` | Recent filings only |
| `data/sheets-payload.json` | Google Sheets data (when --push-sheet) |

### CSV Columns

| Column | Description |
|--------|-------------|
| business_name | Legal name of the entity |
| document_number | Sunbiz document number (12 chars) |
| entity_type | LLC, Corp, LP, etc. |
| filing_date | Date filed with the state |
| status | ACT, INACT, ADMIN, etc. |
| principal_address | Full principal address |
| mailing_address | Full mailing address |
| city | City (from whichever address is in Polk County) |
| state | State |
| zip | 5-digit ZIP |
| registered_agent | Registered agent name |
| officer_name | Primary officer name |
| officer_title | Primary officer title |
| fei_number | Federal EIN |

## GitHub Actions Automation (Future)

The workflow file at `.github/workflows/biz-scout.yml` runs this scraper daily at 7 AM ET. It:

1. Downloads the daily Sunbiz file via SFTP
2. Parses and filters for Polk County
3. Saves CSV artifacts
4. (Optional) Pushes to Google Sheets

To enable, add `SFTP_PASSWORD` to GitHub Actions secrets (though it's a public password, keeping it in secrets is best practice).

## Field Layout Notes

The field positions in `FIELD_LAYOUT` are reconstructed from official documentation references. The Sunbiz corporate file definitions page (https://dos.fl.gov/sunbiz/other-services/data-downloads/corporate-data-file/) has the authoritative layout.

If parsing looks wrong, run `--inspect` and compare against the official definitions to adjust field positions.

## Polk County ZIP Codes

48 ZIP codes covering Lakeland, Winter Haven, Bartow, Auburndale, Lake Wales, Haines City, Davenport, Mulberry, and surrounding areas.
