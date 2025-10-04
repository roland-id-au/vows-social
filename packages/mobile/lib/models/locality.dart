/// Model for predefined localities/suburbs for geographic filtering
class Locality {
  final String id;
  final String name;
  final String city;
  final String state;
  final String? region;
  final String country;
  final double? latitude;
  final double? longitude;
  final bool isPopular;
  final int venueCount;

  Locality({
    required this.id,
    required this.name,
    required this.city,
    required this.state,
    this.region,
    this.country = 'Australia',
    this.latitude,
    this.longitude,
    this.isPopular = false,
    this.venueCount = 0,
  });

  String get displayName {
    if (region != null && region!.isNotEmpty) {
      return '$name, $region';
    }
    return '$name, $city';
  }

  String get fullName {
    return '$name, $city, $state';
  }

  factory Locality.fromJson(Map<String, dynamic> json) {
    return Locality(
      id: json['id'],
      name: json['name'],
      city: json['city'],
      state: json['state'],
      region: json['region'],
      country: json['country'] ?? 'Australia',
      latitude: json['latitude']?.toDouble(),
      longitude: json['longitude']?.toDouble(),
      isPopular: json['is_popular'] ?? false,
      venueCount: json['venue_count'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'city': city,
      'state': state,
      'region': region,
      'country': country,
      'latitude': latitude,
      'longitude': longitude,
      'is_popular': isPopular,
      'venue_count': venueCount,
    };
  }
}

/// Popular localities grouped by city
class PopularLocalities {
  static const sydney = [
    'Mosman',
    'Manly',
    'Palm Beach',
    'The Rocks',
    'Darling Harbour',
    'Circular Quay',
  ];

  static const melbourne = [
    'St Kilda',
    'South Yarra',
    'Brighton',
  ];

  static const brisbane = [
    'South Bank',
    'New Farm',
  ];

  static const perth = [
    'Kings Park',
    'Fremantle',
  ];

  static const regions = [
    'Hunter Valley',
    'Southern Highlands',
    'Blue Mountains',
    'Yarra Valley',
    'Mornington Peninsula',
    'Dandenong Ranges',
    'Gold Coast Hinterland',
    'Sunshine Coast Hinterland',
    'Swan Valley',
    'Margaret River',
    'Adelaide Hills',
    'Barossa Valley',
    'Byron Bay',
  ];
}
