import 'package:vow_society/models/venue_tag.dart';
import 'package:vow_society/models/location_data.dart';
import 'package:vow_society/models/instagram_post.dart';

class Venue {
  final String id;
  final String title;
  final String description;
  final VenueCategory category;
  final List<VenueTag> tags;
  final LocationData location;
  final PriceData priceData;
  final int minCapacity;
  final int maxCapacity;
  final double rating;
  final int reviewCount;
  final List<String> imageUrls;
  final List<String> amenities;
  final VenueStyle style;
  final List<PackageOption> packages;
  final List<InstagramPost> instagramPosts;
  final bool isFavorite;
  final String? distance;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Venue({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.tags,
    required this.location,
    required this.priceData,
    required this.minCapacity,
    required this.maxCapacity,
    required this.rating,
    required this.reviewCount,
    required this.imageUrls,
    required this.amenities,
    required this.style,
    this.packages = const [],
    this.instagramPosts = const [],
    this.isFavorite = false,
    this.distance,
    this.createdAt,
    this.updatedAt,
  });

  Venue copyWith({
    String? id,
    String? title,
    String? description,
    VenueCategory? category,
    List<VenueTag>? tags,
    LocationData? location,
    PriceData? priceData,
    int? minCapacity,
    int? maxCapacity,
    double? rating,
    int? reviewCount,
    List<String>? imageUrls,
    List<String>? amenities,
    VenueStyle? style,
    List<PackageOption>? packages,
    List<InstagramPost>? instagramPosts,
    bool? isFavorite,
    String? distance,
  }) {
    return Venue(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      category: category ?? this.category,
      tags: tags ?? this.tags,
      location: location ?? this.location,
      priceData: priceData ?? this.priceData,
      minCapacity: minCapacity ?? this.minCapacity,
      maxCapacity: maxCapacity ?? this.maxCapacity,
      rating: rating ?? this.rating,
      reviewCount: reviewCount ?? this.reviewCount,
      imageUrls: imageUrls ?? this.imageUrls,
      amenities: amenities ?? this.amenities,
      style: style ?? this.style,
      packages: packages ?? this.packages,
      instagramPosts: instagramPosts ?? this.instagramPosts,
      isFavorite: isFavorite ?? this.isFavorite,
      distance: distance ?? this.distance,
    );
  }

  factory Venue.fromJson(Map<String, dynamic> json) {
    return Venue(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      category: VenueCategory.values.firstWhere(
        (e) => e.name == json['category'],
        orElse: () => VenueCategory.venue,
      ),
      tags: (json['tags'] as List?)
              ?.map((tag) => VenueTag.fromJson(tag))
              .toList() ??
          [],
      location: LocationData.fromJson(json['location_data']),
      priceData: PriceData.fromJson(json['price_data']),
      minCapacity: json['min_capacity'] ?? 0,
      maxCapacity: json['max_capacity'] ?? 0,
      rating: (json['rating'] ?? 0.0).toDouble(),
      reviewCount: json['review_count'] ?? 0,
      imageUrls: List<String>.from(json['image_urls'] ?? []),
      amenities: List<String>.from(json['amenities'] ?? []),
      style: VenueStyle.values.firstWhere(
        (e) => e.name == json['style'],
        orElse: () => VenueStyle.modern,
      ),
      packages: (json['packages'] as List?)
              ?.map((pkg) => PackageOption.fromJson(pkg))
              .toList() ??
          [],
      instagramPosts: (json['instagram_posts'] as List?)
              ?.map((post) => InstagramPost.fromJson(post))
              .toList() ??
          [],
      isFavorite: json['is_favorite'] ?? false,
      distance: json['distance'],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'category': category.name,
      'tags': tags.map((tag) => tag.toJson()).toList(),
      'location_data': location.toJson(),
      'price_data': priceData.toJson(),
      'min_capacity': minCapacity,
      'max_capacity': maxCapacity,
      'rating': rating,
      'review_count': reviewCount,
      'image_urls': imageUrls,
      'amenities': amenities,
      'style': style.name,
      'packages': packages.map((pkg) => pkg.toJson()).toList(),
      'instagram_posts': instagramPosts.map((post) => post.toJson()).toList(),
      'is_favorite': isFavorite,
      'distance': distance,
    };
  }
}

enum VenueCategory {
  venue,
  catering,
  experience,
}

enum VenueStyle {
  modern,
  rustic,
  beachfront,
  garden,
  industrial,
  vineyard,
  ballroom,
  barn,
  estate,
}

class PriceData {
  final int minPrice;
  final int maxPrice;
  final String currency;
  final String priceUnit;

  PriceData({
    required this.minPrice,
    required this.maxPrice,
    this.currency = 'AUD',
    this.priceUnit = 'per event',
  });

  factory PriceData.fromJson(Map<String, dynamic> json) {
    return PriceData(
      minPrice: json['min_price'],
      maxPrice: json['max_price'],
      currency: json['currency'] ?? 'AUD',
      priceUnit: json['price_unit'] ?? 'per event',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'min_price': minPrice,
      'max_price': maxPrice,
      'currency': currency,
      'price_unit': priceUnit,
    };
  }

  String get formattedRange {
    return '\$${_formatPrice(minPrice)} - \$${_formatPrice(maxPrice)}';
  }

  String get formattedMin {
    return '\$${_formatPrice(minPrice)}';
  }

  String _formatPrice(int price) {
    if (price >= 1000) {
      return '${(price / 1000).toStringAsFixed(price % 1000 == 0 ? 0 : 1)}k';
    }
    return price.toString();
  }
}

class PackageOption {
  final String id;
  final String name;
  final int price;
  final String description;
  final List<String> inclusions;

  PackageOption({
    required this.id,
    required this.name,
    required this.price,
    required this.description,
    required this.inclusions,
  });

  factory PackageOption.fromJson(Map<String, dynamic> json) {
    return PackageOption(
      id: json['id'],
      name: json['name'],
      price: json['price'],
      description: json['description'],
      inclusions: List<String>.from(json['inclusions'] ?? []),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'description': description,
      'inclusions': inclusions,
    };
  }
}
