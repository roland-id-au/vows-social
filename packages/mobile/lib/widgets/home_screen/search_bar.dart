import 'package:flutter/material.dart';

class TappableSearchBar extends StatefulWidget {
  const TappableSearchBar({Key? key}) : super(key: key);

  @override
  State<TappableSearchBar> createState() => _TappableSearchBarState();
}

class _TappableSearchBarState extends State<TappableSearchBar> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      onTap: () {
        // Navigate to search screen
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(50),
          border: Border.all(
            color: Colors.grey.withOpacity(0.15),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(_isPressed ? 0.2 : 0.1),
              spreadRadius: 0,
              blurRadius: _isPressed ? 16 : 24,
              offset: Offset(0, _isPressed ? 4 : 8),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFFFF6B9D), Color(0xFFC04277)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.search,
                color: Colors.white,
                size: 22,
              ),
            ),
            const SizedBox(width: 18),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Find your dream venue',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF222222),
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    'Location • Style • Budget • Services',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[600],
                      fontWeight: FontWeight.w500,
                      letterSpacing: 0.2,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(22),
              ),
              child: Icon(
                Icons.tune,
                color: Colors.grey[700],
                size: 20,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
