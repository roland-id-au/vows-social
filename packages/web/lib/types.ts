export enum VenueCategory {
  Venue = 'venue',
  Caterer = 'caterer',
  Florist = 'florist',
  Photographer = 'photographer',
  Videographer = 'videographer',
  Musician = 'musician',
  Stylist = 'stylist',
  Planner = 'planner',
  Experience = 'experience',
}

export const VenueCategoryDisplay: Record<string, string> = {
  venue: 'Venues',
  caterer: 'Catering',
  florist: 'Florals',
  photographer: 'Photography',
  videographer: 'Videography',
  musician: 'Music',
  stylist: 'Styling',
  planner: 'Planning',
  experience: 'Experiences',
};

export enum VenueStyle {
  Modern = 'modern',
  Rustic = 'rustic',
  Beachfront = 'beachfront',
  Garden = 'garden',
  Industrial = 'industrial',
  Vineyard = 'vineyard',
  Ballroom = 'ballroom',
  Barn = 'barn',
  Estate = 'estate',
}

export interface LocationData {
  address: string;
  locality?: string;
  city: string;
  state: string;
  region?: string;
  postcode: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface PriceData {
  min_price: number;
  max_price: number;
  currency: string;
  price_unit: string;
}

export interface VenueTag {
  id: string;
  name: string;
  category?: string;
}

export interface PackageOption {
  id: string;
  name: string;
  price: number;
  description: string;
  inclusions: string[];
}

export interface InstagramAccount {
  id: string;
  instagram_id: string;
  username: string;
  account_type?: string;
  full_name?: string;
  bio?: string;
  profile_picture_url?: string;
  listing_id?: string;
  followers_count?: number;
  following_count?: number;
  media_count?: number;
  last_synced_at?: string;
  sync_status?: string;
  instagram_posts?: InstagramPost[];
}

export interface InstagramPost {
  id: string;
  instagram_media_id: string;
  instagram_account_id: string;
  instagram_account_username?: string; // Added for display purposes
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  caption?: string;
  posted_at: string;
  hashtags?: string[];
  mentions?: string[];
  location_name?: string;
  like_count?: number;
  comment_count?: number;
  engagement_rate?: number;
  is_wedding_related?: boolean;
  wedding_type?: string[];
  detected_themes?: string[];
  detected_vendors?: string[];
  city?: string;
  state?: string;
  country?: string;
  discovered_via?: string; // 'vendor_sync', 'hashtag_search', 'location_search', 'mention_search'
}

export interface ListingMedia {
  id: string;
  listing_id: string;
  url: string;
  media_type: string;
  order?: number;
}

export interface Venue {
  id: string;
  title: string;
  short_name?: string;
  slug: string;
  description: string;
  category: string;
  style: string;
  location_data: LocationData;
  price_data: PriceData;
  min_capacity: number;
  max_capacity: number;
  rating?: number;
  review_count?: number;
  amenities: string[];
  listing_media?: ListingMedia[];
  listing_tags?: Array<{ tag_name: string; tags: VenueTag }>;
  packages?: PackageOption[];
  instagram_accounts?: InstagramAccount[];
  instagram_handle?: string;
  created_at?: string;
  updated_at?: string;
  trending_score?: number;
  trending_score_timestamp?: string;
}

export interface SearchFilters {
  locality?: string;
  region?: string;
  location?: string;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  minCapacity?: number;
  maxCapacity?: number;
  styles?: VenueStyle[];
  category?: string; // Filter by vendor category
}
