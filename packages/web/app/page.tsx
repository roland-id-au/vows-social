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
      {/* Hero Section */}
      <div className="relative bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center mb-10">
            <h1 className={`text-5xl md:text-6xl lg:text-7xl text-gray-900 mb-4 ${yeseva.className}`}>
              The Vows Social
            </h1>
            <p className="text-lg md:text-xl text-gray-600">
              Where your wedding vision comes alive
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
                  ? `${activeCategory ? VenueCategoryDisplay[activeCategory] || 'Wedding Pros' : 'Wedding Pros'} in ${filters.location}`
                  : activeCategory
                    ? VenueCategoryDisplay[activeCategory] || 'Wedding Pros'
                    : 'Discover Your Dream Team'
                }
              </h2>
              <p className="text-sm text-gray-600">
                {filters.location
                  ? 'Trusted wedding professionals near you'
                  : 'Top-rated pros and fresh finds'}
              </p>
            </div>
          </div>
        </div>

        {/* Inspiration Cards - Inline with Pros Grid */}
        {!filters.location && !activeCategory && (
          <div className="mb-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <button className="group text-left">
                <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-900 to-gray-700 rounded-lg overflow-hidden">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
                    <div className="text-6xl mb-3">💒</div>
                    <h3 className="text-xl font-bold mb-2">Real Weddings</h3>
                    <p className="text-sm text-gray-200 text-center opacity-90">
                      Browse real couple stories
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                </div>
              </button>

              <button className="group text-left">
                <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-800 to-gray-600 rounded-lg overflow-hidden">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
                    <div className="text-6xl mb-3">✨</div>
                    <h3 className="text-xl font-bold mb-2">Style Guides</h3>
                    <p className="text-sm text-gray-200 text-center opacity-90">
                      Explore wedding styles
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                </div>
              </button>

              <button className="group text-left">
                <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-700 to-gray-500 rounded-lg overflow-hidden">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
                    <div className="text-6xl mb-3">📈</div>
                    <h3 className="text-xl font-bold mb-2">Trending</h3>
                    <p className="text-sm text-gray-200 text-center opacity-90">
                      What's hot this season
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                </div>
              </button>

              <button className="group text-left">
                <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-600 to-gray-400 rounded-lg overflow-hidden">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
                    <div className="text-6xl mb-3">🎨</div>
                    <h3 className="text-xl font-bold mb-2">Ideas</h3>
                    <p className="text-sm text-gray-200 text-center opacity-90">
                      Colors, themes & more
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Featured Wedding Professionals */}
        <VenueGrid filters={filters} />
      </main>
    </div>
  );
}
