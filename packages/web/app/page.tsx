'use client';

import { useState } from 'react';
import SearchBar from '@/components/SearchBar';
import VenueGrid from '@/components/VenueGrid';
import { SearchFilters } from '@/lib/types';
import { Yeseva_One } from 'next/font/google';

const yeseva = Yeseva_One({ weight: '400', subsets: ['latin'] });

export default function Home() {
  const [filters, setFilters] = useState<SearchFilters>({});

  const handleSearch = (query: string) => {
    if (query.trim()) {
      setFilters({ location: query });
    } else {
      setFilters({});
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className={`text-6xl text-gray-900 mb-4 ${yeseva.className}`}>
              The Vows Social
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Browse venues, vendors, and experiences for your perfect day
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <SearchBar
              onSearch={handleSearch}
              placeholder="Search by city, suburb, or region..."
            />
          </div>
        </div>
      </div>

      {/* Venues Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-gray-900">
            {filters.location ? `Results for "${filters.location}"` : 'Trending Venues'}
          </h3>
        </div>
        <VenueGrid filters={filters} />
      </main>
    </div>
  );
}
