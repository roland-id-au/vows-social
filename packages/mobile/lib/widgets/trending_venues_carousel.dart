import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

class TrendingVenuesCarousel extends StatelessWidget {
  const TrendingVenuesCarousel({super.key});

  @override
  Widget build(BuildContext context) {
    // Mock trending venues data
    final trendingVenues = [
      {
        'title': 'Barn\nStyle',
        'image': 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400',
      },
      {
        'title': 'Beach\nFront',
        'image': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
      },
      {
        'title': 'Garden\nVenue',
        'image': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400',
      },
      {
        'title': 'Modern\nBallroom',
        'image': 'https://images.unsplash.com/photo-1519167758481-83f29da8c8d0?w=400',
      },
    ];

    return SizedBox(
      height: 180,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        scrollDirection: Axis.horizontal,
        itemCount: trendingVenues.length,
        itemBuilder: (context, index) {
          final venue = trendingVenues[index];
          return Padding(
            padding: EdgeInsets.only(
              right: index < trendingVenues.length - 1 ? 16 : 0,
            ),
            child: _buildTrendingCard(
              title: venue['title']!,
              imageUrl: venue['image']!,
              onTap: () {
                // Navigate to filtered results
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildTrendingCard({
    required String title,
    required String imageUrl,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 140,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Image
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: CachedNetworkImage(
                imageUrl: imageUrl,
                width: 140,
                height: 180,
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

            // Gradient Overlay
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withOpacity(0.7),
                  ],
                ),
              ),
            ),

            // Title
            Positioned(
              bottom: 12,
              left: 12,
              child: Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  height: 1.2,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
