import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';

class CuratedCollections extends StatelessWidget {
  const CuratedCollections({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildCollection('Trending', _buildTrendingItems()),
        const SizedBox(height: 24),
        _buildCollection('Featured Photographers', _buildFeaturedPhotographers()),
      ],
    );
  }

  Widget _buildCollection(String title, Widget content) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF222222),
                  letterSpacing: -0.5,
                ),
              ),
              TextButton(
                onPressed: () {
                  // Show all
                },
                child: Row(
                  children: [
                    Text(
                      'See all',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey[700],
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.arrow_forward,
                      size: 16,
                      color: Colors.grey[700],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        SizedBox(
          height: 480,
          child: content,
        ),
      ],
    );
  }

  Widget _buildTrendingItems() {
    final listings = [
      Listing(
        name: 'The Grounds of Alexandria',
        location: 'Sydney, NSW',
        price: '\$150/guest',
        imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
      ),
      Listing(
        name: 'Beta Events',
        location: 'Sydney, NSW',
        price: '\$200/guest',
        imageUrl: 'https://images.unsplash.com/photo-152354223604-9a4254b91668?w=800',
      ),
      Listing(
        name: 'The Boathouse Palm Beach',
        location: 'Sydney, NSW',
        price: '\$180/guest',
        imageUrl: 'https://images.unsplash.com/photo-1522036841237-a5b55cf442ce?w=800',
      ),
    ];

    return AnimationLimiter(
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: listings.length,
        itemBuilder: (context, index) {
          return AnimationConfiguration.staggeredList(
            position: index,
            duration: const Duration(milliseconds: 375),
            child: SlideAnimation(
              horizontalOffset: 50.0,
              child: FadeInAnimation(
                child: Padding(
                  padding: EdgeInsets.only(right: index == listings.length - 1 ? 0 : 16),
                  child: ListingCard(listing: listings[index]),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildFeaturedPhotographers() {
    final listings = [
      Listing(
        name: 'Samantha Jade Photography',
        location: 'Sydney, NSW',
        price: 'From \$3000',
        imageUrl: 'https://images.unsplash.com/photo-1519241923390-cf5392f71427?w=800',
      ),
      Listing(
        name: 'Daniel Griffiths Photo',
        location: 'Melbourne, VIC',
        price: 'From \$4500',
        imageUrl: 'https://images.unsplash.com/photo-1602636898941-881151f7a225?w=800',
      ),
      Listing(
        name: 'Love & Other',
        location: 'Byron Bay, NSW',
        price: 'From \$4000',
        imageUrl: 'https://images.unsplash.com/photo-1515934751635-481d6b6a5603?w=800',
      ),
    ];

    return AnimationLimiter(
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: listings.length,
        itemBuilder: (context, index) {
          return AnimationConfiguration.staggeredList(
            position: index,
            duration: const Duration(milliseconds: 375),
            child: SlideAnimation(
              horizontalOffset: 50.0,
              child: FadeInAnimation(
                child: Padding(
                  padding: EdgeInsets.only(right: index == listings.length - 1 ? 0 : 16),
                  child: ListingCard(listing: listings[index]),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class Listing {
  final String name;
  final String location;
  final String price;
  final String imageUrl;

  Listing({
    required this.name,
    required this.location,
    required this.price,
    required this.imageUrl,
  });
}

class ListingCard extends StatelessWidget {
  final Listing listing;

  const ListingCard({Key? key, required this.listing}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        // Navigator.pushNamed(context, '/listing-detail');
      },
      child: Container(
        width: 340,
        height: 460,
        margin: const EdgeInsets.only(right: 4),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.15),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Stack(
            fit: StackFit.expand,
            children: [
            // Full card image
            CachedNetworkImage(
              imageUrl: listing.imageUrl,
              fit: BoxFit.cover,
              placeholder: (context, url) => Container(
                color: Colors.grey[200],
                child: Center(
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      Colors.grey[400]!,
                    ),
                  ),
                ),
              ),
              errorWidget: (context, url, error) => Container(
                color: Colors.grey[200],
                child: const Icon(Icons.error, color: Colors.grey),
              ),
            ),

            // Gradient overlay for text readability
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                height: 200,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withOpacity(0.7),
                    ],
                  ),
                ),
              ),
            ),

            // Text overlay at bottom
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      listing.name,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: -0.5,
                        height: 1.2,
                        shadows: [
                          Shadow(
                            color: Colors.black45,
                            blurRadius: 8,
                          ),
                        ],
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          Icons.location_on,
                          color: Colors.white.withOpacity(0.9),
                          size: 16,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            listing.location,
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.white.withOpacity(0.9),
                              fontWeight: FontWeight.w500,
                              shadows: const [
                                Shadow(
                                  color: Colors.black45,
                                  blurRadius: 4,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFFF6B9D), Color(0xFFC04277)],
                        ),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFFF6B9D).withOpacity(0.4),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Text(
                        listing.price,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            ],
          ),
        ),
      ),
    );
  }
}
