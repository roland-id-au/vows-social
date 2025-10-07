import 'package:flutter/material.dart';
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';
import 'package:vow_society/models/venue.dart';
import 'package:vow_society/models/instagram_post.dart';
import 'package:vow_society/widgets/feed_card.dart';
import 'package:shimmer/shimmer.dart';

class FeedGrid extends StatefulWidget {
  final List<FeedItem> items;
  final bool isLoading;
  final bool hasMore;
  final VoidCallback? onLoadMore;

  const FeedGrid({
    super.key,
    required this.items,
    this.isLoading = false,
    this.hasMore = true,
    this.onLoadMore,
  });

  @override
  State<FeedGrid> createState() => _FeedGridState();
}

class _FeedGridState extends State<FeedGrid> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      if (widget.hasMore && !widget.isLoading && widget.onLoadMore != null) {
        widget.onLoadMore!();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.items.isEmpty && widget.isLoading) {
      return _buildLoadingGrid();
    }

    if (widget.items.isEmpty && !widget.isLoading) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.search_off,
                size: 64,
                color: Colors.grey.shade400,
              ),
              const SizedBox(height: 16),
              Text(
                'No listings found',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: Colors.grey.shade600,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                'Try adjusting your filters',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey.shade500,
                    ),
              ),
            ],
          ),
        ),
      );
    }

    return AnimationLimiter(
      child: MasonryGridView.count(
        controller: _scrollController,
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        padding: const EdgeInsets.all(16),
        itemCount: widget.items.length + (widget.isLoading ? 2 : 0),
        itemBuilder: (context, index) {
          if (index >= widget.items.length) {
            return _buildLoadingCard();
          }

          final item = widget.items[index];
          return AnimationConfiguration.staggeredGrid(
            position: index,
            duration: const Duration(milliseconds: 375),
            columnCount: 2,
            child: ScaleAnimation(
              child: FadeInAnimation(
                child: FeedCard(
                  item: item.item,
                  type: item.type,
                  index: index,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildLoadingGrid() {
    return MasonryGridView.count(
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      padding: const EdgeInsets.all(16),
      itemCount: 8,
      itemBuilder: (context, index) => _buildLoadingCard(),
    );
  }

  Widget _buildLoadingCard() {
    return Shimmer.fromColors(
      baseColor: Colors.grey.shade300,
      highlightColor: Colors.grey.shade100,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 240,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(12),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    height: 16,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    height: 14,
                    width: 100,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Feed item wrapper class
class FeedItem {
  final dynamic item; // Either Venue or InstagramPost
  final FeedItemType type;

  FeedItem({
    required this.item,
    required this.type,
  });

  factory FeedItem.listing(Venue venue) {
    return FeedItem(
      item: venue,
      type: FeedItemType.listing,
    );
  }

  factory FeedItem.instagram(InstagramPost post) {
    return FeedItem(
      item: post,
      type: FeedItemType.instagram,
    );
  }
}

enum FeedItemType {
  listing,
  instagram,
}
