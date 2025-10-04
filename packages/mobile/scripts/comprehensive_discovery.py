#!/usr/bin/env python3
"""
Comprehensive Discovery Script
Discovers ALL wedding venues and vendors across major Australian cities

Usage:
    python3 scripts/comprehensive_discovery.py [--cities N] [--services N]
"""

import requests
import json
import time
import sys
from datetime import datetime

SUPABASE_URL = "https://nidbhgqeyhrudtnizaya.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4OTMwNywiZXhwIjoyMDc0OTY1MzA3fQ.Ae1SOpALHEq0K68a0cwK38ugbHx4hKiqzC28q1Hkf6M"

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json"
}

# Major Australian cities with state codes
AUSTRALIAN_CITIES = [
    # Capital cities
    {"city": "Sydney", "state": "NSW", "priority": 1},
    {"city": "Melbourne", "state": "VIC", "priority": 1},
    {"city": "Brisbane", "state": "QLD", "priority": 1},
    {"city": "Perth", "state": "WA", "priority": 1},
    {"city": "Adelaide", "state": "SA", "priority": 1},
    {"city": "Gold Coast", "state": "QLD", "priority": 1},
    {"city": "Canberra", "state": "ACT", "priority": 1},
    {"city": "Hobart", "state": "TAS", "priority": 2},
    {"city": "Darwin", "state": "NT", "priority": 2},

    # Major regional areas (wedding destinations)
    {"city": "Byron Bay", "state": "NSW", "priority": 1},
    {"city": "Hunter Valley", "state": "NSW", "priority": 1},
    {"city": "Blue Mountains", "state": "NSW", "priority": 2},
    {"city": "Yarra Valley", "state": "VIC", "priority": 1},
    {"city": "Mornington Peninsula", "state": "VIC", "priority": 1},
    {"city": "Barossa Valley", "state": "SA", "priority": 2},
    {"city": "Margaret River", "state": "WA", "priority": 2},
    {"city": "Sunshine Coast", "state": "QLD", "priority": 2},
    {"city": "Noosa", "state": "QLD", "priority": 2},
    {"city": "Port Douglas", "state": "QLD", "priority": 3},

    # Additional regional centers
    {"city": "Newcastle", "state": "NSW", "priority": 2},
    {"city": "Wollongong", "state": "NSW", "priority": 2},
    {"city": "Geelong", "state": "VIC", "priority": 2},
    {"city": "Cairns", "state": "QLD", "priority": 3},
    {"city": "Townsville", "state": "QLD", "priority": 3},
]

# All service types to discover
SERVICE_TYPES = [
    {"type": "venue", "label": "wedding venue", "priority": 1},
    {"type": "photographer", "label": "wedding photographer", "priority": 1},
    {"type": "caterer", "label": "wedding caterer", "priority": 1},
    {"type": "florist", "label": "wedding florist", "priority": 1},
    {"type": "videographer", "label": "wedding videographer", "priority": 1},
    {"type": "musician", "label": "wedding band/DJ", "priority": 2},
    {"type": "planner", "label": "wedding planner", "priority": 1},
    {"type": "celebrant", "label": "wedding celebrant", "priority": 2},
    {"type": "cake", "label": "wedding cake designer", "priority": 2},
    {"type": "makeup", "label": "bridal makeup artist", "priority": 2},
    {"type": "hair", "label": "bridal hair stylist", "priority": 2},
    {"type": "stylist", "label": "wedding stylist", "priority": 3},
    {"type": "decorator", "label": "wedding decorator", "priority": 3},
    {"type": "transport", "label": "wedding car hire", "priority": 3},
    {"type": "rentals", "label": "wedding equipment rentals", "priority": 3},
    {"type": "stationery", "label": "wedding stationery", "priority": 3},
]

def discover_venues_for_city(city, state):
    """Discover venues for a specific city"""
    try:
        print(f"   🏛️  Discovering venues in {city}, {state}...")

        response = requests.post(
            f"{SUPABASE_URL}/functions/v1/discover-trending-venues",
            headers=headers,
            json={
                "city": city,
                "state": state,
                "expandedSearch": True
            },
            timeout=60
        )

        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                discoveries = result.get('new_discoveries', 0)
                print(f"      ✅ Found {discoveries} venues")
                return discoveries
            else:
                print(f"      ⚠️  Discovery failed: {result.get('error', 'Unknown error')}")
                return 0
        else:
            print(f"      ❌ HTTP {response.status_code}")
            return 0

    except Exception as e:
        print(f"      ❌ Error: {str(e)}")
        return 0

