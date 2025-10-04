import 'package:flutter/material.dart';

class Header extends StatelessWidget {
  const Header({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Welcome back, Blake',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF222222),
                  letterSpacing: -0.5,
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Let\'s find your dream venue',
                style: TextStyle(
                  fontSize: 15,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w400,
                  letterSpacing: -0.2,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 16),
        GestureDetector(
          onTap: () {
            // Navigate to profile
          },
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: Colors.grey.withOpacity(0.2),
                width: 2,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(22),
              child: Image.network(
                'https://avatars.githubusercontent.com/u/14283333?v=4',
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    color: Colors.grey[300],
                    child: const Icon(Icons.person, color: Colors.white),
                  );
                },
              ),
            ),
          ),
        ),
      ],
    );
  }
}
