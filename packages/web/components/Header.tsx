'use client';

import Link from 'next/link';
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

interface HeaderProps {
  activeCategory?: string | null;
  onCategoryChange?: (categoryId: string | null) => void;
}

export default function Header({ activeCategory, onCategoryChange }: HeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <h1 className={`${yeseva.className} text-2xl text-gray-900`}>
              The Vows Social
            </h1>
          </Link>

          {/* Category Navigation */}
          <nav className="flex items-center gap-2">
            {categories.map((category) => (
              <button
                key={category.id || 'all'}
                onClick={() => onCategoryChange?.(category.id)}
                className={`px-4 py-1.5 rounded-full font-medium whitespace-nowrap transition-all text-sm ${
                  activeCategory === category.id
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {category.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
