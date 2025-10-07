"""
Instagram Scraper using instagrapi
Handles monitoring user accounts and discovering trending content
"""

import json
import os
from datetime import datetime
from typing import List, Dict, Any
from instagrapi import Client
from instagrapi.exceptions import LoginRequired, PleaseWaitFewMinutes

# Initialize Instagram client
cl = Client()
cl.delay_range = [1, 3]  # Random delay between requests

def login_instagram():
    """Login to Instagram using credentials from environment"""
    username = os.getenv('INSTAGRAM_USERNAME')
    password = os.getenv('INSTAGRAM_PASSWORD')

    if not username or not password:
        raise ValueError('Instagram credentials not configured')

    try:
        # Try to load session if exists
        session_file = '/tmp/instagram_session.json'
        if os.path.exists(session_file):
            cl.load_settings(session_file)
            cl.login(username, password)
            print('Loaded existing Instagram session')
        else:
            # Fresh login
            cl.login(username, password)
            cl.dump_settings(session_file)
            print('Created new Instagram session')
    except Exception as e:
        print(f'Login error: {e}')
        # Try fresh login
        cl.login(username, password)
        cl.dump_settings(session_file)

def monitor_user(username: str, limit: int = 12, last_monitored_at: str = None) -> Dict[str, Any]:
    """
    Monitor a user's Instagram account for new posts

    Args:
        username: Instagram username to monitor
        limit: Number of recent posts to fetch
        last_monitored_at: ISO timestamp of last check (optional)

    Returns:
        Dict with posts and metadata
    """
    try:
        login_instagram()

        # Get user ID
        user_id = cl.user_id_from_username(username)

        # Fetch recent posts
        medias = cl.user_medias(user_id, amount=limit)

        posts = []
        for media in medias:
            # Skip if post is older than last monitored time
            if last_monitored_at:
                last_check = datetime.fromisoformat(last_monitored_at.replace('Z', '+00:00'))
                if media.taken_at < last_check:
                    continue

            # Extract image URLs
            image_urls = []
            if media.media_type == 1:  # Photo
                image_urls.append(media.thumbnail_url)
            elif media.media_type == 2:  # Video
                image_urls.append(media.thumbnail_url)
            elif media.media_type == 8:  # Carousel/Album
                for resource in media.resources:
                    if resource.media_type == 1:
                        image_urls.append(resource.thumbnail_url)

            posts.append({
                'id': media.pk,
                'caption': media.caption_text if media.caption_text else '',
                'posted_at': media.taken_at.isoformat(),
                'likes': media.like_count,
                'comments': media.comment_count,
                'image_urls': image_urls,
                'media_type': media.media_type,
                'is_video': media.media_type == 2
            })

        return {
            'success': True,
            'username': username,
            'posts': posts,
            'total_posts': len(posts)
        }

    except PleaseWaitFewMinutes:
        return {
            'success': False,
            'error': 'Rate limited by Instagram. Please wait a few minutes.'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def discover_hashtag(hashtag: str, limit: int = 50) -> Dict[str, Any]:
    """
    Discover trending posts for a hashtag

    Args:
        hashtag: Hashtag to search (without #)
        limit: Number of top posts to fetch

    Returns:
        Dict with posts and discovered vendors
    """
    try:
        login_instagram()

        # Remove # if present
        hashtag = hashtag.lstrip('#')

        # Fetch top posts for hashtag
        medias = cl.hashtag_medias_top(hashtag, amount=limit)

        posts = []
        discovered_vendors = set()

        for media in medias:
            # Extract image URLs
            image_urls = []
            if media.media_type == 1:  # Photo
                image_urls.append(media.thumbnail_url)
            elif media.media_type == 8:  # Carousel/Album
                for resource in media.resources:
                    if resource.media_type == 1:
                        image_urls.append(resource.thumbnail_url)

            # Get user info
            user = media.user
            discovered_vendors.add(user.username)

            posts.append({
                'id': media.pk,
                'username': user.username,
                'full_name': user.full_name,
                'is_business': user.is_business,
                'caption': media.caption_text if media.caption_text else '',
                'posted_at': media.taken_at.isoformat(),
                'likes': media.like_count,
                'comments': media.comment_count,
                'image_urls': image_urls,
                'location': media.location.name if media.location else None,
                'engagement_score': media.like_count + media.comment_count
            })

        # Sort by engagement
        posts.sort(key=lambda x: x['engagement_score'], reverse=True)

        return {
            'success': True,
            'hashtag': hashtag,
            'posts': posts[:limit],
            'total_posts': len(posts),
            'discovered_vendors': list(discovered_vendors)
        }

    except PleaseWaitFewMinutes:
        return {
            'success': False,
            'error': 'Rate limited by Instagram. Please wait a few minutes.'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def discover_location(location_name: str, limit: int = 50, hashtag_filter: str = None) -> Dict[str, Any]:
    """
    Discover posts from a specific location, optionally filtered by hashtags

    Args:
        location_name: Location name to search (e.g., "Sydney, Australia")
        limit: Number of top posts to fetch
        hashtag_filter: Optional hashtag to filter results (e.g., "wedding" or "venue")

    Returns:
        Dict with posts and discovered vendors
    """
    try:
        login_instagram()

        # Search for location
        locations = cl.location_search(location_name)

        if not locations:
            return {
                'success': False,
                'error': f'No locations found for "{location_name}"'
            }

        # Use the first (most relevant) location
        location = locations[0]
        print(f'Found location: {location.name} (ID: {location.pk})')

        # Fetch top posts from this location (fetch more if filtering by hashtag)
        fetch_amount = limit * 3 if hashtag_filter else limit
        medias = cl.location_medias_top(location.pk, amount=fetch_amount)

        posts = []
        discovered_vendors = set()

        for media in medias:
            # If hashtag filter is specified, check if caption contains it
            if hashtag_filter:
                caption_lower = (media.caption_text or '').lower()
                hashtag_clean = hashtag_filter.lower().lstrip('#')

                # Check if hashtag exists in caption (with or without #)
                if f'#{hashtag_clean}' not in caption_lower and hashtag_clean not in caption_lower:
                    continue

            # Extract image URLs
            image_urls = []
            if media.media_type == 1:  # Photo
                image_urls.append(media.thumbnail_url)
            elif media.media_type == 8:  # Carousel/Album
                for resource in media.resources:
                    if resource.media_type == 1:
                        image_urls.append(resource.thumbnail_url)

            # Get user info
            user = media.user
            discovered_vendors.add(user.username)

            posts.append({
                'id': media.pk,
                'username': user.username,
                'full_name': user.full_name,
                'is_business': user.is_business,
                'caption': media.caption_text if media.caption_text else '',
                'posted_at': media.taken_at.isoformat(),
                'likes': media.like_count,
                'comments': media.comment_count,
                'image_urls': image_urls,
                'location_name': location.name,
                'location_address': location.address if hasattr(location, 'address') else None,
                'location_lat': location.lat if hasattr(location, 'lat') else None,
                'location_lng': location.lng if hasattr(location, 'lng') else None,
                'engagement_score': media.like_count + media.comment_count
            })

            # Stop if we've collected enough filtered posts
            if len(posts) >= limit:
                break

        # Sort by engagement
        posts.sort(key=lambda x: x['engagement_score'], reverse=True)

        result = {
            'success': True,
            'location_name': location.name,
            'location_id': location.pk,
            'posts': posts[:limit],
            'total_posts': len(posts),
            'discovered_vendors': list(discovered_vendors)
        }

        if hashtag_filter:
            result['hashtag_filter'] = hashtag_filter

        return result

    except PleaseWaitFewMinutes:
        return {
            'success': False,
            'error': 'Rate limited by Instagram. Please wait a few minutes.'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def handler(event, context):
    """
    Main handler for Supabase Edge Function
    """
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')

        if action == 'monitor_user':
            username = body.get('username')
            limit = body.get('limit', 12)
            last_monitored_at = body.get('last_monitored_at')

            if not username:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'success': False, 'error': 'Username required'})
                }

            result = monitor_user(username, limit, last_monitored_at)

        elif action == 'discover_hashtag':
            hashtag = body.get('hashtag')
            limit = body.get('limit', 50)

            if not hashtag:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'success': False, 'error': 'Hashtag required'})
                }

            result = discover_hashtag(hashtag, limit)

        elif action == 'discover_location':
            location_name = body.get('location_name')
            limit = body.get('limit', 50)
            hashtag_filter = body.get('hashtag_filter')  # Optional hashtag filter

            if not location_name:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'success': False, 'error': 'Location name required'})
                }

            result = discover_location(location_name, limit, hashtag_filter)

        else:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'success': False,
                    'error': 'Invalid action. Use "monitor_user", "discover_hashtag", or "discover_location"'
                })
            }

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(result)
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'success': False,
                'error': str(e)
            })
        }