def discover_services_for_city(city, state, service_type, service_label):
    """Discover a specific service type for a city"""
    try:
        print(f"   {get_service_emoji(service_type)}  Discovering {service_label}s in {city}...")

        response = requests.post(
            f"{SUPABASE_URL}/functions/v1/discover-wedding-services",
            headers=headers,
            json={
                "city": city,
                "state": state,
                "serviceType": service_type,
                "serviceLabel": service_label
            },
            timeout=60
        )

        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                discoveries = result.get('new_discoveries', 0)
                print(f"      ✅ Found {discoveries} {service_label}s")
                return discoveries
            else:
                print(f"      ⚠️  Discovery failed")
                return 0
        else:
            print(f"      ❌ HTTP {response.status_code}")
            return 0

    except Exception as e:
        print(f"      ❌ Error: {str(e)}")
        return 0

def get_service_emoji(service_type):
    emojis = {
        "venue": "🏛️",
        "photographer": "📸",
        "caterer": "🍽️",
        "florist": "💐",
        "videographer": "🎥",
        "musician": "🎵",
        "planner": "📋",
        "celebrant": "👔",
        "cake": "🎂",
        "makeup": "💄",
        "hair": "💇",
        "stylist": "✨",
        "decorator": "🎨",
        "transport": "🚗",
        "rentals": "📦",
        "stationery": "✉️",
    }
    return emojis.get(service_type, "🔍")

def main():
    print("=" * 80)
    print("🇦🇺 COMPREHENSIVE AUSTRALIAN WEDDING DISCOVERY")
    print("=" * 80)
    print(f"Cities: {len(AUSTRALIAN_CITIES)}")
    print(f"Service Types: {len(SERVICE_TYPES)}")
    print(f"Total Discovery Tasks: {len(AUSTRALIAN_CITIES) * (len(SERVICE_TYPES) + 1)}")
    print("=" * 80)
    print()

    start_time = time.time()
    total_discoveries = 0

    # Process by priority
    for priority in [1, 2, 3]:
        priority_cities = [c for c in AUSTRALIAN_CITIES if c['priority'] == priority]

        if not priority_cities:
            continue

        print(f"\n{'='*80}")
        print(f"🎯 PRIORITY {priority} CITIES ({len(priority_cities)} cities)")
        print(f"{'='*80}\n")

        for city_data in priority_cities:
            city = city_data['city']
            state = city_data['state']

            print(f"\n📍 {city.upper()}, {state}")
            print("-" * 80)

            # Discover venues first
            venue_count = discover_venues_for_city(city, state)
            total_discoveries += venue_count
            time.sleep(3)  # Rate limiting

            # Discover priority services
            priority_services = [s for s in SERVICE_TYPES if s['priority'] <= priority]

            for service in priority_services:
                service_count = discover_services_for_city(
                    city,
                    state,
                    service['type'],
                    service['label']
                )
                total_discoveries += service_count
                time.sleep(3)  # Rate limiting

            print()

        # Longer break between priority tiers
        if priority < 3:
            print(f"\n⏸️  Priority {priority} complete. Pausing 30 seconds before next tier...\n")
            time.sleep(30)

    # Final summary
    elapsed = time.time() - start_time

    print("\n" + "=" * 80)
    print("🎉 DISCOVERY COMPLETE!")
    print("=" * 80)
    print(f"Total Discoveries: {total_discoveries}")
    print(f"Time Elapsed: {int(elapsed)}s ({int(elapsed/60)}min)")
    print(f"Cities Processed: {len(AUSTRALIAN_CITIES)}")
    print("=" * 80)
    print()

    # Check pending discoveries count
    print("📊 Checking discovery queue...")
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/discovered_listings",
            headers=headers,
            params={"select": "status", "status": "eq.pending_research"}
        )

        if response.status_code == 200:
            pending = len(response.json())
            print(f"   Pending Research: {pending} discoveries")
            print(f"\n💡 Run enrichment backfill to process these:\n")
            print(f"   python3 scripts/backfill_discoveries.py --limit {pending}\n")
    except Exception as e:
        print(f"   Error checking queue: {e}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏹️  Discovery interrupted by user")
        sys.exit(0)
