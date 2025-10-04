import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vow_society/models/venue.dart';
import 'package:vow_society/widgets/venue_card.dart';

class FavoritesScreen extends ConsumerStatefulWidget {
  const FavoritesScreen({super.key});

  @override
  ConsumerState<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends ConsumerState<FavoritesScreen> {
  String selectedCollection = 'All Saves';
  List<Venue> selectedVenues = [];

  final List<String> collections = [
    'All Saves',
    'Shortlist',
    'Garden Venues',
    'Beachfront',
  ];

  @override
  Widget build(BuildContext context) {
    // Mock favorite venues - in real app would come from Supabase
    final favoriteVenues = _getMockFavoriteVenues();

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'My Saved Venues',
          style: TextStyle(
            color: Colors.black87,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          if (selectedVenues.isNotEmpty)
            TextButton(
              onPressed: () {
                // Navigate to compare screen
                Navigator.pushNamed(
                  context,
                  '/compare',
                  arguments: selectedVenues,
                );
              },
              child: Text(
                'Compare (${selectedVenues.length})',
                style: TextStyle(
                  color: Colors.pink[400],
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.add, color: Colors.black87),
            onPressed: () {
              _showAddCollectionDialog(context);
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Collection Selector
          _buildCollectionSelector(),

          // Venues List
          Expanded(
            child: favoriteVenues.isEmpty
                ? _buildEmptyState()
                : _buildVenuesList(favoriteVenues),
          ),
        ],
      ),
    );
  }

  Widget _buildCollectionSelector() {
    return Container(
      height: 60,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey[300]!),
                borderRadius: BorderRadius.circular(12),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: selectedCollection,
                  isExpanded: true,
                  icon: const Icon(Icons.arrow_drop_down),
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                  ),
                  items: collections.map((String collection) {
                    return DropdownMenuItem<String>(
                      value: collection,
                      child: Text(collection),
                    );
                  }).toList(),
                  onChanged: (String? newValue) {
                    if (newValue != null) {
                      setState(() {
                        selectedCollection = newValue;
                      });
                    }
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVenuesList(List<Venue> venues) {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 16),
      itemCount: venues.length,
      itemBuilder: (context, index) {
        final venue = venues[index];
        final isSelected = selectedVenues.any((v) => v.id == venue.id);

        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Stack(
            children: [
              VenueCard(
                venue: venue,
                onTap: () {
                  if (selectedVenues.isNotEmpty) {
                    // Selection mode - toggle selection
                    _toggleSelection(venue);
                  } else {
                    // Navigate to detail
                    Navigator.pushNamed(
                      context,
                      '/venue-detail',
                      arguments: venue,
                    );
                  }
                },
                onFavorite: () {
                  setState(() {
                    // Remove from favorites
                    venues.removeAt(index);
                  });
                },
              ),

              // Action Buttons Overlay
              Positioned(
                bottom: 16,
                left: 20,
                right: 20,
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      // Select for Compare
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _toggleSelection(venue),
                          icon: Icon(
                            isSelected
                                ? Icons.check_circle
                                : Icons.radio_button_unchecked,
                            size: 18,
                          ),
                          label: Text(
                            isSelected ? 'Selected' : 'Compare',
                            style: const TextStyle(fontSize: 13),
                          ),
                          style: OutlinedButton.styleFrom(
                            foregroundColor:
                                isSelected ? Colors.pink[400] : Colors.grey[700],
                            side: BorderSide(
                              color: isSelected
                                  ? Colors.pink[400]!
                                  : Colors.grey[300]!,
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Message Venue
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            // Open messaging
                          },
                          icon: const Icon(Icons.message_outlined, size: 18),
                          label: const Text(
                            'Message',
                            style: TextStyle(fontSize: 13),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.pink[400],
                            foregroundColor: Colors.white,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(vertical: 8),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.favorite_border,
              size: 80,
              color: Colors.grey[300],
            ),
            const SizedBox(height: 24),
            const Text(
              'No saved venues yet',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Start exploring and save your favorite venues to compare and contact them later',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 15,
                color: Colors.grey[600],
                height: 1.5,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.pink[400],
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 16,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'Explore Venues',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _toggleSelection(Venue venue) {
    setState(() {
      final isSelected = selectedVenues.any((v) => v.id == venue.id);
      if (isSelected) {
        selectedVenues.removeWhere((v) => v.id == venue.id);
      } else {
        if (selectedVenues.length < 4) {
          // Maximum 4 venues for comparison
          selectedVenues.add(venue);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('You can compare up to 4 venues at a time'),
              duration: Duration(seconds: 2),
            ),
          );
        }
      }
    });
  }

  void _showAddCollectionDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Create New Collection'),
        content: TextField(
          decoration: const InputDecoration(
            hintText: 'Collection name',
            border: OutlineInputBorder(),
          ),
          autofocus: true,
          onSubmitted: (value) {
            if (value.isNotEmpty) {
              setState(() {
                collections.add(value);
              });
              Navigator.pop(context);
            }
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              // Add collection logic
              Navigator.pop(context);
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  List<Venue> _getMockFavoriteVenues() {
    // Mock data - replace with actual Supabase query
    return [];
  }
}
