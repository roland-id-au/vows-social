'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Venue } from '@/lib/types';
import { formatPriceRange, getVenueImages, getShortAddress, generateVenuePermalink } from '@/lib/supabase-service';

interface VenueCardProps {
  venue: Venue;
}

export default function VenueCard({ venue }: VenueCardProps) {
  const images = getVenueImages(venue);
  const mainImage = images[0] || '/placeholder-venue.jpg';
  const shortAddress = getShortAddress(venue.location_data);
  const permalink = generateVenuePermalink(venue);

  return (
    <Link href={`/venues/${permalink}`} className="group">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-300">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          {images[0] ? (
            <Image
              src={mainImage}
              alt={venue.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No image
            </div>
          )}
          {venue.category && (
            <div className="absolute top-3 left-3 bg-white px-3 py-1 rounded-full text-xs font-medium text-gray-700 capitalize">
              {venue.category}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-lg text-gray-900 mb-1 line-clamp-1">
            {venue.title}
          </h3>

          <p className="text-sm text-gray-600 mb-2 flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {shortAddress}
          </p>

          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">
              {venue.min_capacity} - {venue.max_capacity} guests
            </span>
            {venue.rating && venue.rating > 0 && (
              <div className="flex items-center text-sm">
                <svg
                  className="w-4 h-4 text-yellow-400 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-gray-700">
                  {venue.rating.toFixed(1)}
                  {venue.review_count && venue.review_count > 0 && (
                    <span className="text-gray-500"> ({venue.review_count})</span>
                  )}
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-base font-semibold text-gray-900">
              {formatPriceRange(venue.price_data)}
            </p>
            <p className="text-xs text-gray-500">{venue.price_data.price_unit}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
