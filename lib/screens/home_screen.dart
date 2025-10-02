import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vow_society/models/search_filters.dart';
import 'package:vow_society/widgets/trending_venues_carousel.dart';
import 'package:intl/intl.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  String selectedLocation = 'Sydney, NSW';
  DateTime? selectedDate;
  String selectedGuestCount = '100-150';

  final List<String> locations = [
    'Sydney, NSW',
    'Melbourne, VIC',
    'Brisbane, QLD',
    'Perth, WA',
    'Adelaide, SA',
  ];

  final List<String> guestCounts = [
    '50-75',
    '75-100',
    '100-150',
    '150-200',
    '200+',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // App Bar
            SliverAppBar(
              backgroundColor: Colors.white,
              elevation: 0,
              floating: true,
              leading: IconButton(
                icon: const Icon(Icons.menu, color: Colors.black87),
                onPressed: () {
                  // Open drawer
                },
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.person_outline, color: Colors.black87),
                  onPressed: () {
                    // Navigate to profile
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.notifications_outlined, color: Colors.black87),
                  onPressed: () {
                    // Navigate to notifications
                  },
                ),
              ],
            ),

            // Content
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 10),

                    // Hero Title
                    _buildHeroSection(),

                    const SizedBox(height: 30),

                    // Search Inputs
                    _buildSearchInputs(context),

                    const SizedBox(height: 24),

                    // Search Button
                    _buildSearchButton(context),

                    const SizedBox(height: 40),

                    // Divider
                    Container(
                      height: 1,
                      color: Colors.grey[200],
                    ),

                    const SizedBox(height: 30),

                    // Trending Section
                    _buildTrendingSection(),

                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),

            // Trending Venues Carousel
            const SliverToBoxAdapter(
              child: TrendingVenuesCarousel(),
            ),

            const SliverToBoxAdapter(
              child: SizedBox(height: 40),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeroSection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.pink[50]!,
            Colors.purple[50]!,
          ],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            'THE VOW SOCIETY',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              letterSpacing: 2,
              color: Colors.grey[700],
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Find your perfect\nwedding venue',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 16),
          Container(
            height: 180,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              image: const DecorationImage(
                image: NetworkImage(
                  'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
                ),
                fit: BoxFit.cover,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchInputs(BuildContext context) {
    return Column(
      children: [
        // Location
        _buildInputField(
          icon: Icons.location_on_outlined,
          label: 'Location',
          value: selectedLocation,
          onTap: () => _showLocationPicker(context),
        ),

        const SizedBox(height: 16),

        // Wedding Date
        _buildInputField(
          icon: Icons.calendar_today_outlined,
          label: 'Wedding Date',
          value: selectedDate != null
              ? DateFormat('dd/MM/yyyy').format(selectedDate!)
              : 'Select date',
          onTap: () => _showDatePicker(context),
        ),

        const SizedBox(height: 16),

        // Guest Count
        _buildInputField(
          icon: Icons.people_outline,
          label: 'Guest Count',
          value: selectedGuestCount,
          onTap: () => _showGuestCountPicker(context),
        ),
      ],
    );
  }

  Widget _buildInputField({
    required IconData icon,
    required String label,
    required String value,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey[300]!),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.grey[600], size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    style: const TextStyle(
                      fontSize: 16,
                      color: Colors.black87,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_drop_down, color: Colors.grey[400]),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchButton(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: () {
          // Navigate to search results
          _performSearch(context);
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.black87,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search, size: 22),
            SizedBox(width: 8),
            Text(
              'SEARCH VENUES',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTrendingSection() {
    return Row(
      children: [
        const Text(
          'Trending this week',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '✨',
          style: TextStyle(fontSize: 20),
        ),
      ],
    );
  }

  void _showLocationPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Select Location',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            ...locations.map((location) => ListTile(
              title: Text(location),
              trailing: selectedLocation == location
                  ? const Icon(Icons.check, color: Colors.pink)
                  : null,
              onTap: () {
                setState(() {
                  selectedLocation = location;
                });
                Navigator.pop(context);
              },
            )),
          ],
        ),
      ),
    );
  }

  void _showDatePicker(BuildContext context) async {
    final date = await showDatePicker(
      context: context,
      initialDate: selectedDate ?? DateTime.now().add(const Duration(days: 180)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 730)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: Colors.pink[400]!,
              onPrimary: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (date != null) {
      setState(() {
        selectedDate = date;
      });
    }
  }

  void _showGuestCountPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Select Guest Count',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            ...guestCounts.map((count) => ListTile(
              title: Text('$count guests'),
              trailing: selectedGuestCount == count
                  ? const Icon(Icons.check, color: Colors.pink)
                  : null,
              onTap: () {
                setState(() {
                  selectedGuestCount = count;
                });
                Navigator.pop(context);
              },
            )),
          ],
        ),
      ),
    );
  }

  void _performSearch(BuildContext context) {
    // Navigate to search results screen
    Navigator.pushNamed(
      context,
      '/search-results',
      arguments: SearchFilters(
        location: selectedLocation,
        weddingDate: selectedDate,
        guestCount: _parseGuestCount(selectedGuestCount),
      ),
    );
  }

  int _parseGuestCount(String guestCount) {
    if (guestCount.contains('-')) {
      final parts = guestCount.split('-');
      return int.parse(parts[0]);
    }
    return int.parse(guestCount.replaceAll('+', ''));
  }
}
