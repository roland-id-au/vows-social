'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface HeroGalleryProps {
  images: string[];
  title: string;
  location: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  onViewAll?: () => void;
}

export default function HeroGallery({
  images,
  title,
  location,
  category,
  rating,
  reviewCount,
  onViewAll
}: HeroGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (images.length === 0) {
    return (
      <div className="relative w-full h-[50vh] md:h-[60vh] bg-gray-200 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
          <p>No images available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[50vh] md:h-[60vh] bg-gray-900 overflow-hidden">
      {/* Main Image */}
      <div className="relative w-full h-full">
        {images.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <Image
              src={image}
              alt={`${title} - Image ${index + 1}`}
              fill
              className="object-cover object-top"
              quality={90}
              priority={index === 0}
              sizes="100vw"
            />
          </div>
        ))}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70 z-20 pointer-events-none" />

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 bg-white/90 hover:bg-white p-2 md:p-3 rounded-full shadow-lg transition-all hover:scale-110"
            aria-label="Previous image"
          >
            <ChevronLeftIcon className="w-5 h-5 md:w-6 md:h-6 text-gray-800" />
          </button>

          <button
            onClick={nextImage}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 bg-white/90 hover:bg-white p-2 md:p-3 rounded-full shadow-lg transition-all hover:scale-110"
            aria-label="Next image"
          >
            <ChevronRightIcon className="w-5 h-5 md:w-6 md:h-6 text-gray-800" />
          </button>
        </>
      )}

      {/* Venue Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-30 p-6 md:p-10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-3">
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs uppercase font-semibold px-3 py-1 rounded-full">
              {category}
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
            {title}
          </h1>

          <div className="flex items-center gap-4 text-white/90">
            <p className="text-lg md:text-xl flex items-center">
              <svg
                className="w-5 h-5 md:w-6 md:h-6 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {location}
            </p>

            {rating && rating > 0 && (
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 md:w-6 md:h-6 text-amber-400 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-semibold mr-1">{rating.toFixed(1)}</span>
                {reviewCount && reviewCount > 0 && (
                  <span className="text-sm opacity-90">({reviewCount} reviews)</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dot Indicators + View All Button */}
      <div className="absolute bottom-6 md:bottom-10 right-6 md:right-10 z-30 flex items-center gap-4">
        {/* Dot Indicators */}
        {images.length > 1 && images.length <= 8 && (
          <div className="flex gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => goToImage(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-white w-6'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* View All Photos Button */}
        {onViewAll && images.length > 1 && (
          <button
            onClick={onViewAll}
            className="bg-white/90 hover:bg-white text-gray-800 px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-lg transition-all hover:scale-105"
          >
            <PhotoIcon className="w-5 h-5" />
            <span className="hidden md:inline">View All</span>
            <span>{images.length}</span>
          </button>
        )}
      </div>

      {/* Image Counter (Mobile) */}
      {images.length > 1 && (
        <div className="md:hidden absolute top-4 right-4 z-30 bg-black/50 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-full">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
