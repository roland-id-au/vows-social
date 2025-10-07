'use client';

import Link from 'next/link';
import { Yeseva_One } from 'next/font/google';

const yeseva = Yeseva_One({ weight: '400', subsets: ['latin'] });

export default function Header() {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          <Link href="/" className="flex items-center">
            <h1 className={`text-xl font-bold text-gray-900 ${yeseva.className}`}>The Vows Social</h1>
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            <Link href="/" className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm">
              Vendors
            </Link>
            <Link href="/inspiration" className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm">
              Inspiration
            </Link>
            <Link href="/planning" className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm">
              Planning
            </Link>
          </nav>

          <div className="flex items-center space-x-3">
            <button className="hidden sm:block text-gray-700 hover:text-gray-900 font-semibold px-4 py-2 text-sm">
              Sign In
            </button>
            <button className="bg-primary-600 text-white px-5 py-2.5 rounded-lg hover:bg-primary-700 transition-all font-semibold text-sm shadow-sm hover:shadow-md">
              For Vendors
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
