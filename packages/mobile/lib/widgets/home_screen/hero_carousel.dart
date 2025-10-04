import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'dart:async';

class HeroCarousel extends StatefulWidget {
  const HeroCarousel({Key? key}) : super(key: key);

  @override
  State<HeroCarousel> createState() => _HeroCarouselState();
}

class _HeroCarouselState extends State<HeroCarousel> {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  Timer? _timer;

  final List<Map<String, String>> _heroImages = [
    {
      'image': 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200',
      'title': 'Stunning Garden Venues',
      'subtitle': 'Perfect for intimate ceremonies',
    },
    {
      'image': 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200',
      'title': 'Waterfront Celebrations',
      'subtitle': 'Say "I do" by the water',
    },
    {
      'image': 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=1200',
      'title': 'Elegant Ballrooms',
      'subtitle': 'Timeless sophistication',
    },
    {
      'image': 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200',
      'title': 'Rustic Barn Weddings',
      'subtitle': 'Countryside charm',
    },
  ];

  @override
  void initState() {
    super.initState();
    _startAutoplay();
  }

  void _startAutoplay() {
    _timer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (_currentPage < _heroImages.length - 1) {
        _currentPage++;
      } else {
        _currentPage = 0;
      }

      if (_pageController.hasClients) {
        _pageController.animateToPage(
          _currentPage,
          duration: const Duration(milliseconds: 600),
          curve: Curves.easeInOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 480,
      child: Stack(
        children: [
          // Carousel
          PageView.builder(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() => _currentPage = index);
            },
            itemCount: _heroImages.length,
            itemBuilder: (context, index) {
              return _buildHeroSlide(_heroImages[index]);
            },
          ),

          // Gradient overlay
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

          // Text overlay
          Positioned(
            bottom: 80,
            left: 24,
            right: 24,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _heroImages[_currentPage]['title']!,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -1,
                    height: 1.2,
                    shadows: [
                      Shadow(
                        color: Colors.black45,
                        blurRadius: 8,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _heroImages[_currentPage]['subtitle']!,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.5,
                    shadows: [
                      Shadow(
                        color: Colors.black45,
                        blurRadius: 4,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Page indicators
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                _heroImages.length,
                (index) => Container(
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: _currentPage == index ? 24 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: _currentPage == index
                        ? Colors.white
                        : Colors.white.withOpacity(0.4),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroSlide(Map<String, String> slide) {
    return CachedNetworkImage(
      imageUrl: slide['image']!,
      fit: BoxFit.cover,
      placeholder: (context, url) => Container(
        color: Colors.grey[300],
      ),
      errorWidget: (context, url, error) => Container(
        color: Colors.grey[300],
        child: const Icon(Icons.error, color: Colors.grey),
      ),
    );
  }
}
