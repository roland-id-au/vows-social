import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:vow_society/models/venue.dart';

class CompareScreen extends StatefulWidget {
  final List<Venue> venues;

  const CompareScreen({
    super.key,
    required this.venues,
  });

  @override
  State<CompareScreen> createState() => _CompareScreenState();
}

class _CompareScreenState extends State<CompareScreen> {
  final PageController _pageController = PageController(viewportFraction: 0.5);
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _pageController.addListener(() {
      setState(() {
        _currentPage = _pageController.page?.round() ?? 0;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Compare (${widget.venues.length})',
          style: const TextStyle(
            color: Colors.black87,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings, color: Colors.black87),
            onPressed: () {
              // Settings for comparison
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Instruction
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.grey[50],
            child: Row(
              children: [
                Icon(Icons.swipe, color: Colors.grey[600], size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Swipe to compare →',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Comparison Table
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  // Image Row
                  _buildImageRow(),

                  // Title Row
                  _buildTitleRow(),

                  _buildDivider(),

                  // Rating Row
                  _buildComparisonRow(
                    'Rating',
                    widget.venues.map((v) {
                      return Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.star, color: Colors.amber, size: 16),
                          const SizedBox(width: 4),
                          Text(
                            '${v.rating.toStringAsFixed(1)} (${v.reviewCount})',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      );
                    }).toList(),
                  ),

                  _buildDivider(),

                  // Price Row
                  _buildComparisonRow(
                    'Price Range',
                    widget.venues.map((v) {
                      return Text(
                        v.priceData.formattedRange,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Colors.green,
                        ),
                        textAlign: TextAlign.center,
                      );
                    }).toList(),
                  ),

                  _buildDivider(),

                  // Capacity Row
                  _buildComparisonRow(
                    'Capacity',
                    widget.venues.map((v) {
                      return Text(
                        '${v.minCapacity}-${v.maxCapacity}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                        textAlign: TextAlign.center,
                      );
                    }).toList(),
                  ),

                  _buildDivider(),

                  // Distance Row
                  _buildComparisonRow(
                    'Distance',
                    widget.venues.map((v) {
                      return Text(
                        v.distance ?? 'N/A',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey[700],
                        ),
                        textAlign: TextAlign.center,
                      );
                    }).toList(),
                  ),

                  _buildDivider(),

                  // Features Row
                  _buildFeaturesRow(),

                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),

          // Bottom Action Button
          _buildBottomAction(),
        ],
      ),
    );
  }

  Widget _buildImageRow() {
    return SizedBox(
      height: 200,
      child: Row(
        children: widget.venues.map((venue) {
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: CachedNetworkImage(
                  imageUrl: venue.imageUrls.isNotEmpty
                      ? venue.imageUrls[0]
                      : 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
                  fit: BoxFit.cover,
                  placeholder: (context, url) => Container(
                    color: Colors.grey[200],
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildTitleRow() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        children: widget.venues.map((venue) {
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Column(
                children: [
                  Text(
                    venue.title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    venue.style.name,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildComparisonRow(String label, List<Widget> values) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Label
          SizedBox(
            width: 80,
            child: Padding(
              padding: const EdgeInsets.only(left: 16),
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
              ),
            ),
          ),
          // Values
          Expanded(
            child: Row(
              children: values.map((value) {
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: value,
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeaturesRow() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Label
          const SizedBox(
            width: 80,
            child: Padding(
              padding: EdgeInsets.only(left: 16),
              child: Text(
                'Features',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
              ),
            ),
          ),
          // Features
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: widget.venues.map((venue) {
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: venue.amenities.take(4).map((amenity) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.check,
                                color: Colors.green,
                                size: 14,
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  amenity,
                                  style: const TextStyle(fontSize: 11),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDivider() {
    return Container(
      height: 1,
      color: Colors.grey[200],
      margin: const EdgeInsets.symmetric(horizontal: 16),
    );
  }

  Widget _buildBottomAction() {
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
        child: SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () {
              // Contact all venues
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.pink[400],
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.phone, size: 20),
                SizedBox(width: 8),
                Text(
                  'CONTACT ALL VENUES',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }
}
