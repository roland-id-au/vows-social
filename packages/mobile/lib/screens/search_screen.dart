import 'package:flutter/material.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({Key? key}) : super(key: key);

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocus = FocusNode();

  String? _selectedCategory;
  String? _selectedLocation;
  RangeValues _priceRange = const RangeValues(0, 500);
  int? _guestCapacity;

  final List<String> _recentSearches = [
    'Outdoor venues Sydney',
    'Photographers under \$5000',
    'Rustic barns Melbourne',
  ];

  final List<String> _trendingSearches = [
    'Waterfront venues',
    'Garden weddings',
    'Industrial warehouses',
    'Historic estates',
  ];

  final List<Map<String, dynamic>> _quickFilters = [
    {'label': 'Under \$200/guest', 'icon': Icons.attach_money},
    {'label': 'Pet friendly', 'icon': Icons.pets},
    {'label': 'Accommodation', 'icon': Icons.hotel},
    {'label': 'Outdoor', 'icon': Icons.park},
    {'label': 'City views', 'icon': Icons.location_city},
  ];

  @override
  void initState() {
    super.initState();
    // Auto-focus search field when screen opens
    Future.delayed(const Duration(milliseconds: 300), () {
      _searchFocus.requestFocus();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Search header
            _buildSearchHeader(),

            // Active filters
            if (_selectedCategory != null ||
                _selectedLocation != null ||
                _priceRange != const RangeValues(0, 500))
              _buildActiveFilters(),

            // Main content
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 24),

                    // Quick filters
                    _buildQuickFilters(),

                    const SizedBox(height: 32),

                    // Recent searches
                    if (_recentSearches.isNotEmpty) ...[
                      _buildSectionTitle('Recent searches'),
                      const SizedBox(height: 16),
                      _buildRecentSearches(),
                      const SizedBox(height: 32),
                    ],

                    // Trending searches
                    _buildSectionTitle('Trending'),
                    const SizedBox(height: 16),
                    _buildTrendingSearches(),

                    const SizedBox(height: 32),

                    // Advanced filters button
                    _buildAdvancedFiltersButton(),

                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchHeader() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.arrow_back, size: 20),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(24),
              ),
              child: Row(
                children: [
                  Icon(Icons.search, color: Colors.grey[600], size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      focusNode: _searchFocus,
                      decoration: InputDecoration(
                        hintText: 'Search venues, services, locations...',
                        hintStyle: TextStyle(
                          color: Colors.grey[500],
                          fontSize: 14,
                        ),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.zero,
                        isDense: true,
                      ),
                      onSubmitted: (value) {
                        // Perform search
                      },
                    ),
                  ),
                  if (_searchController.text.isNotEmpty)
                    GestureDetector(
                      onTap: () {
                        setState(() {
                          _searchController.clear();
                        });
                      },
                      child: Icon(Icons.close, color: Colors.grey[600], size: 18),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveFilters() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        border: Border(
          bottom: BorderSide(color: Colors.grey.withOpacity(0.2)),
        ),
      ),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          if (_selectedCategory != null)
            _buildFilterChip(_selectedCategory!, () {
              setState(() => _selectedCategory = null);
            }),
          if (_selectedLocation != null)
            _buildFilterChip(_selectedLocation!, () {
              setState(() => _selectedLocation = null);
            }),
          if (_priceRange != const RangeValues(0, 500))
            _buildFilterChip(
              '\$${_priceRange.start.round()}-\$${_priceRange.end.round()}/guest',
              () {
                setState(() => _priceRange = const RangeValues(0, 500));
              },
            ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, VoidCallback onRemove) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF222222),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(width: 6),
          GestureDetector(
            onTap: onRemove,
            child: const Icon(Icons.close, color: Colors.white, size: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickFilters() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Text(
            'Quick filters',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.grey[800],
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 44,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: _quickFilters.length,
            itemBuilder: (context, index) {
              final filter = _quickFilters[index];
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: OutlinedButton.icon(
                  onPressed: () {
                    // Apply filter
                  },
                  icon: Icon(filter['icon'] as IconData, size: 16),
                  label: Text(filter['label'] as String),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF222222),
                    side: BorderSide(color: Colors.grey.withOpacity(0.3)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(24),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w700,
          color: Color(0xFF222222),
          letterSpacing: -0.5,
        ),
      ),
    );
  }

  Widget _buildRecentSearches() {
    return Column(
      children: _recentSearches.map((search) {
        return ListTile(
          leading: Icon(Icons.history, color: Colors.grey[400]),
          title: Text(
            search,
            style: const TextStyle(fontSize: 15),
          ),
          trailing: IconButton(
            icon: Icon(Icons.close, color: Colors.grey[400], size: 20),
            onPressed: () {
              setState(() {
                _recentSearches.remove(search);
              });
            },
          ),
          onTap: () {
            _searchController.text = search;
            // Perform search
          },
        );
      }).toList(),
    );
  }

  Widget _buildTrendingSearches() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: _trendingSearches.map((search) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: GestureDetector(
            onTap: () {
              _searchController.text = search;
              // Perform search
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(24),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.trending_up, size: 16, color: Colors.grey[700]),
                  const SizedBox(width: 8),
                  Text(
                    search,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Colors.grey[800],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildAdvancedFiltersButton() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: OutlinedButton(
        onPressed: () {
          _showAdvancedFilters();
        },
        style: OutlinedButton.styleFrom(
          foregroundColor: const Color(0xFF222222),
          side: BorderSide(color: Colors.grey.withOpacity(0.3)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(vertical: 16),
          minimumSize: const Size(double.infinity, 50),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.tune, size: 20),
            const SizedBox(width: 8),
            Text(
              'Advanced filters',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: Colors.grey[800],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAdvancedFilters() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _buildAdvancedFiltersSheet(),
    );
  }

  Widget _buildAdvancedFiltersSheet() {
    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(24),
              topRight: Radius.circular(24),
            ),
          ),
          child: Column(
            children: [
              // Handle
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 20),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Filters',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.5,
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        setState(() {
                          _selectedCategory = null;
                          _selectedLocation = null;
                          _priceRange = const RangeValues(0, 500);
                          _guestCapacity = null;
                        });
                      },
                      child: const Text('Clear all'),
                    ),
                  ],
                ),
              ),
              const Divider(),
              // Filters
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(20),
                  children: [
                    _buildFilterSection(
                      'Category',
                      ['Venues', 'Photographers', 'Caterers', 'Florists', 'DJs', 'Planners'],
                      _selectedCategory,
                      (value) => setState(() => _selectedCategory = value),
                    ),
                    const SizedBox(height: 24),
                    _buildFilterSection(
                      'Location',
                      ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Hobart'],
                      _selectedLocation,
                      (value) => setState(() => _selectedLocation = value),
                    ),
                    const SizedBox(height: 24),
                    _buildPriceRangeFilter(),
                    const SizedBox(height: 24),
                    _buildGuestCapacityFilter(),
                  ],
                ),
              ),
              // Apply button
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, -2),
                    ),
                  ],
                ),
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                    // Apply filters and show results
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF222222),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    minimumSize: const Size(double.infinity, 50),
                  ),
                  child: const Text(
                    'Show results',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildFilterSection(
    String title,
    List<String> options,
    String? selectedValue,
    Function(String?) onChanged,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: options.map((option) {
            final isSelected = selectedValue == option;
            return GestureDetector(
              onTap: () => onChanged(isSelected ? null : option),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFF222222) : Colors.white,
                  border: Border.all(
                    color: isSelected ? const Color(0xFF222222) : Colors.grey.withOpacity(0.3),
                  ),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Text(
                  option,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: isSelected ? Colors.white : const Color(0xFF222222),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildPriceRangeFilter() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Price range (per guest)',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Text(
              '\$${_priceRange.start.round()}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const Spacer(),
            Text(
              '\$${_priceRange.end.round()}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
          ],
        ),
        RangeSlider(
          values: _priceRange,
          min: 0,
          max: 500,
          divisions: 50,
          activeColor: const Color(0xFF222222),
          onChanged: (values) {
            setState(() => _priceRange = values);
          },
        ),
      ],
    );
  }

  Widget _buildGuestCapacityFilter() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Guest capacity',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _buildCapacityChip('1-50', 50),
            _buildCapacityChip('51-100', 100),
            _buildCapacityChip('101-150', 150),
            _buildCapacityChip('151-200', 200),
            _buildCapacityChip('200+', 999),
          ],
        ),
      ],
    );
  }

  Widget _buildCapacityChip(String label, int capacity) {
    final isSelected = _guestCapacity == capacity;
    return GestureDetector(
      onTap: () {
        setState(() {
          _guestCapacity = isSelected ? null : capacity;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF222222) : Colors.white,
          border: Border.all(
            color: isSelected ? const Color(0xFF222222) : Colors.grey.withOpacity(0.3),
          ),
          borderRadius: BorderRadius.circular(24),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: isSelected ? Colors.white : const Color(0xFF222222),
          ),
        ),
      ),
    );
  }
}
