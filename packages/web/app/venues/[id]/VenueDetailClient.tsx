'use client';

import { useState } from 'react';
import { Venue, InstagramPost } from '@/lib/types';
import { formatPriceRange } from '@/lib/supabase-service';
import HeroGallery from '@/components/HeroGallery';
import StickyVenueHeader from '@/components/StickyVenueHeader';
import ImageLightbox from '@/components/ImageLightbox';
import InstagramCarousel from '@/components/InstagramCarousel';
import { MapPinIcon, UsersIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface VenueDetailClientProps {
  venue: Venue;
  images: string[];
  shortAddress: string;
}

export default function VenueDetailClient({ venue, images, shortAddress }: VenueDetailClientProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  const openLightbox = (index: number = 0) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleSaveToggle = () => {
    setIsSaved(!isSaved);
    // TODO: Implement actual save functionality
  };

  const scrollToContact = () => {
    const element = document.getElementById('contact');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Check if trending (updated within last 48 hours)
  const isTrending = !!(venue.updated_at &&
    (new Date().getTime() - new Date(venue.updated_at).getTime()) < (2 * 24 * 60 * 60 * 1000));

  // TODO: Get Instagram posts that TAG/MENTION this venue (from other users)
  // Currently showing venue's own posts as placeholder
  // Need to implement: query instagram_posts where mentions contains venue handle
  // or where detected_vendors contains venue name
  const instagramPosts: InstagramPost[] = venue.instagram_accounts
    ?.flatMap(account =>
      (account.instagram_posts || [])
        .filter(post => post.discovered_via !== 'vendor_sync') // Only show discovered posts, not vendor's own
        .map(post => ({
          ...post,
          instagram_account_username: account.username
        }))
    )
    .sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime())
    .slice(0, 9) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header - Always visible */}
      <StickyVenueHeader
        venueName={venue.title}
        onContactClick={scrollToContact}
        isSaved={isSaved}
        onSaveToggle={handleSaveToggle}
        isTrending={isTrending}
      />

      {/* Hero Gallery - Full Width, with top padding for fixed header */}
      <div className="pt-20">
        <HeroGallery
        images={images}
        title={venue.title}
        location={shortAddress}
        category={venue.category}
        rating={venue.rating}
        reviewCount={venue.review_count}
        onViewAll={() => openLightbox(0)}
      />

        {/* Instagram Posts Carousel */}
        {instagramPosts.length > 0 && (
          <InstagramCarousel posts={instagramPosts} />
        )}
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Facts */}
            <section id="details" className="bg-white rounded-xl shadow-sm p-6 md:p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <MapPinIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Location</span>
                  </div>
                  <p className="font-semibold text-gray-900">{venue.location_data.city}</p>
                  <p className="text-sm text-gray-600">{venue.location_data.state}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <UsersIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Capacity</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {venue.min_capacity} - {venue.max_capacity}
                  </p>
                  <p className="text-sm text-gray-600">guests</p>
                </div>

                {venue.style && (
                  <div>
                    <div className="text-gray-600 mb-2">
                      <span className="text-sm font-medium">Style</span>
                    </div>
                    <p className="font-semibold text-gray-900 capitalize">
                      {venue.style.replace(/_/g, ' ')}
                    </p>
                  </div>
                )}

                <div>
                  <div className="text-gray-600 mb-2">
                    <span className="text-sm font-medium">Starting Price</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatPriceRange(venue.price_data)}
                  </p>
                  <p className="text-sm text-gray-600">{venue.price_data.price_unit}</p>
                </div>
              </div>
            </section>

            {/* Description */}
            <section className="bg-white rounded-xl shadow-sm p-6 md:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Venue</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {venue.description}
                </p>
              </div>
            </section>

            {/* Amenities */}
            {venue.amenities && venue.amenities.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm p-6 md:p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Amenities & Features</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {venue.amenities.filter(a => a).map((amenity, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircleIcon className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{amenity}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Packages */}
            {venue.packages && venue.packages.length > 0 && (
              <section id="pricing" className="bg-white rounded-xl shadow-sm p-6 md:p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Packages & Pricing</h2>
                <div className="space-y-4">
                  {venue.packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="border border-gray-200 rounded-lg p-6 hover:border-primary-300 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl font-semibold text-gray-900">{pkg.name}</h3>
                        <p className="text-2xl font-bold text-primary-600">
                          ${pkg.price.toLocaleString()}
                        </p>
                      </div>
                      <p className="text-gray-600 mb-4">{pkg.description}</p>
                      {pkg.inclusions && pkg.inclusions.length > 0 && (
                        <ul className="space-y-2">
                          {pkg.inclusions.map((inclusion, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                              <CheckCircleIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                              {inclusion}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews Placeholder */}
            <section id="reviews" className="bg-white rounded-xl shadow-sm p-6 md:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Reviews</h2>
              {venue.rating && venue.rating > 0 ? (
                <div className="text-center py-8">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-8 h-8 ${
                          i < Math.floor(venue.rating || 0) ? 'text-amber-400' : 'text-gray-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{venue.rating.toFixed(1)}</p>
                  {venue.review_count && venue.review_count > 0 && (
                    <p className="text-gray-600">Based on {venue.review_count} reviews</p>
                  )}
                  <p className="text-gray-500 mt-4">Detailed reviews coming soon</p>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No reviews yet</p>
              )}
            </section>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-6">
              {/* Inquiry Form */}
              <section id="contact" className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Request Pricing</h3>

                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Guests
                    </label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                      <option>Select guest count</option>
                      <option>1-50</option>
                      <option>51-100</option>
                      <option>101-150</option>
                      <option>151-200</option>
                      <option>201+</option>
                    </select>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Your name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      placeholder="Tell us about your event..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg hover:shadow-xl"
                  >
                    Request Pricing
                  </button>

                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Response within 24 hours • No obligation quote</span>
                  </div>
                </form>
              </section>

              {/* Venue Details Card */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Venue Details</h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Address</p>
                    <p className="text-gray-900 font-medium">{venue.location_data.address}</p>
                    <p className="text-gray-700">
                      {venue.location_data.city}, {venue.location_data.state}{' '}
                      {venue.location_data.postcode}
                    </p>
                    <p className="text-gray-700">{venue.location_data.country}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Image Lightbox */}
      <ImageLightbox
        images={images}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={venue.title}
      />
    </div>
  );
}
