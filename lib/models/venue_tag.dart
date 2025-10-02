class VenueTag {
  final String id;
  final String name;
  final TagCategory category;
  final String? icon;

  VenueTag({
    required this.id,
    required this.name,
    required this.category,
    this.icon,
  });

  factory VenueTag.fromJson(Map<String, dynamic> json) {
    return VenueTag(
      id: json['id'],
      name: json['name'],
      category: TagCategory.values.firstWhere(
        (e) => e.name == json['category'],
        orElse: () => TagCategory.other,
      ),
      icon: json['icon'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category.name,
      'icon': icon,
    };
  }
}

enum TagCategory {
  style, // Modern, Rustic, Beachfront, Garden, etc.
  scenery, // Ocean view, Mountain view, City skyline, etc.
  experience, // Photography, Entertainment, Transport, etc.
  amenity, // Parking, Accommodation, Kitchen, etc.
  feature, // Indoor/Outdoor, Getting ready room, Dance floor, etc.
  dietary, // Vegan, Halal, Gluten-free, etc.
  other,
}

// Pre-defined tags for common use
class CommonTags {
  static final List<VenueTag> stylesTags = [
    VenueTag(id: 'modern', name: 'Modern', category: TagCategory.style, icon: '🏛'),
    VenueTag(id: 'rustic', name: 'Rustic', category: TagCategory.style, icon: '🏚'),
    VenueTag(id: 'beachfront', name: 'Beachfront', category: TagCategory.style, icon: '🏖'),
    VenueTag(id: 'garden', name: 'Garden', category: TagCategory.style, icon: '🌳'),
    VenueTag(id: 'vineyard', name: 'Vineyard', category: TagCategory.style, icon: '🍇'),
    VenueTag(id: 'industrial', name: 'Industrial', category: TagCategory.style, icon: '🏭'),
    VenueTag(id: 'ballroom', name: 'Ballroom', category: TagCategory.style, icon: '💃'),
    VenueTag(id: 'barn', name: 'Barn', category: TagCategory.style, icon: '🚜'),
  ];

  static final List<VenueTag> sceneryTags = [
    VenueTag(id: 'ocean_view', name: 'Ocean View', category: TagCategory.scenery, icon: '🌊'),
    VenueTag(id: 'mountain_view', name: 'Mountain View', category: TagCategory.scenery, icon: '⛰'),
    VenueTag(id: 'city_skyline', name: 'City Skyline', category: TagCategory.scenery, icon: '🏙'),
    VenueTag(id: 'countryside', name: 'Countryside', category: TagCategory.scenery, icon: '🌾'),
    VenueTag(id: 'waterfront', name: 'Waterfront', category: TagCategory.scenery, icon: '⚓'),
    VenueTag(id: 'sunset_view', name: 'Sunset View', category: TagCategory.scenery, icon: '🌅'),
  ];

  static final List<VenueTag> experienceTags = [
    VenueTag(id: 'photography', name: 'Photography', category: TagCategory.experience, icon: '📸'),
    VenueTag(id: 'entertainment', name: 'Entertainment', category: TagCategory.experience, icon: '🎵'),
    VenueTag(id: 'transport', name: 'Transport', category: TagCategory.experience, icon: '🚗'),
    VenueTag(id: 'spa', name: 'Spa Services', category: TagCategory.experience, icon: '💆'),
    VenueTag(id: 'activities', name: 'Activities', category: TagCategory.experience, icon: '🎯'),
  ];

  static final List<VenueTag> amenityTags = [
    VenueTag(id: 'parking', name: 'Parking', category: TagCategory.amenity, icon: '🅿️'),
    VenueTag(id: 'accommodation', name: 'Accommodation', category: TagCategory.amenity, icon: '🛏'),
    VenueTag(id: 'kitchen', name: 'Kitchen Facilities', category: TagCategory.amenity, icon: '👨‍🍳'),
    VenueTag(id: 'wifi', name: 'WiFi', category: TagCategory.amenity, icon: '📶'),
    VenueTag(id: 'accessibility', name: 'Wheelchair Accessible', category: TagCategory.amenity, icon: '♿'),
  ];

  static final List<VenueTag> featureTags = [
    VenueTag(id: 'indoor_outdoor', name: 'Indoor/Outdoor', category: TagCategory.feature),
    VenueTag(id: 'getting_ready_room', name: 'Getting Ready Room', category: TagCategory.feature),
    VenueTag(id: 'dance_floor', name: 'Dance Floor', category: TagCategory.feature),
    VenueTag(id: 'ceremony_reception', name: 'Ceremony & Reception', category: TagCategory.feature),
    VenueTag(id: 'byo_alcohol', name: 'BYO Alcohol', category: TagCategory.feature),
    VenueTag(id: 'inhouse_catering', name: 'In-house Catering', category: TagCategory.feature),
  ];

  static List<VenueTag> get allTags => [
        ...stylesTags,
        ...sceneryTags,
        ...experienceTags,
        ...amenityTags,
        ...featureTags,
      ];
}
