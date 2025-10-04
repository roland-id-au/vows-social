import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:vow_society/models/venue.dart';

class VenueCard extends StatelessWidget {
  final Venue venue;
  final VoidCallback onTap;
  final VoidCallback onFavorite;

  const VenueCard({
    super.key,
    required this.venue,
    required this.onTap,
    required this.onFavorite,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            _buildImage(),

            const SizedBox(height: 12),

            // Venue Info
            _buildInfo(),

            const SizedBox(height: 12),

            // Divider
            Container(
              height: 1,
              color: Colors.grey[200],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImage() {
    return Stack(
      children: [
        // Main Image
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: AspectRatio(
            aspectRatio: 16 / 10,
            child: CachedNetworkImage(
              imageUrl: venue.imageUrls.isNotEmpty
                  ? venue.imageUrls[0]
                  : 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
              fit: BoxFit.cover,
              placeholder: (context, url) => Container(
                color: Colors.grey[200],
                child: const Center(
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
              errorWidget: (context, url, error) => Container(
                color: Colors.grey[300],
                child: const Icon(Icons.error),
              ),
            ),
          ),
        ),

        // Favorite Button
        Positioned(
          top: 12,
          right: 12,
          child: GestureDetector(
            onTap: onFavorite,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.9),
                shape: BoxShape.circle,
              ),
              child: Icon(
                venue.isFavorite ? Icons.favorite : Icons.favorite_border,
                color: venue.isFavorite ? Colors.pink : Colors.black87,
                size: 20,
              ),
            ),
          ),
        ),

        // Photo Count Indicator
        if (venue.imageUrls.length > 1)
          Positioned(
            bottom: 12,
            right: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.6),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.photo_library,
                    color: Colors.white,
                    size: 14,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${venue.imageUrls.length}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildInfo() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Title
        Text(
          venue.title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),

        const SizedBox(height: 6),

        // Rating and Category
        Row(
          children: [
            const Icon(Icons.star, color: Colors.amber, size: 16),
            const SizedBox(width: 4),
            Text(
              '${venue.rating.toStringAsFixed(1)} (${venue.reviewCount})',
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
            Text(
              ' · ${_getCategoryDisplay()}',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),

        const SizedBox(height: 6),

        // Price and Capacity
        Row(
          children: [
            const Icon(Icons.attach_money, size: 16, color: Colors.green),
            Text(
              venue.priceData.formattedRange,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
            Text(
              ' · ${venue.minCapacity}-${venue.maxCapacity} pax',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),

        // Distance
        if (venue.distance != null) ...[
          const SizedBox(height: 6),
          Row(
            children: [
              Icon(Icons.location_on_outlined, size: 16, color: Colors.grey[600]),
              const SizedBox(width: 4),
              Text(
                venue.distance!,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ],

        // Tags
        if (venue.tags.isNotEmpty) ...[
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: venue.tags.take(3).map((tag) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  '${tag.icon ?? ""} ${tag.name}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[700],
                    fontWeight: FontWeight.w500,
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ],
    );
  }

  String _getCategoryDisplay() {
    switch (venue.style) {
      case VenueStyle.modern:
        return 'Modern';
      case VenueStyle.rustic:
        return 'Rustic';
      case VenueStyle.beachfront:
        return 'Beachfront';
      case VenueStyle.garden:
        return 'Garden';
      case VenueStyle.industrial:
        return 'Industrial';
      case VenueStyle.vineyard:
        return 'Vineyard';
      case VenueStyle.ballroom:
        return 'Ballroom';
      case VenueStyle.barn:
        return 'Barn';
      case VenueStyle.estate:
        return 'Estate';
    }
  }
}
