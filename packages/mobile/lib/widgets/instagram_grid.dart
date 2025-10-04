import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:vow_society/models/instagram_post.dart';

class InstagramGrid extends StatelessWidget {
  final List<InstagramPost> posts;
  final VoidCallback? onViewAll;

  const InstagramGrid({
    super.key,
    required this.posts,
    this.onViewAll,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
          ),
          itemCount: posts.length,
          itemBuilder: (context, index) {
            return _buildInstagramPost(posts[index]);
          },
        ),
        if (onViewAll != null && posts.length > 6) ...[
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: onViewAll,
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.black87,
              side: BorderSide(color: Colors.grey[300]!),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('View All Photos'),
          ),
        ],
      ],
    );
  }

  Widget _buildInstagramPost(InstagramPost post) {
    return GestureDetector(
      onTap: () {
        // Open full post or gallery
      },
      child: Stack(
        fit: StackFit.expand,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: CachedNetworkImage(
              imageUrl: post.imageUrl,
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
          // Likes overlay
          Positioned(
            bottom: 8,
            left: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.6),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.favorite,
                    color: Colors.white,
                    size: 12,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    post.formattedLikes,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
