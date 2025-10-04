import { supabase } from './supabase';
import { Venue, SearchFilters, PriceData, LocationData } from './types';

const VENUES_PER_PAGE = 12;

export async function getTrendingVenues(
  page: number = 0,
  limit: number = VENUES_PER_PAGE
): Promise<{ venues: Venue[]; hasMore: boolean }> {
  try {
    const from = page * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('listings')
      .select(
        `
        *,
        listing_media(*),
        listing_tags(tag_name, tags(*))
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const venues = (data || []) as Venue[];
    const hasMore = count ? from + venues.length < count : false;

    return { venues, hasMore };
  } catch (error) {
    console.error('Error fetching trending venues:', error);
    return { venues: [], hasMore: false };
  }
}

export async function searchVenues(
  filters: SearchFilters,
  page: number = 0,
  limit: number = VENUES_PER_PAGE
): Promise<{ venues: Venue[]; hasMore: boolean }> {
  try {
    const from = page * limit;
    const to = from + limit - 1;

    let query = supabase.from('listings').select(
      `
        *,
        listing_media(*),
        listing_tags(tag_name, tags(*))
      `,
      { count: 'exact' }
    );

    // Apply filters
    if (filters.locality) {
      query = query.eq('locality', filters.locality);
    } else if (filters.region) {
      query = query.eq('region', filters.region);
    } else if (filters.location) {
      query = query.ilike('location_data->>city', `%${filters.location}%`);
    }

    if (filters.country) {
      query = query.eq('country', filters.country);
    }

    if (filters.minPrice !== undefined) {
      query = query.gte('price_data->>min_price', filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      query = query.lte('price_data->>max_price', filters.maxPrice);
    }

    if (filters.minCapacity !== undefined) {
      query = query.gte('max_capacity', filters.minCapacity);
    }

    if (filters.maxCapacity !== undefined) {
      query = query.lte('min_capacity', filters.maxCapacity);
    }

    if (filters.styles && filters.styles.length > 0) {
      query = query.in(
        'style',
        filters.styles.map((s) => s.toString())
      );
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const venues = (data || []) as Venue[];
    const hasMore = count ? from + venues.length < count : false;

    return { venues, hasMore };
  } catch (error) {
    console.error('Error searching venues:', error);
    return { venues: [], hasMore: false };
  }
}

export async function getVenueById(id: string): Promise<Venue | null> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select(
        `
        *,
        listing_media(*),
        listing_tags(tag_name, tags(*)),
        packages(*),
        instagram_posts(*)
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;

    return data as Venue;
  } catch (error) {
    console.error('Error fetching venue:', error);
    return null;
  }
}

export function formatPrice(price: number): string {
  if (price >= 1000) {
    const k = price / 1000;
    return `${k.toFixed(k % 1 === 0 ? 0 : 1)}k`;
  }
  return price.toString();
}

export function formatPriceRange(priceData: PriceData): string {
  return `$${formatPrice(priceData.min_price)} - $${formatPrice(priceData.max_price)}`;
}

export function getVenueImages(venue: Venue): string[] {
  return (venue.listing_media || [])
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
    .map((media) => media.url);
}

export function getShortAddress(location: LocationData): string {
  if (location.locality) {
    return `${location.locality}, ${location.city}`;
  }
  return `${location.city}, ${location.state}`;
}
