import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:vow_society/models/venue.dart';
import 'package:vow_society/models/instagram_post.dart';
import 'package:vow_society/widgets/feed_grid.dart';

// Add import for PriceData
import 'package:vow_society/models/venue.dart' show PriceData;

class FeedCard extends StatelessWidget {
  final dynamic item;
  final FeedItemType type;
  final int index;

  const FeedCard({
    super.key,
    required this.item,
    required this.type,
    this.index = 0,
  });

  @override
  Widget build(BuildContext context) {
    if (type == FeedItemType.instagram) {
      return _buildInstagramCard(context, item as InstagramPost);
    }
    return _buildListingCard(context, item as Venue);
  }

  Widget _buildInstagramCard(BuildContext context, InstagramPost post) {
    return GestureDetector(
      onTap: () {
        final uri = Uri.parse(post.permalink);
        launchUrl(uri, mode: LaunchMode.externalApplication);
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image with Instagram badge
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(12),
                  ),
                  child: AspectRatio(
                    aspectRatio: 1,
                    child: post.mediaUrl != null
                        ? CachedNetworkImage(
                            imageUrl: post.mediaUrl!,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Container(
                              color: Colors.grey.shade200,
                            ),
                            errorWidget: (context, url, error) => Container(
                              color: Colors.grey.shade200,
                              child: const Icon(Icons.error),
                            ),
                          )
                        : Container(
                            color: Colors.grey.shade200,
                            child: const Icon(Icons.image_not_supported),
                          ),
                  ),
                ),
                // Instagram badge
                Positioned(
                  top: 8,
                  left: 8,
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [
                          Color(0xFF9333EA), // purple-600
                          Color(0xFFEC4899), // pink-500
                          Color(0xFFFB923C), // orange-400
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.camera_alt,
                          size: 12,
                          color: Colors.white,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Instagram',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 10,
                              ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            // Content
            if (post.caption != null || (post.likeCount != null && post.likeCount! > 0))
              Padding(
                padding: const EdgeInsets.all(12.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (post.caption != null)
                      Text(
                        post.caption!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.grey.shade700,
                            ),
                      ),
                    if (post.caption != null && post.likeCount != null && post.likeCount! > 0)
                      const SizedBox(height: 8),
                    if (post.likeCount != null && post.likeCount! > 0)
                      Row(
                        children: [
                          Icon(
                            Icons.favorite,
                            size: 14,
                            color: Colors.red.shade400,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            post.formattedLikes,
                            style:
                                Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: Colors.grey.shade600,
                                      fontWeight: FontWeight.w500,
                                    ),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildListingCard(BuildContext context, Venue venue) {
    final imageUrl = _getVenueImageUrl(venue);
    final isNew = _isNew(venue);
    final isTrending = _isTrending(venue);

    return GestureDetector(
      onTap: () {
        context.push('/venue-detail/${venue.id}', extra: venue);
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 20,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Stack(
            children: [
              // Image
              AspectRatio(
                aspectRatio: 0.8, // 4:5 aspect ratio
                child: imageUrl != null
                    ? CachedNetworkImage(
                        imageUrl: imageUrl,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Container(
                          color: Colors.grey.shade200,
                        ),
                        errorWidget: (context, url, error) => Container(
                          color: Colors.grey.shade200,
                          child: Center(
                            child: Icon(
                              Icons.image_not_supported,
                              color: Colors.grey.shade400,
                              size: 48,
                            ),
                          ),
                        ),
                      )
                    : Container(
                        color: Colors.grey.shade200,
                        child: Center(
                          child: Icon(
                            Icons.image_not_supported,
                            color: Colors.grey.shade400,
                            size: 48,
                          ),
                        ),
                      ),
              ),
              // Gradient overlay
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  height: 150,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [
                        Colors.black.withOpacity(0.7),
                        Colors.black.withOpacity(0.2),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
              // Badges (only show for first few items)
              if (index < 4 && (isNew || isTrending))
                Positioned(
                  top: 12,
                  right: 12,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      if (isTrending)
                        Container(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [
                                Color(0xFFF97316), // orange-500
                                Color(0xFFEC4899), // pink-500
                              ],
                            ),
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.2),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text(
                                '🔥',
                                style: TextStyle(fontSize: 12),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Trending',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 11,
                                    ),
                              ),
                            ],
                          ),
                        ),
                      if (isNew && !isTrending) ...[
                        if (isTrending) const SizedBox(height: 8),
                        Container(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [
                                Color(0xFF10B981), // green-500
                                Color(0xFF059669), // emerald-600
                              ],
                            ),
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.2),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text(
                                '✨',
                                style: TextStyle(fontSize: 12),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'New',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 11,
                                    ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              // Content overlay
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        venue.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              shadows: [
                                Shadow(
                                  color: Colors.black.withOpacity(0.5),
                                  blurRadius: 4,
                                ),
                              ],
                            ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            Icons.location_on,
                            size: 14,
                            color: Colors.white.withOpacity(0.9),
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              _getShortAddress(venue),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(
                                    color: Colors.white.withOpacity(0.9),
                                    shadows: [
                                      Shadow(
                                        color: Colors.black.withOpacity(0.5),
                                        blurRadius: 4,
                                      ),
                                    ],
                                  ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _formatPriceRange(venue.priceData),
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  shadows: [
                                    Shadow(
                                      color: Colors.black.withOpacity(0.5),
                                      blurRadius: 4,
                                    ),
                                  ],
                                ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String? _getVenueImageUrl(Venue venue) {
    if (venue.imageUrls.isNotEmpty) {
      return venue.imageUrls.first;
    }
    return null;
  }

  String _getShortAddress(Venue venue) {
    return '${venue.location.city}, ${venue.location.state}';
  }

  String _formatPriceRange(PriceData priceData) {
    return priceData.formattedRange;
  }

  bool _isNew(Venue venue) {
    if (venue.createdAt == null) return false;
    final now = DateTime.now();
    final difference = now.difference(venue.createdAt!);
    return difference.inDays < 7;
  }

  bool _isTrending(Venue venue) {
    if (venue.updatedAt == null) return false;
    final now = DateTime.now();
    final difference = now.difference(venue.updatedAt!);
    return difference.inHours < 48;
  }
}
