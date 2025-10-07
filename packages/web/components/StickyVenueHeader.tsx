'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Yeseva_One } from 'next/font/google';
import { HeartIcon, ShareIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

const yeseva = Yeseva_One({ weight: '400', subsets: ['latin'] });

interface StickyVenueHeaderProps {
  venueName: string;
  onContactClick?: () => void;
  isSaved?: boolean;
  onSaveToggle?: () => void;
}

export default function StickyVenueHeader({
  venueName,
  onContactClick,
  isSaved = false,
  onSaveToggle
}: StickyVenueHeaderProps) {
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      // Update active section based on scroll position
      const sections = ['photos', 'details', 'pricing', 'reviews', 'contact'];
      const scrollPosition = window.scrollY + 100;

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Height of sticky header
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: venueName,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const navSections = [
    { id: 'details', label: 'Details' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'contact', label: 'Contact' }
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-black backdrop-blur-md border-b border-gray-800 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Venue Name */}
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/" className="flex-shrink-0">
              <span className={`text-xl md:text-2xl font-bold text-white ${yeseva.className}`}>
                The Vows Social
              </span>
            </Link>

            <div className="hidden lg:block w-px h-8 bg-gray-700" />

            <h2 className="hidden lg:block font-semibold text-sm md:text-base text-white truncate">
              {venueName}
            </h2>
          </div>

          {/* Center: Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navSections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  activeSection === section.id
                    ? 'bg-white text-black'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Save Button - Icon only */}
            <button
              onClick={onSaveToggle}
              className="p-2.5 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label={isSaved ? 'Remove from favorites' : 'Save to favorites'}
            >
              {isSaved ? (
                <HeartIconSolid className="w-5 h-5 text-rose-500" />
              ) : (
                <HeartIcon className="w-5 h-5 text-gray-300 hover:text-rose-500" />
              )}
            </button>

            {/* Share Button - Icon only on desktop */}
            <button
              onClick={handleShare}
              className="hidden md:block p-2.5 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Share venue"
            >
              <ShareIcon className="w-5 h-5 text-gray-300 hover:text-white" />
            </button>

            {/* Contact Button */}
            <button
              onClick={onContactClick || (() => scrollToSection('contact'))}
              className="bg-white hover:bg-gray-100 text-black px-4 py-2.5 md:px-6 md:py-2.5 rounded-lg font-semibold text-sm transition-all hover:shadow-lg"
            >
              <span className="hidden sm:inline">Contact</span>
              <span className="sm:hidden">Contact</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
