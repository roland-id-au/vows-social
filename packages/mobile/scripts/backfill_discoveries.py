#!/usr/bin/env python3
"""
Local backfill script to process pending discoveries

Usage:
    python3 scripts/backfill_discoveries.py [--limit N] [--delay SECONDS]

Examples:
    python3 scripts/backfill_discoveries.py                  # Process all
    python3 scripts/backfill_discoveries.py --limit 10       # Process 10
    python3 scripts/backfill_discoveries.py --limit 5 --delay 3  # Process 5 with 3s delay
"""

import requests
import json
import time
import sys
from datetime import datetime

SUPABASE_URL = "https://nidbhgqeyhrudtnizaya.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4OTMwNywiZXhwIjoyMDc0OTY1MzA3fQ.Ae1SOpALHEq0K68a0cwK38ugbHx4hKiqzC28q1Hkf6M"

# Parse command line args
limit = None
delay = 5

for i, arg in enumerate(sys.argv):
    if arg == "--limit" and i + 1 < len(sys.argv):
        limit = int(sys.argv[i + 1])
    elif arg == "--delay" and i + 1 < len(sys.argv):
        delay = int(sys.argv[i + 1])

print("🚀 Starting local backfill...")
print(f"   Delay: {delay}s between requests")
if limit:
    print(f"   Limit: {limit} discoveries")
print()

# Fetch pending discoveries
print("📊 Fetching pending discoveries...")

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json"
}

# Build query
url = f"{SUPABASE_URL}/rest/v1/discovered_listings"
params = {
    "status": "eq.pending_research",
    "order": "engagement_score.desc",
    "select": "*"
}
if limit:
    params["limit"] = limit

response = requests.get(url, headers=headers, params=params)

if response.status_code != 200:
    print(f"❌ Error fetching discoveries: {response.status_code}")
    print(response.text)
    sys.exit(1)

discoveries = response.json()

if not discoveries:
    print("✅ No pending discoveries found!")
    sys.exit(0)

print(f"Found {len(discoveries)} pending discoveries\n")

# Statistics
processed = 0
succeeded = 0
failed = 0
start_time = time.time()

# Process each discovery
for i, discovery in enumerate(discoveries):
    processed += 1
    progress = f"[{processed}/{len(discoveries)}]"

    name = discovery.get('name', 'Unknown')
    location = discovery.get('location', 'Unknown')
    city = discovery.get('city', 'Unknown')
    state = discovery.get('state', 'Unknown')
    service_type = discovery.get('service_type') or 'venue'
    engagement = discovery.get('engagement_score', 0)

    print(f"{progress} 🔍 Researching: {name}")
    print(f"   📍 {location}, {city}")
    print(f"   📊 Engagement: {engagement}/10")
    print(f"   🏷️  Type: {service_type}")

    try:
        # Call deep-research-venue Edge Function
        payload = {
            "venueName": name,
            "location": f"{location}, {city}",
            "city": city,
            "state": state,
            "serviceType": service_type,
            "forceRefresh": False
        }

        research_response = requests.post(
            f"{SUPABASE_URL}/functions/v1/deep-research-venue",
            headers=headers,
            json=payload,
            timeout=60
        )

        if research_response.status_code != 200:
            raise Exception(f"HTTP {research_response.status_code}: {research_response.text}")

        result = research_response.json()

        if result.get('success'):
            succeeded += 1
            listing = result.get('listing', {})
            listing_id = listing.get('id')
            photos = len(listing.get('images', []))
            packages = len(listing.get('packages', []))

            print(f"   ✅ Success! Created listing: {listing_id}")
            print(f"   📸 Photos: {photos}")
            print(f"   📦 Packages: {packages}")

            # Update discovery status
            update_response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/discovered_listings?id=eq.{discovery['id']}",
                headers={**headers, "Prefer": "return=minimal"},
                json={
                    "status": "researched",
                    "listing_id": listing_id,
                    "researched_at": datetime.utcnow().isoformat()
                }
            )

        else:
            failed += 1
            error_msg = result.get('error', 'Unknown error')
            print(f"   ❌ Failed: {error_msg}")

            # Mark as failed
            requests.patch(
                f"{SUPABASE_URL}/rest/v1/discovered_listings?id=eq.{discovery['id']}",
                headers={**headers, "Prefer": "return=minimal"},
                json={"status": "research_failed"}
            )

    except Exception as e:
        failed += 1
        print(f"   ❌ Error: {str(e)}")

        # Mark as failed
        try:
            requests.patch(
                f"{SUPABASE_URL}/rest/v1/discovered_listings?id=eq.{discovery['id']}",
                headers={**headers, "Prefer": "return=minimal"},
                json={"status": "research_failed"}
            )
        except:
            pass

    # Rate limiting
    if processed < len(discoveries):
        print(f"   ⏱️  Waiting {delay}s...")
        time.sleep(delay)

    # Progress summary every 10 items
    if processed % 10 == 0 or processed == len(discoveries):
        elapsed = time.time() - start_time
        rate = processed / elapsed if elapsed > 0 else 0
        remaining = len(discoveries) - processed
        eta = remaining / rate if rate > 0 else 0

        print()
        print("📈 Progress Summary:")
        print(f"   Processed: {processed}/{len(discoveries)}")
        print(f"   ✅ Succeeded: {succeeded}")
        print(f"   ❌ Failed: {failed}")
        print(f"   ⏱️  Elapsed: {int(elapsed)}s")
        print(f"   🚀 Rate: {rate:.2f}/s")
        if remaining > 0:
            print(f"   ⏰ ETA: {int(eta)}s ({int(eta/60)}min)")

    print()

# Final summary
total_time = time.time() - start_time

print("=" * 60)
print("🎉 Backfill Complete!")
print("=" * 60)
print(f"Total Processed: {processed}")
print(f"✅ Succeeded: {succeeded} ({succeeded/processed*100:.0f}%)")
print(f"❌ Failed: {failed} ({failed/processed*100:.0f}%)")
print(f"⏱️  Total Time: {int(total_time)}s ({int(total_time/60)}min)")
print(f"🚀 Average Rate: {processed/total_time:.2f}/s")
print()

# Fetch updated stats
stats_response = requests.get(
    f"{SUPABASE_URL}/rest/v1/discovered_listings",
    headers=headers,
    params={"select": "status"}
)

if stats_response.status_code == 200:
    stats = stats_response.json()
    status_counts = {}
    for item in stats:
        status = item.get('status', 'unknown')
        status_counts[status] = status_counts.get(status, 0) + 1

    print("📊 Updated Discovery Queue:")
    print(f"   Pending: {status_counts.get('pending_research', 0)}")
    print(f"   Researched: {status_counts.get('researched', 0)}")
    print(f"   Failed: {status_counts.get('research_failed', 0)}")

# Count total listings
listings_response = requests.get(
    f"{SUPABASE_URL}/rest/v1/normalized_listings",
    headers={**headers, "Prefer": "count=exact"},
    params={"select": "id", "limit": 1}
)

if listings_response.status_code == 200:
    total_listings = listings_response.headers.get('Content-Range', '').split('/')[-1]
    if total_listings:
        print(f"\n🏆 Total Listings in Database: {total_listings}")
