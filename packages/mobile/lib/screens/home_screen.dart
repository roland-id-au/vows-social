import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:vow_society/services/supabase_service.dart';
import 'package:vow_society/widgets/feed_grid.dart';
import 'package:vow_society/widgets/category_pills.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _supabase = SupabaseService();
  List<FeedItem> _feedItems = [];
  bool _isLoading = false;
  bool _hasMore = true;
  int _currentPage = 0;
  String? _selectedCategory;

  @override
  void initState() {
    super.initState();
    _loadFeed();
  }

  Future<void> _loadFeed({bool isRefresh = false}) async {
    if (_isLoading) return;

    setState(() {
      _isLoading = true;
      if (isRefresh) {
        _currentPage = 0;
        _feedItems = [];
      }
    });

    try {
      final response = await _supabase.getTrendingFeed(
        page: _currentPage,
        pageSize: 20,
      );

      setState(() {
        if (isRefresh) {
          _feedItems = response.items;
        } else {
          _feedItems.addAll(response.items);
        }
        _hasMore = response.hasMore;
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading feed: $e');
      setState(() => _isLoading = false);
    }
  }

  void _onLoadMore() {
    if (!_hasMore || _isLoading) return;
    setState(() => _currentPage++);
    _loadFeed();
  }

  void _onCategorySelected(String? categoryId) {
    setState(() => _selectedCategory = categoryId);
    // TODO: Implement category filtering
    // For now, just reset the feed
    _loadFeed(isRefresh: true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // Header with branding
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Column(
                  children: [
                    Text(
                      'The Vows Social',
                      style: GoogleFonts.yesevaOne(
                        fontSize: 36,
                        fontWeight: FontWeight.w400,
                        color: Colors.black87,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),

            // Category Pills - Sticky Header
            SliverPersistentHeader(
              pinned: true,
              delegate: _CategoryHeaderDelegate(
                child: CategoryPills(
                  selectedCategory: _selectedCategory,
                  onCategorySelected: _onCategorySelected,
                ),
              ),
            ),

            // Feed Grid
            SliverToBoxAdapter(
              child: FeedGrid(
                items: _feedItems,
                isLoading: _isLoading,
                hasMore: _hasMore,
                onLoadMore: _onLoadMore,
              ),
            ),

            // Bottom padding
            const SliverToBoxAdapter(
              child: SizedBox(height: 32),
            ),
          ],
        ),
      ),
    );
  }
}

// Custom delegate for sticky category header
class _CategoryHeaderDelegate extends SliverPersistentHeaderDelegate {
  final Widget child;

  _CategoryHeaderDelegate({required this.child});

  @override
  double get minExtent => 48;

  @override
  double get maxExtent => 48;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return child;
  }

  @override
  bool shouldRebuild(covariant SliverPersistentHeaderDelegate oldDelegate) {
    return false;
  }
}
