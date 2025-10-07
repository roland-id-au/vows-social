'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Venue, InstagramPost } from '@/lib/types';
import { formatPriceRange, getShortAddress, generateVenuePermalink, getListingImages } from '@/lib/supabase-service';

interface FeedCardProps {
  item: Venue | InstagramPost;
  type: 'listing' | 'instagram';
  index?: number;
}

export default function FeedCard({ item, type, index = 0 }: FeedCardProps) {
  if (type === 'instagram') {
    const post = item as InstagramPost;
    return (
      <Link
        href={post.permalink}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
      >
        <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-300">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-gray-100">
            {post.media_url && (
              <Image
                src={post.media_url}
                alt={post.caption || 'Instagram post'}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              />
            )}

            {/* Instagram badge */}
            <div className="absolute top-3 left-3">
              <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 px-3 py-1 rounded-full text-xs font-medium text-white flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Instagram
              </div>
            </div>

            {/* Media type indicator */}
            {(post.media_type === 'VIDEO' || post.media_type === 'REEL') && (
              <div className="absolute top-3 right-3">
                <svg className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {post.caption && (
              <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                {post.caption}
              </p>
            )}

            {/* Location and engagement */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              {post.location_name && (
                <div className="flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span className="truncate">{post.location_name}</span>
                </div>
              )}

              {post.like_count !== undefined && post.like_count > 0 && (
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  <span>{formatCount(post.like_count)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Regular listing card
  const listing = item as Venue;
  const images = getListingImages(listing);
  const mainImage = images[0] || '/placeholder-venue.jpg';
  const shortAddress = getShortAddress(listing.location_data);
  const permalink = generateVenuePermalink(listing);

  // Check if listing has Instagram content
  const hasInstagram = listing.instagram_accounts &&
    listing.instagram_accounts.length > 0 &&
    listing.instagram_accounts[0].instagram_posts &&
    listing.instagram_accounts[0].instagram_posts.length > 0;

  // Check if new (created within last 7 days)
  const isNew = listing.created_at &&
    (new Date().getTime() - new Date(listing.created_at).getTime()) < (7 * 24 * 60 * 60 * 1000);

  // Check if trending (updated recently - within last 48 hours)
  const isTrending = listing.updated_at &&
    (new Date().getTime() - new Date(listing.updated_at).getTime()) < (2 * 24 * 60 * 60 * 1000);

  return (
    <Link href={`/venues/${permalink}`} className="group block">
      <div className="bg-white rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
          {images.length > 0 ? (
            <Image
              src={mainImage}
              alt={listing.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No image
            </div>
          )}

          {/* Top right badges: New and Trending (only first row) */}
          {index < 4 && (
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              {isTrending && (
                <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg backdrop-blur-sm">
                  🔥 Trending
                </div>
              )}
              {isNew && !isTrending && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg backdrop-blur-sm">
                  ✨ New
                </div>
              )}
            </div>
          )}

          {/* Gradient overlay for text readability */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent h-1/2"></div>

          {/* Content overlaid on image */}
          <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
            <h3 className="font-bold text-2xl mb-2 line-clamp-1 drop-shadow-lg">
              {listing.short_name || listing.title}
            </h3>

            <p className="text-base mb-3 flex items-center drop-shadow-md">
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              {shortAddress}
            </p>

            <p className="text-xl font-bold drop-shadow-md">
              {formatPriceRange(listing.price_data)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}
