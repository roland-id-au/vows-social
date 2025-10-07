'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import FeedGrid from '@/components/FeedGrid';
import { SearchFilters, VenueCategoryDisplay } from '@/lib/types';
import { Yeseva_One } from 'next/font/google';

const yeseva = Yeseva_One({ weight: '400', subsets: ['latin'] });

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
      <Header activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />

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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Row 1: Trending (first 4 items from all categories) */}
        {!filters.location && !activeCategory && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Trending Now</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {/* This will show first 4 trending items - VenueGrid component will handle this */}
            </div>
          </div>
        )}

        {/* Row 2: Inspiration Cards */}
        {!filters.location && !activeCategory && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Get Inspired</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
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

        {/* Row 3+: Featured Wedding Professionals */}
        {!filters.location && !activeCategory && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Featured</h2>
          </div>
        )}
        <FeedGrid filters={filters} />
      </main>
    </div>
  );
}
