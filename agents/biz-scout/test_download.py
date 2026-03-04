#!/usr/bin/env python3
"""Quick test: download one daily file and inspect the record format."""
import paramiko
from pathlib import Path

SFTP_HOST = "sftp.floridados.gov"
SFTP_USER = "Public"
SFTP_PASS = "PubAccess1845!"

data_dir = Path(__file__).parent / "data"
data_dir.mkdir(exist_ok=True)
local = str(data_dir / "20260226c.txt")

print("Connecting to SFTP...")
t = paramiko.Transport((SFTP_HOST, 22))
t.connect(username=SFTP_USER, password=SFTP_PASS)
sftp = paramiko.SFTPClient.from_transport(t)

print("Downloading 20260226c.txt...")
sftp.get("/Public/doc/cor/20260226c.txt", local)
print(f"Downloaded to {local}")
sftp.close()
t.close()

# Inspect
with open(local, "rb") as f:
    raw = f.read(15000)

text = raw.decode("latin-1")
lines = text.split("\n")
print(f"\nLines in first 15K: {len(lines)}")
print(f"First line length: {len(lines[0])}")

for i, line in enumerate(lines[:3]):
    print(f"\n=== RECORD {i+1} (len={len(line)}) ===")
    print(f"  [0:12]   doc_number:  |{line[0:12]}|")
    print(f"  [12:212] corp_name:   |{line[12:212].strip()}|")
    print(f"  [212:217] filing_type: |{line[212:217]}|")
    print(f"  [217:227] filing_date: |{line[217:227]}|")
    print(f"  [227:232] status:      |{line[227:232]}|")
    print(f"  [342:382] princ_addr1: |{line[342:382].strip()}|")
    print(f"  [422:450] princ_city:  |{line[422:450].strip()}|")
    print(f"  [450:452] princ_state: |{line[450:452]}|")
    print(f"  [452:462] princ_zip:   |{line[452:462].strip()}|")
    print(f"  [464:504] mail_addr1:  |{line[464:504].strip()}|")
    print(f"  [544:572] mail_city:   |{line[544:572].strip()}|")
    print(f"  [572:574] mail_state:  |{line[572:574]}|")
    print(f"  [574:584] mail_zip:    |{line[574:584].strip()}|")
