'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import VenueGrid from '@/components/VenueGrid';
import { SearchFilters, VenueCategoryDisplay } from '@/lib/types';
import { Yeseva_One } from 'next/font/google';

const yeseva = Yeseva_One({ weight: '400', subsets: ['latin'] });

const categories = [
  { id: null, label: 'All', icon: '✨' },
  { id: 'venue', label: 'Venues', icon: '🏛️' },
  { id: 'caterer', label: 'Catering', icon: '🍽️' },
  { id: 'photographer', label: 'Photography', icon: '📸' },
  { id: 'florist', label: 'Florals', icon: '💐' },
  { id: 'videographer', label: 'Videography', icon: '🎥' },
  { id: 'musician', label: 'Music', icon: '🎵' },
  { id: 'stylist', label: 'Styling', icon: '✨' },
  { id: 'planner', label: 'Planning', icon: '📋' },
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

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h1 className={`text-5xl md:text-7xl text-gray-900 mb-6 ${yeseva.className}`}>
              Find Your Perfect Wedding Team
            </h1>
            <p className="text-xl text-gray-700 mb-2">
              Discover venues, vendors, and wedding inspiration
            </p>
            <p className="text-lg text-gray-600">
              Everything you need for your special day, in one place
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <SearchBar
              onSearch={handleSearch}
              placeholder="Search by city, suburb, or region..."
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto scrollbar-hide gap-2 py-4">
            {categories.map((category) => (
              <button
                key={category.id || 'all'}
                onClick={() => handleCategoryChange(category.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold whitespace-nowrap transition-all ${
                  activeCategory === category.id
                    ? 'bg-primary-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-xl">{category.icon}</span>
                <span>{category.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Trending Section Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {filters.location
                  ? `${activeCategory ? VenueCategoryDisplay[activeCategory] || 'Results' : 'Results'} in ${filters.location}`
                  : `Trending ${activeCategory ? VenueCategoryDisplay[activeCategory] || 'Vendors' : 'Vendors'}`
                }
              </h2>
              <p className="text-gray-600">
                {filters.location
                  ? 'Browse local wedding professionals'
                  : 'Popular choices from real couples'}
              </p>
            </div>
          </div>
        </div>

        {/* Vendors Grid */}
        <VenueGrid filters={filters} />

        {/* Inspiration Section */}
        {!filters.location && !activeCategory && (
          <div className="mt-20">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Wedding Inspiration & Trends
              </h2>
              <p className="text-gray-600 text-lg">
                Real weddings, style guides, and trending ideas
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Placeholder cards for trends */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden group cursor-pointer hover:shadow-xl transition-shadow">
                <div className="aspect-[4/3] bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
                  <span className="text-6xl">💒</span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Real Weddings</h3>
                  <p className="text-gray-600">
                    Get inspired by real couples and their special days
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md overflow-hidden group cursor-pointer hover:shadow-xl transition-shadow">
                <div className="aspect-[4/3] bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                  <span className="text-6xl">✨</span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Style Guides</h3>
                  <p className="text-gray-600">
                    Explore wedding styles from modern to classic
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md overflow-hidden group cursor-pointer hover:shadow-xl transition-shadow">
                <div className="aspect-[4/3] bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                  <span className="text-6xl">📈</span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Trending Now</h3>
                  <p className="text-gray-600">
                    See what's popular in weddings this season
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
