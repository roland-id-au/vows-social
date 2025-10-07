#!/usr/bin/env python3
"""
Test Instagram Authentication with instagrapi
"""

import os
import sys
from pathlib import Path

# Add parent directory to path to import from supabase functions
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from instagrapi import Client
    from instagrapi.exceptions import LoginRequired, PleaseWaitFewMinutes, ChallengeRequired
except ImportError:
    print("❌ instagrapi not installed. Installing...")
    os.system("pip3 install instagrapi")
    from instagrapi import Client
    from instagrapi.exceptions import LoginRequired, PleaseWaitFewMinutes, ChallengeRequired

# Load credentials from .env.instagram
from dotenv import load_dotenv
load_dotenv('.env.instagram')

USERNAME = os.getenv('INSTAGRAM_USERNAME')
PASSWORD = os.getenv('INSTAGRAM_PASSWORD')

if not USERNAME or not PASSWORD:
    print("❌ Instagram credentials not found in .env.instagram")
    sys.exit(1)

print(f"🔐 Testing Instagram authentication...")
print(f"   Username: {USERNAME}")
print(f"   Password: {'*' * len(PASSWORD)}")
print()

# Initialize client
cl = Client()
cl.delay_range = [1, 3]

try:
    print("📝 Attempting login...")
    cl.login(USERNAME, PASSWORD)

    print("✅ Login successful!")
    print()

    # Get account info
    user_id = cl.user_id
    account_info = cl.account_info()

    print("📊 Account Information:")
    print(f"   User ID: {user_id}")
    print(f"   Username: {account_info.username}")
    print(f"   Full Name: {account_info.full_name}")
    print(f"   Followers: {account_info.follower_count}")
    print(f"   Following: {account_info.following_count}")
    print(f"   Posts: {account_info.media_count}")
    print(f"   Is Business: {account_info.is_business}")
    print(f"   Is Private: {account_info.is_private}")
    print()

    # Test location search
    print("🗺️  Testing location search...")
    locations = cl.location_search("Sydney, Australia")
    print(f"   Found {len(locations)} locations for 'Sydney, Australia'")
    if locations:
        print(f"   First result: {locations[0].name} (ID: {locations[0].pk})")
    print()

    # Test hashtag search (limited)
    print("🔍 Testing hashtag search...")
    try:
        # Just search for hashtag info, don't fetch posts
        hashtag_info = cl.hashtag_info("wedding")
        print(f"   Hashtag #wedding: {hashtag_info.media_count:,} posts")
    except Exception as e:
        print(f"   Note: {e}")
    print()

    # Save session for reuse
    session_file = '/tmp/instagram_session_test.json'
    cl.dump_settings(session_file)
    print(f"💾 Session saved to {session_file}")
    print()

    print("=" * 60)
    print("✅ ALL TESTS PASSED!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Set credentials in Supabase:")
    print(f"   supabase secrets set INSTAGRAM_USERNAME={USERNAME}")
    print(f"   supabase secrets set INSTAGRAM_PASSWORD={PASSWORD}")
    print()
    print("2. Deploy instagrapi-scraper function:")
    print("   supabase functions deploy instagrapi-scraper")
    print()

    sys.exit(0)

except ChallengeRequired as e:
    print("⚠️  Challenge required!")
    print("   Instagram is asking for verification.")
    print("   This usually happens with new accounts or new devices.")
    print()
    print("   Solutions:")
    print("   1. Log in via Instagram app/website first")
    print("   2. Complete any verification challenges")
    print("   3. Wait a few hours and try again")
    print()
    print(f"   Error: {e}")
    sys.exit(1)

except LoginRequired as e:
    print("❌ Login failed!")
    print(f"   Error: {e}")
    print()
    print("   Possible reasons:")
    print("   1. Incorrect username or password")
    print("   2. Account requires verification")
    print("   3. Instagram security check")
    sys.exit(1)

except PleaseWaitFewMinutes as e:
    print("⏳ Rate limited!")
    print("   Instagram is asking us to wait.")
    print(f"   Error: {e}")
    print()
    print("   Wait a few minutes and try again.")
    sys.exit(1)

except Exception as e:
    print("❌ Unexpected error!")
    print(f"   Error type: {type(e).__name__}")
    print(f"   Error: {e}")
    sys.exit(1)
