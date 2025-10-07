import { Venue } from '@/lib/types';
import { getVenueById, getVenueBySlug, formatPriceRange, getVenueImages, getShortAddress, parseVenuePermalink } from '@/lib/supabase-service';
import VenueDetailClient from './VenueDetailClient';

export default async function VenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let venue: Venue | null = null;

  // Try new permalink format first (au-wedding-venue-sydney-establishment-ballroom)
  const parsedSlug = parseVenuePermalink(id);
  if (parsedSlug) {
    venue = await getVenueBySlug(parsedSlug);
  }

  // Fallback to old slug format
  if (!venue) {
    venue = await getVenueBySlug(id);
  }

  // Final fallback to UUID for very old links
  if (!venue) {
    venue = await getVenueById(id);
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Venue not found</h2>
          <a href="/" className="text-primary-600 hover:text-primary-700 font-medium">
            ← Return to home
          </a>
        </div>
      </div>
    );
  }

  const images = getVenueImages(venue);
  const shortAddress = getShortAddress(venue.location_data);

  return <VenueDetailClient venue={venue} images={images} shortAddress={shortAddress} />;
}
