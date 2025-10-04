import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vow_society/models/venue.dart';
import 'package:vow_society/models/search_filters.dart';
import 'package:vow_society/widgets/venue_card.dart';
import 'package:vow_society/screens/filter_screen.dart';

class SearchResultsScreen extends ConsumerStatefulWidget {
  final SearchFilters filters;

  const SearchResultsScreen({
    super.key,
    required this.filters,
  });

  @override
  ConsumerState<SearchResultsScreen> createState() => _SearchResultsScreenState();
}

class _SearchResultsScreenState extends ConsumerState<SearchResultsScreen> {
  SearchFilters? currentFilters;
  String viewMode = 'list'; // 'list' or 'map'

  @override
  void initState() {
    super.initState();
    currentFilters = widget.filters;
  }

  @override
  Widget build(BuildContext context) {
    // Mock venues data - in real app this would come from Supabase
    final venues = _getMockVenues();

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            _buildHeader(context, venues.length),

            // Results
            Expanded(
              child: viewMode == 'list'
                  ? _buildListView(venues)
                  : const Center(child: Text('Map View - Coming Soon')),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, int resultCount) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.black87),
                onPressed: () => Navigator.pop(context),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${currentFilters?.location ?? "All areas"} · ${currentFilters?.guestCount ?? 0} guests',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                    ),
                    Text(
                      '$resultCount venues',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              // Filter Button
              Stack(
                children: [
                  IconButton(
                    icon: const Icon(Icons.tune, color: Colors.black87),
                    onPressed: () => _openFilters(context),
                  ),
                  if (currentFilters?.hasActiveFilters ?? false)
                    Positioned(
                      right: 8,
                      top: 8,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Colors.pink,
                          shape: BoxShape.circle,
                        ),
                        constraints: const BoxConstraints(
                          minWidth: 16,
                          minHeight: 16,
                        ),
                        child: Text(
                          '${currentFilters?.activeFilterCount}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                ],
              ),
              // Favorites Button
              IconButton(
                icon: const Icon(Icons.favorite_border, color: Colors.black87),
                onPressed: () {
                  Navigator.pushNamed(context, '/favorites');
                },
              ),
            ],
          ),

          // View Mode Toggle
          const SizedBox(height: 8),
          Row(
            children: [
              _buildViewModeButton('List', 'list', Icons.view_list),
              const SizedBox(width: 8),
              _buildViewModeButton('Map', 'map', Icons.map_outlined),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildViewModeButton(String label, String mode, IconData icon) {
    final isSelected = viewMode == mode;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => viewMode = mode),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? Colors.black87 : Colors.grey[100],
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 18,
                color: isSelected ? Colors.white : Colors.grey[600],
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? Colors.white : Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildListView(List<Venue> venues) {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 16),
      itemCount: venues.length,
      itemBuilder: (context, index) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: VenueCard(
            venue: venues[index],
            onTap: () {
              Navigator.pushNamed(
                context,
                '/venue-detail',
                arguments: venues[index],
              );
            },
            onFavorite: () {
              // Toggle favorite
              setState(() {
                venues[index] = venues[index].copyWith(
                  isFavorite: !venues[index].isFavorite,
                );
              });
            },
          ),
        );
      },
    );
  }

  void _openFilters(BuildContext context) async {
    final result = await Navigator.push<SearchFilters>(
      context,
      MaterialPageRoute(
        builder: (context) => FilterScreen(
          initialFilters: currentFilters!,
        ),
      ),
    );

    if (result != null) {
      setState(() {
        currentFilters = result;
      });
      // Trigger new search with updated filters
    }
  }

  List<Venue> _getMockVenues() {
    // Mock data - replace with actual API call
    return [
      // Venue data would be loaded from Supabase in real implementation
    ];
  }
}
