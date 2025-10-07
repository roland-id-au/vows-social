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

          <div className="flex items-center space-x-3">
            <button className="bg-black text-white px-6 py-2.5 rounded-full hover:bg-gray-800 transition-all font-semibold text-sm">
              For Pros
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
