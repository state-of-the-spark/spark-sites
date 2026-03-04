#!/usr/bin/env python3
"""Probe the actual field layout by printing character positions."""
from pathlib import Path

local = Path(__file__).parent / "data" / "20260226c.txt"
with open(local, "rb") as f:
    raw = f.read()

text = raw.decode("latin-1")
lines = text.split("\n")

# Print first record in 40-char chunks with position markers
line = lines[0]
print(f"Record length: {len(line)}")
print()

# Print in chunks to see the data
for start in range(0, min(len(line), 700), 40):
    end = min(start + 40, len(line))
    chunk = line[start:end]
    # Show printable version
    display = chunk.replace(" ", "·")
    print(f"  [{start:4d}:{end:4d}] |{display}|")

print("\n\n=== ALL 3 RECORDS - First 600 chars each ===")
for i, line in enumerate(lines[:5]):
    if len(line) < 100:
        continue
    print(f"\nRECORD {i+1}:")
    for start in range(0, min(len(line), 600), 60):
        end = min(start + 60, len(line))
        chunk = line[start:end]
        print(f"  [{start:4d}:{end:4d}] {chunk}")

# Count total records and find Polk County by searching for known zip codes
polk_zips = {"33801","33803","33805","33809","33810","33811","33812","33813","33815",
             "33823","33830","33836","33837","33838","33839","33841","33843","33844",
             "33849","33850","33853","33860","33868","33880","33881","33884"}
total = 0
polk_count = 0
for line in lines:
    if len(line) >= 1000:
        total += 1
        for z in polk_zips:
            if z in line:
                polk_count += 1
                if polk_count <= 3:
                    print(f"\n=== POLK COUNTY MATCH (zip {z}) ===")
                    print(f"  [0:60]    {line[0:60]}")
                    print(f"  [300:500] {line[300:500]}")
                break

print(f"\n\nTOTAL RECORDS: {total}")
print(f"POLK COUNTY MATCHES: {polk_count}")
