import 'package:flutter/material.dart';
import 'package:vow_society/models/search_filters.dart';
import 'package:vow_society/models/venue.dart';
import 'package:vow_society/models/venue_tag.dart';

class FilterScreen extends StatefulWidget {
  final SearchFilters initialFilters;

  const FilterScreen({
    super.key,
    required this.initialFilters,
  });

  @override
  State<FilterScreen> createState() => _FilterScreenState();
}

class _FilterScreenState extends State<FilterScreen> {
  late SearchFilters _filters;
  double _minPrice = 5000;
  double _maxPrice = 30000;
  double _minCapacity = 50;
  double _maxCapacity = 300;

  @override
  void initState() {
    super.initState();
    _filters = widget.initialFilters;
    _minPrice = (_filters.minPrice ?? 5000).toDouble();
    _maxPrice = (_filters.maxPrice ?? 30000).toDouble();
    _minCapacity = (_filters.minCapacity ?? 50).toDouble();
    _maxCapacity = (_filters.maxCapacity ?? 300).toDouble();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Filter Results',
          style: TextStyle(
            color: Colors.black87,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: false,
      ),
      body: Column(
        children: [
          // Scrollable Filters
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildVenueStyleSection(),
                  const SizedBox(height: 24),
                  _buildDivider(),
                  const SizedBox(height: 24),
                  _buildScenerySection(),
                  const SizedBox(height: 24),
                  _buildDivider(),
                  const SizedBox(height: 24),
                  _buildExperienceSection(),
                  const SizedBox(height: 24),
                  _buildDivider(),
                  const SizedBox(height: 24),
                  _buildPriceRangeSection(),
                  const SizedBox(height: 24),
                  _buildDivider(),
                  const SizedBox(height: 24),
                  _buildCapacitySection(),
                  const SizedBox(height: 24),
                  _buildDivider(),
                  const SizedBox(height: 24),
                  _buildDistanceSection(),
                  const SizedBox(height: 24),
                  _buildDivider(),
                  const SizedBox(height: 24),
                  _buildMustHavesSection(),
                  const SizedBox(height: 100), // Space for bottom buttons
                ],
              ),
            ),
          ),

          // Bottom Buttons
          _buildBottomButtons(context),
        ],
      ),
    );
  }

  Widget _buildVenueStyleSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Venue Style',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: CommonTags.stylesTags.map((tag) {
            final isSelected = _filters.tags.any((t) => t.id == tag.id);
            return _buildStyleChip(
              tag.icon ?? '',
              tag.name,
              isSelected,
              () {
                setState(() {
                  if (isSelected) {
                    _filters = _filters.copyWith(
                      tags: _filters.tags.where((t) => t.id != tag.id).toList(),
                    );
                  } else {
                    _filters = _filters.copyWith(
                      tags: [..._filters.tags, tag],
                    );
                  }
                });
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildScenerySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Scenery',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: CommonTags.sceneryTags.map((tag) {
            final isSelected = _filters.tags.any((t) => t.id == tag.id);
            return _buildTagChip(
              tag.name,
              tag.icon ?? '',
              isSelected,
              () {
                setState(() {
                  if (isSelected) {
                    _filters = _filters.copyWith(
                      tags: _filters.tags.where((t) => t.id != tag.id).toList(),
                    );
                  } else {
                    _filters = _filters.copyWith(
                      tags: [..._filters.tags, tag],
                    );
                  }
                });
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildExperienceSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Experiences',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: CommonTags.experienceTags.map((tag) {
            final isSelected = _filters.tags.any((t) => t.id == tag.id);
            return _buildTagChip(
              tag.name,
              tag.icon ?? '',
              isSelected,
              () {
                setState(() {
                  if (isSelected) {
                    _filters = _filters.copyWith(
                      tags: _filters.tags.where((t) => t.id != tag.id).toList(),
                    );
                  } else {
                    _filters = _filters.copyWith(
                      tags: [..._filters.tags, tag],
                    );
                  }
                });
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildPriceRangeSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Price Range',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 16),
        RangeSlider(
          values: RangeValues(_minPrice, _maxPrice),
          min: 5000,
          max: 30000,
          divisions: 50,
          activeColor: Colors.pink[400],
          labels: RangeLabels(
            '\$${(_minPrice / 1000).toStringAsFixed(0)}k',
            '\$${(_maxPrice / 1000).toStringAsFixed(0)}k',
          ),
          onChanged: (values) {
            setState(() {
              _minPrice = values.start;
              _maxPrice = values.end;
            });
          },
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '\$${(_minPrice / 1000).toStringAsFixed(1)}k',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
            Text(
              '\$${(_maxPrice / 1000).toStringAsFixed(1)}k',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildCapacitySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Guest Capacity',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 16),
        RangeSlider(
          values: RangeValues(_minCapacity, _maxCapacity),
          min: 50,
          max: 300,
          divisions: 50,
          activeColor: Colors.pink[400],
          labels: RangeLabels(
            '${_minCapacity.toInt()}',
            '${_maxCapacity.toInt()}',
          ),
          onChanged: (values) {
            setState(() {
              _minCapacity = values.start;
              _maxCapacity = values.end;
            });
          },
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '${_minCapacity.toInt()} guests',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
            Text(
              '${_maxCapacity.toInt()} guests',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildDistanceSection() {
    final maxDistance = _filters.maxDistance ?? 50;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Distance',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            Text(
              '${maxDistance.toInt()} km',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.pink[400],
              ),
            ),
          ],
        ),
        Slider(
          value: maxDistance,
          min: 5,
          max: 100,
          divisions: 19,
          activeColor: Colors.pink[400],
          label: '${maxDistance.toInt()} km',
          onChanged: (value) {
            setState(() {
              _filters = _filters.copyWith(maxDistance: value);
            });
          },
        ),
      ],
    );
  }

  Widget _buildMustHavesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Must-haves',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 16),
        _buildCheckboxTile(
          'Waterfront / Beach view',
          _filters.waterfront ?? false,
          (value) {
            setState(() {
              _filters = _filters.copyWith(waterfront: value);
            });
          },
        ),
        _buildCheckboxTile(
          'Parking available',
          _filters.parking ?? false,
          (value) {
            setState(() {
              _filters = _filters.copyWith(parking: value);
            });
          },
        ),
        _buildCheckboxTile(
          'Indoor + Outdoor space',
          _filters.indoorOutdoor ?? false,
          (value) {
            setState(() {
              _filters = _filters.copyWith(indoorOutdoor: value);
            });
          },
        ),
        _buildCheckboxTile(
          'Accommodation on-site',
          _filters.accommodation ?? false,
          (value) {
            setState(() {
              _filters = _filters.copyWith(accommodation: value);
            });
          },
        ),
        _buildCheckboxTile(
          'BYO alcohol allowed',
          _filters.byoAlcohol ?? false,
          (value) {
            setState(() {
              _filters = _filters.copyWith(byoAlcohol: value);
            });
          },
        ),
      ],
    );
  }

  Widget _buildStyleChip(
    String icon,
    String label,
    bool isSelected,
    VoidCallback onTap,
  ) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 70,
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? Colors.pink[50] : Colors.grey[100],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? Colors.pink[400]! : Colors.transparent,
            width: 2,
          ),
        ),
        child: Column(
          children: [
            Text(
              icon,
              style: const TextStyle(fontSize: 24),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: isSelected ? Colors.pink[700] : Colors.grey[700],
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTagChip(
    String label,
    String icon,
    bool isSelected,
    VoidCallback onTap,
  ) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? Colors.pink[50] : Colors.grey[100],
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? Colors.pink[400]! : Colors.transparent,
            width: 2,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon.isNotEmpty) ...[
              Text(icon, style: const TextStyle(fontSize: 16)),
              const SizedBox(width: 6),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isSelected ? Colors.pink[700] : Colors.grey[700],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCheckboxTile(
    String title,
    bool value,
    ValueChanged<bool> onChanged,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () => onChanged(!value),
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              SizedBox(
                width: 24,
                height: 24,
                child: Checkbox(
                  value: value,
                  onChanged: (newValue) => onChanged(newValue ?? false),
                  activeColor: Colors.pink[400],
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    color: Colors.black87,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDivider() {
    return Container(
      height: 1,
      color: Colors.grey[200],
    );
  }

  Widget _buildBottomButtons(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            // Clear All Button
            Expanded(
              child: OutlinedButton(
                onPressed: () {
                  setState(() {
                    _filters = _filters.clear();
                    _minPrice = 5000;
                    _maxPrice = 30000;
                    _minCapacity = 50;
                    _maxCapacity = 300;
                  });
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.black87,
                  side: BorderSide(color: Colors.grey[300]!),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'CLEAR ALL',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Show Results Button
            Expanded(
              flex: 2,
              child: ElevatedButton(
                onPressed: () {
                  _filters = _filters.copyWith(
                    minPrice: _minPrice.toInt(),
                    maxPrice: _maxPrice.toInt(),
                    minCapacity: _minCapacity.toInt(),
                    maxCapacity: _maxCapacity.toInt(),
                  );
                  Navigator.pop(context, _filters);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.black87,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'SHOW VENUES',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
