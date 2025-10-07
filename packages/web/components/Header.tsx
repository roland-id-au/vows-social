'use client';

import { useState, useEffect } from 'react';
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
  const [showLogo, setShowLogo] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show logo after scrolling 50px
      setShowLogo(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center py-3">
          {/* Category Navigation with Logo icon */}
          <nav className="flex items-center gap-2">
            {/* Logo icon - in sequence with badges */}
            <Link
              href="/"
              className={`flex-shrink-0 transition-all duration-300 ${
                showLogo ? 'opacity-100 w-auto mr-1' : 'opacity-0 w-0 overflow-hidden'
              }`}
            >
              <img
                src="/icon-192.png"
                alt="The Vows Social"
                className="h-7 w-7 rounded-full"
              />
            </Link>

            {showLogo && <div className="w-px h-4 bg-gray-300 mr-1" />}

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
