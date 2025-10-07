import 'package:flutter/material.dart';

class CategoryPills extends StatelessWidget {
  final String? selectedCategory;
  final Function(String?) onCategorySelected;

  const CategoryPills({
    super.key,
    this.selectedCategory,
    required this.onCategorySelected,
  });

  // Category mapping - aligned with web version
  static const categories = [
    {'id': null, 'label': 'All'},
    {'id': 'venue', 'label': 'Venues'},
    {'id': 'caterer', 'label': 'Catering'},
    {'id': 'photographer', 'label': 'Photography'},
    {'id': 'florist', 'label': 'Florals'},
    {'id': 'videographer', 'label': 'Videography'},
    {'id': 'musician', 'label': 'Music'},
    {'id': 'stylist', 'label': 'Styling'},
    {'id': 'planner', 'label': 'Planning'},
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.95),
        border: Border(
          bottom: BorderSide(
            color: Colors.grey.shade200,
            width: 1,
          ),
        ),
      ),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        itemCount: categories.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final category = categories[index];
          final categoryId = category['id'] as String?;
          final label = category['label'] as String;
          final isSelected = selectedCategory == categoryId;

          return _CategoryPill(
            label: label,
            isSelected: isSelected,
            onTap: () => onCategorySelected(categoryId),
          );
        },
      ),
    );
  }
}

class _CategoryPill extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _CategoryPill({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? Colors.black : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? Colors.black : Colors.transparent,
            width: 1,
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: isSelected ? Colors.white : Colors.grey.shade700,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                ),
          ),
        ),
      ),
    );
  }
}
