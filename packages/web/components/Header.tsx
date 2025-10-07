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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Transition to black sticky header when scrolled past 200px
      setIsScrolled(window.scrollY > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-black backdrop-blur-md border-b border-gray-800 shadow-lg'
          : 'bg-white/80 backdrop-blur-sm border-b border-gray-200'
      }`}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1920px] mx-auto">
          <div className="grid grid-cols-[minmax(200px,1fr)_auto_minmax(200px,1fr)] items-center h-20 gap-8">
            {/* Left: Logo - only show when scrolled */}
            <div className="flex items-center min-w-0 justify-start">
              {isScrolled && (
                <Link href="/" className="flex-shrink-0">
                  <span className={`text-2xl md:text-3xl font-bold text-white ${yeseva.className}`}>
                    The Vows Social
                  </span>
                </Link>
              )}
            </div>

            {/* Center: Category Navigation */}
            <nav className="hidden md:flex items-center gap-2 justify-center">
              {categories.map((category) => (
                <button
                  key={category.id || 'all'}
                  onClick={() => onCategoryChange?.(category.id)}
                  className={`px-5 py-2.5 rounded-lg font-medium text-base transition-all whitespace-nowrap ${
                    activeCategory === category.id
                      ? isScrolled
                        ? 'bg-white text-black'
                        : 'bg-black text-white'
                      : isScrolled
                        ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </nav>

            {/* Right: Empty for layout consistency */}
            <div className="flex items-center justify-end">
              {/* Placeholder for layout consistency */}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
