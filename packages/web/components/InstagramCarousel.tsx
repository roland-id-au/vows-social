'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { InstagramPost } from '@/lib/types';

interface InstagramCarouselProps {
  posts: InstagramPost[];
}

export default function InstagramCarousel({ posts }: InstagramCarouselProps) {
  const [startIndex, setStartIndex] = useState(0);

  // Auto-rotate every 5 seconds
  useEffect(() => {
    if (posts.length <= 3) return;

    const interval = setInterval(() => {
      setStartIndex((prev) => (prev + 1) % posts.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [posts.length]);

  if (!posts || posts.length === 0) return null;

  // Get 3 posts starting from startIndex (circular)
  const visiblePosts = [
    posts[startIndex % posts.length],
    posts[(startIndex + 1) % posts.length],
    posts[(startIndex + 2) % posts.length],
  ].filter(Boolean);

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            Recent Posts
          </h3>
          {posts.length > 3 && (
            <div className="flex gap-1">
              {[...Array(Math.min(posts.length, 5))].map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i === startIndex % Math.min(posts.length, 5)
                      ? 'w-6 bg-gray-800'
                      : 'w-1 bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {visiblePosts.map((post, index) => (
            <a
              key={`${post.id}-${startIndex}-${index}`}
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="group block animate-fade-in"
            >
              <div className="flex items-center gap-3">
                {/* Small photo */}
                <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  {post.media_url && (
                    <Image
                      src={post.media_url}
                      alt={post.caption || 'Instagram post'}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                      sizes="64px"
                    />
                  )}
                  {/* Instagram icon overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 via-pink-500/0 to-orange-400/0 group-hover:from-purple-600/20 group-hover:via-pink-500/20 group-hover:to-orange-400/20 transition-all duration-300" />
                </div>

                {/* Text content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    <span className="text-xs font-medium text-gray-900 truncate">
                      @{post.instagram_account_username || 'instagram'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2 group-hover:text-gray-900 transition-colors">
                    {post.caption || 'View post'}
                  </p>
                  {post.like_count && post.like_count > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <svg className="w-3 h-3 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs text-gray-500">
                        {formatCount(post.like_count)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}
