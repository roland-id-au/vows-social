import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

class ListingDetailScreen extends StatefulWidget {
  const ListingDetailScreen({Key? key}) : super(key: key);

  @override
  State<ListingDetailScreen> createState() => _ListingDetailScreenState();
}

class _ListingDetailScreenState extends State<ListingDetailScreen> {
  final PageController _pageController = PageController();
  int _currentImageIndex = 0;

  // Demo data - replace with actual data from API
  final List<String> _images = [
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200',
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200',
    'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=1200',
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200',
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // Main content
          CustomScrollView(
            slivers: [
              // Hero image gallery
              _buildImageGallery(),

              // Content
              SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 24),

                    // Title and location
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'The Grounds of Alexandria',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF222222),
                              letterSpacing: -0.8,
                              height: 1.2,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Icon(
                                Icons.location_on,
                                color: Colors.grey[600],
                                size: 20,
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  'Alexandria, Sydney NSW',
                                  style: TextStyle(
                                    fontSize: 16,
                                    color: Colors.grey[700],
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              _buildInfoChip(Icons.people, '50-150 guests'),
                              const SizedBox(width: 12),
                              _buildInfoChip(Icons.park, 'Outdoor'),
                              const SizedBox(width: 12),
                              _buildInfoChip(Icons.restaurant, 'Catering'),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 32),
                    const Divider(),
                    const SizedBox(height: 32),

                    // Description
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'About this venue',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'A stunning garden venue in the heart of Alexandria. Perfect for intimate ceremonies and grand celebrations alike. Features beautiful outdoor spaces, award-winning dining, and exceptional service.',
                            style: TextStyle(
                              fontSize: 16,
                              height: 1.6,
                              color: Colors.grey[700],
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 32),
                    const Divider(),
                    const SizedBox(height: 32),

                    // Pricing packages
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Packages & pricing',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 20),
                          _buildPackageCard(
                            'Intimate Package',
                            '\$150 per guest',
                            '50-80 guests • 5-hour event • Premium catering',
                          ),
                          const SizedBox(height: 16),
                          _buildPackageCard(
                            'Classic Package',
                            '\$180 per guest',
                            '80-120 guests • 6-hour event • Full service',
                          ),
                          const SizedBox(height: 16),
                          _buildPackageCard(
                            'Premium Package',
                            '\$220 per guest',
                            '120-150 guests • 8-hour event • All inclusive',
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 32),
                    const Divider(),
                    const SizedBox(height: 32),

                    // Amenities
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Amenities',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 20),
                          Wrap(
                            spacing: 12,
                            runSpacing: 12,
                            children: [
                              _buildAmenityChip('Parking', Icons.local_parking),
                              _buildAmenityChip('Wheelchair Access', Icons.accessible),
                              _buildAmenityChip('Sound System', Icons.volume_up),
                              _buildAmenityChip('Dance Floor', Icons.music_note),
                              _buildAmenityChip('Bar Service', Icons.local_bar),
                              _buildAmenityChip('Outdoor Space', Icons.park),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 120), // Space for sticky button
                  ],
                ),
              ),
            ],
          ),

          // Floating back button
          Positioned(
            top: MediaQuery.of(context).padding.top + 16,
            left: 20,
            child: GestureDetector(
              onTap: () => Navigator.pop(context),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.95),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.15),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.arrow_back,
                  color: Color(0xFF222222),
                  size: 24,
                ),
              ),
            ),
          ),

          // Sticky contact button at bottom
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 20,
                bottom: MediaQuery.of(context).padding.bottom + 20,
              ),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 20,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'From \$150/guest',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          '3 packages available',
                          style: TextStyle(
                            fontSize: 12,
                            color: Color(0xFF666666),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  ElevatedButton(
                    onPressed: () {
                      // Contact venue
                      _showContactOptions(context);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF222222),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 32,
                        vertical: 16,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(30),
                      ),
                      elevation: 0,
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.phone, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Contact',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
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
    );
  }

  Widget _buildImageGallery() {
    return SliverToBoxAdapter(
      child: SizedBox(
        height: 450,
        child: Stack(
          children: [
            PageView.builder(
              controller: _pageController,
              onPageChanged: (index) {
                setState(() => _currentImageIndex = index);
              },
              itemCount: _images.length,
              itemBuilder: (context, index) {
                return CachedNetworkImage(
                  imageUrl: _images[index],
                  fit: BoxFit.cover,
                  placeholder: (context, url) => Container(
                    color: Colors.grey[200],
                  ),
                  errorWidget: (context, url, error) => Container(
                    color: Colors.grey[200],
                    child: const Icon(Icons.error),
                  ),
                );
              },
            ),

            // Gradient overlay
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                height: 100,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withOpacity(0.3),
                    ],
                  ),
                ),
              ),
            ),

            // Image counter
            Positioned(
              bottom: 20,
              right: 20,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.7),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${_currentImageIndex + 1}/${_images.length}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.withOpacity(0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: Colors.grey[700]),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.grey[800],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPackageCard(String title, String price, String description) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFFF5F7), Color(0xFFFFF0F5)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFF6B9D).withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF222222),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFF6B9D), Color(0xFFC04277)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  price,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            description,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[700],
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAmenityChip(String label, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18, color: Colors.grey[700]),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: Colors.grey[800],
            ),
          ),
        ],
      ),
    );
  }

  void _showContactOptions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(24),
            topRight: Radius.circular(24),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              margin: const EdgeInsets.only(bottom: 24),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Text(
              'Contact The Grounds of Alexandria',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 24),
            _buildContactOption(
              Icons.phone,
              'Call venue',
              '(02) 9699 2225',
              () {
                // Handle phone call
              },
            ),
            const SizedBox(height: 12),
            _buildContactOption(
              Icons.email,
              'Send email',
              'events@thegrounds.com.au',
              () {
                // Handle email
              },
            ),
            const SizedBox(height: 12),
            _buildContactOption(
              Icons.language,
              'Visit website',
              'thegrounds.com.au',
              () {
                // Handle website
              },
            ),
            SizedBox(height: MediaQuery.of(context).padding.bottom + 16),
          ],
        ),
      ),
    );
  }

  Widget _buildContactOption(
    IconData icon,
    String title,
    String subtitle,
    VoidCallback onTap,
  ) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey[50],
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFF6B9D), Color(0xFFC04277)],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: Colors.white, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF222222),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios, size: 18, color: Colors.grey[400]),
          ],
        ),
      ),
    );
  }
}
