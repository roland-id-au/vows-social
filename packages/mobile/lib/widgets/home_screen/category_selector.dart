import 'package:flutter/material.dart';

class CategorySelector extends StatefulWidget {
  const CategorySelector({Key? key}) : super(key: key);

  @override
  State<CategorySelector> createState() => _CategorySelectorState();
}

class _CategorySelectorState extends State<CategorySelector> {
  int _selectedIndex = 0;

  final categories = const [
    {'name': 'Venues', 'icon': Icons.location_city_outlined},
    {'name': 'Photographers', 'icon': Icons.camera_alt_outlined},
    {'name': 'Caterers', 'icon': Icons.restaurant_menu_outlined},
    {'name': 'Florists', 'icon': Icons.local_florist_outlined},
    {'name': 'DJs', 'icon': Icons.music_note_outlined},
    {'name': 'Planners', 'icon': Icons.event_outlined},
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 42,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 8),
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final category = categories[index];
          final isSelected = _selectedIndex == index;

          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6.0),
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _selectedIndex = index;
                });
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFF222222) : Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: isSelected ? const Color(0xFF222222) : Colors.grey.withOpacity(0.3),
                    width: 1,
                  ),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : [],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      category['icon'] as IconData,
                      size: 18,
                      color: isSelected ? Colors.white : const Color(0xFF666666),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      category['name'] as String,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: isSelected ? Colors.white : const Color(0xFF666666),
                        letterSpacing: -0.2,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
