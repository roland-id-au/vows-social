import 'package:flutter/material.dart';

class CategorySelector extends StatelessWidget {
  const CategorySelector({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final categories = {
      'Unique stays': Icons.star_border,
      'Outdoor': Icons.park_outlined,
      'Wineries': Icons.wine_bar_outlined,
      'On the water': Icons.sailing_outlined,
      'Castles': Icons.fort_outlined,
    };

    return SizedBox(
      height: 80,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final category = categories.entries.elementAt(index);
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12.0),
            child: Column(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(15),
                    border: Border.all(color: Colors.grey.withOpacity(0.3)),
                  ),
                  child: Icon(category.value, color: const Color(0xFF444444)),
                ),
                const SizedBox(height: 8),
                Text(
                  category.key,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF555555),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
