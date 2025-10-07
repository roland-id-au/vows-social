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
    <div className="min-h-screen bg-white">
      <Header activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />

      {/* Hero Section */}
      <div className="relative bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="text-center mb-4">
            <h1 className={`text-5xl md:text-6xl lg:text-7xl text-gray-900 mb-4 ${yeseva.className}`}>
              The Vows Social
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <FeedGrid filters={filters} />
      </main>
    </div>
  );
}
