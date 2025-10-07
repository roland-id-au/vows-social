import { supabase } from './supabase';
import { Venue, SearchFilters, PriceData, LocationData, InstagramPost } from './types';

const LISTINGS_PER_PAGE = 12;

export async function getTrendingListings(
  page: number = 0,
  limit: number = LISTINGS_PER_PAGE
): Promise<{ listings: Venue[]; hasMore: boolean }> {
  try {
    const from = page * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('listings')
      .select(
        `
        *,
        listing_media(*),
        listing_tags(tag_name, tags(*)),
        instagram_accounts(
          *,
          instagram_posts(*)
        )
      `,
        { count: 'exact' }
      )
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Filter out listings without images
    const listings = (data || []).filter(listing =>
      listing.listing_media && listing.listing_media.length > 0
    ) as Venue[];
    const hasMore = count ? from + listings.length < count : false;

    return { listings, hasMore };
  } catch (error) {
    console.error('Error fetching trending listings:', error);
    return { listings: [], hasMore: false };
  }
}

export async function searchListings(
  filters: SearchFilters,
  page: number = 0,
  limit: number = LISTINGS_PER_PAGE
): Promise<{ listings: Venue[]; hasMore: boolean }> {
  try {
    const from = page * limit;
    const to = from + limit - 1;

    let query = supabase.from('listings').select(
      `
        *,
        listing_media(*),
        listing_tags(tag_name, tags(*)),
        instagram_accounts(
          *,
          instagram_posts(*)
        )
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
        filters.styles.filter(s => s != null).map((s) => s.toString())
      );
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Filter out listings without images
    const listings = (data || []).filter(listing =>
      listing.listing_media && listing.listing_media.length > 0
    ) as Venue[];
    const hasMore = count ? from + listings.length < count : false;

    return { listings, hasMore };
  } catch (error) {
    console.error('Error searching listings:', error);
    return { listings: [], hasMore: false };
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
        instagram_accounts(
          *,
          instagram_posts(*)
        )
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

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  try {
    console.log('getVenueBySlug called with:', slug);
    console.log('Supabase client initialized:', !!supabase);

    const { data, error } = await supabase
      .from('listings')
      .select(
        `
        *,
        listing_media(*),
        listing_tags(tag_name, tags(*)),
        packages(*),
        instagram_accounts(
          *,
          instagram_posts(*)
        )
      `
      )
      .eq('slug', slug)
      .single();

    console.log('Supabase query result - data:', !!data, 'error:', error);
    if (error) throw error;

    return data as Venue;
  } catch (error) {
    console.error('Error fetching venue by slug:', error);
    return null;
  }
}

export function formatPrice(price: number): string {
  if (!price || isNaN(price)) return '0';
  if (price >= 1000) {
    const k = price / 1000;
    return `${k.toFixed(k % 1 === 0 ? 0 : 1)}k`;
  }
  return price.toString();
}

export function formatPriceRange(priceData: PriceData): string {
  if (!priceData || !priceData.min_price || !priceData.max_price) {
    return 'Price on request';
  }
  return `$${formatPrice(priceData.min_price)} - $${formatPrice(priceData.max_price)}`;
}

export function getListingImages(listing: Venue): string[] {
  return (listing.listing_media || [])
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((media) => media.url);
}

export function getListingInstagramPosts(listing: Venue): InstagramPost[] {
  if (!listing.instagram_accounts || listing.instagram_accounts.length === 0) {
    return [];
  }

  // Flatten all posts from all Instagram accounts
  const allPosts = listing.instagram_accounts.flatMap(
    (account) => account.instagram_posts || []
  );

  // Sort by posted_at descending (most recent first)
  return allPosts.sort(
    (a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()
  );
}

export function getAllInstagramPosts(listings: Venue[]): InstagramPost[] {
  const allPosts = listings.flatMap((listing) => getListingInstagramPosts(listing));

  // Sort by posted_at descending (most recent first)
  return allPosts.sort(
    (a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()
  );
}

// Mix Instagram posts with listings for a unified feed
export function createFeedItems(
  listings: Venue[],
  options: {
    includeInstagram?: boolean;
    instagramRatio?: number; // Ratio of Instagram posts to listings (0-1)
    maxItems?: number;
  } = {}
): Array<{ item: Venue | InstagramPost; type: 'listing' | 'instagram' }> {
  const {
    includeInstagram = true,
    instagramRatio = 0.25, // 25% Instagram content by default
    maxItems,
  } = options;

  const feedItems: Array<{ item: Venue | InstagramPost; type: 'listing' | 'instagram' }> = [];

  // Add all listings
  listings.forEach((listing) => {
    feedItems.push({ item: listing, type: 'listing' });
  });

  // Add Instagram posts if enabled
  if (includeInstagram) {
    const instagramPosts = getAllInstagramPosts(listings);
    const maxInstagramItems = Math.floor(listings.length * instagramRatio);
    const selectedPosts = instagramPosts.slice(0, maxInstagramItems);

    selectedPosts.forEach((post) => {
      feedItems.push({ item: post, type: 'instagram' });
    });
  }

  // Shuffle the feed items to mix listings and Instagram posts
  const shuffled = shuffleArray(feedItems);

  // Return limited items if maxItems specified
  return maxItems ? shuffled.slice(0, maxItems) : shuffled;
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getShortAddress(location: LocationData): string {
  if (location.locality) {
    return `${location.locality}, ${location.city}`;
  }
  return `${location.city}, ${location.state}`;
}

// Generate SEO-friendly permalink: /[country-code]-wedding-venue-{location}-{slug}
export function generateVenuePermalink(venue: Venue): string {
  const countryCode = getCountryCode(venue.location_data.country);
  const location = venue.location_data.city.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const slug = venue.slug || venue.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return `${countryCode}-wedding-venue-${location}-${slug}`;
}

// Get 2-letter country code
function getCountryCode(country: string): string {
  const countryMap: Record<string, string> = {
    'Australia': 'au',
    'United States': 'us',
    'United Kingdom': 'uk',
    'Canada': 'ca',
    'New Zealand': 'nz',
  };

  return countryMap[country] || country.substring(0, 2).toLowerCase();
}

// Parse permalink to extract slug
export function parseVenuePermalink(permalink: string): string | null {
  // Format: au-wedding-venue-sydney-establishment-ballroom
  // Extract the slug part (everything after the last occurrence of location)
  const parts = permalink.split('-wedding-venue-');
  if (parts.length < 2) return null;

  // Return the part after "wedding-venue-{location}-"
  const afterLocation = parts[1];
  const locationAndSlug = afterLocation.split('-');

  // Skip the first part (location) and join the rest as the slug
  if (locationAndSlug.length > 1) {
    return locationAndSlug.slice(1).join('-');
  }

  return afterLocation;
}
