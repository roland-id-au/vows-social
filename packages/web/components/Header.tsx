'use client';

import Link from 'next/link';
import { Yeseva_One } from 'next/font/google';
import { HeartIcon, ShareIcon } from '@heroicons/react/24/outline';

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

interface HeaderProps {
  activeCategory?: string | null;
  onCategoryChange?: (categoryId: string | null) => void;
}

export default function Header({ activeCategory, onCategoryChange }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black backdrop-blur-md border-b border-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-20 gap-4">
          {/* Left: Logo */}
          <div className="flex items-center gap-4 min-w-0 justify-start">
            <Link href="/" className="flex-shrink-0">
              <span className={`text-2xl md:text-3xl font-bold text-white ${yeseva.className}`}>
                The Vows Social
              </span>
            </Link>
          </div>

          {/* Center: Category Navigation */}
          <nav className="hidden md:flex items-center gap-2 justify-center">
            {categories.map((category) => (
              <button
                key={category.id || 'all'}
                onClick={() => onCategoryChange?.(category.id)}
                className={`px-5 py-2.5 rounded-lg font-medium text-base transition-all ${
                  activeCategory === category.id
                    ? 'bg-white text-black'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                {category.label}
              </button>
            ))}
          </nav>

          {/* Right: Actions (empty for homepage, keeping layout consistent) */}
          <div className="flex items-center gap-2 md:gap-3 justify-end">
            {/* Placeholder for layout consistency */}
          </div>
        </div>
      </div>
    </header>
  );
}
