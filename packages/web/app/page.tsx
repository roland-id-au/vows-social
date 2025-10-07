'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import VenueGrid from '@/components/VenueGrid';
import { SearchFilters, VenueCategoryDisplay } from '@/lib/types';
import { Yeseva_One } from 'next/font/google';

const yeseva = Yeseva_One({ weight: '400', subsets: ['latin'] });

const categories = [
  { id: null, label: 'All' },
  { id: 'venue', label: 'Venues' },
  { id: 'caterer', label: 'Catering' },
  { id: 'photographer', label: 'Photography' },
  { id: 'florist', label: 'Florals' },
  { id: 'videographer', label: 'Videography' },
  { id: 'musician', label: 'Music' },
  { id: 'stylist', label: 'Styling' },
  { id: 'planner', label: 'Planning' },
];

export default function Home() {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      setFilters({ ...filters, location: query });
    } else {
      const { location, ...rest } = filters;
      setFilters(rest);
    }
  };

  const handleCategoryChange = (categoryId: string | null) => {
    setActiveCategory(categoryId);
    if (categoryId) {
      setFilters({ ...filters, category: categoryId });
    } else {
      const { category, ...rest } = filters;
      setFilters(rest);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section - Knot-style */}
      <div className="relative bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="text-center mb-8">
            <h1 className={`text-3xl md:text-4xl text-gray-900 mb-3 ${yeseva.className}`}>
              The Vows Social
            </h1>
            <p className="text-base md:text-lg text-gray-600">
              Find vendors you'll love
            </p>
          </div>

          <div className="max-w-2xl mx-auto mb-6">
            <SearchBar
              onSearch={handleSearch}
              placeholder="Search by location..."
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto scrollbar-hide gap-2 py-3">
            {categories.map((category) => (
              <button
                key={category.id || 'all'}
                onClick={() => handleCategoryChange(category.id)}
                className={`px-5 py-2 rounded-full font-medium whitespace-nowrap transition-all border ${
                  activeCategory === category.id
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                <span className="text-sm">{category.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Section Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {filters.location
                  ? `${activeCategory ? VenueCategoryDisplay[activeCategory] || 'Vendors' : 'Vendors'} in ${filters.location}`
                  : activeCategory
                    ? VenueCategoryDisplay[activeCategory] || 'Vendors'
                    : 'Discover Wedding Vendors'
                }
              </h2>
              <p className="text-sm text-gray-600">
                {filters.location
                  ? 'Local wedding professionals near you'
                  : 'Top-rated vendors and new additions'}
              </p>
            </div>
          </div>
        </div>

        {/* Vendors Grid */}
        <VenueGrid filters={filters} />

        {/* Inspiration Section */}
        {!filters.location && !activeCategory && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Get Inspired
              </h2>
              <button className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                See all →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button className="group text-left">
                <div className="relative aspect-[4/3] bg-gradient-to-br from-rose-100 to-pink-100 rounded-lg overflow-hidden mb-3">
                  <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-80">
                    💒
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                  Real Weddings
                </h3>
                <p className="text-sm text-gray-600">
                  See how couples brought their vision to life
                </p>
              </button>

              <button className="group text-left">
                <div className="relative aspect-[4/3] bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg overflow-hidden mb-3">
                  <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-80">
                    ✨
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                  Style Guides
                </h3>
                <p className="text-sm text-gray-600">
                  Explore colors, themes, and wedding styles
                </p>
              </button>

              <button className="group text-left">
                <div className="relative aspect-[4/3] bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg overflow-hidden mb-3">
                  <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-80">
                    📈
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                  Trending Now
                </h3>
                <p className="text-sm text-gray-600">
                  What's hot in weddings this season
                </p>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
