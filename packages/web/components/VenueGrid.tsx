'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import VenueCard from './VenueCard';
import { Venue, SearchFilters } from '@/lib/types';
import { getTrendingVenues, searchVenues } from '@/lib/supabase-service';

interface VenueGridProps {
  filters?: SearchFilters;
}

export default function VenueGrid({ filters }: VenueGridProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  const loadVenues = useCallback(
    async (pageNum: number) => {
      if (loading || (!hasMore && pageNum > 0)) return;

      setLoading(true);
      try {
        const result = filters
          ? await searchVenues(filters, pageNum)
          : await getTrendingVenues(pageNum);

        if (pageNum === 0) {
          setVenues(result.venues);
        } else {
          setVenues((prev) => [...prev, ...result.venues]);
        }
        setHasMore(result.hasMore);
      } catch (error) {
        console.error('Error loading venues:', error);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    },
    [filters, hasMore, loading]
  );

  // Initial load
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    loadVenues(0);
  }, [filters]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !initialLoad) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadVenues(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, page, loadVenues, initialLoad]);

  if (initialLoad && venues.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 aspect-[4/3] rounded-lg mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!initialLoad && venues.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No venues found</p>
        <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {venues.map((venue) => (
          <VenueCard key={venue.id} venue={venue} />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={observerTarget} className="h-10 mt-8">
        {loading && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}
      </div>

      {!hasMore && venues.length > 0 && (
        <p className="text-center text-gray-500 py-8">
          You've reached the end of the list
        </p>
      )}
    </div>
  );
}
