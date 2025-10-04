class LocationData {
  final String address;
  final String? locality;
  final String city;
  final String state;
  final String? region;
  final String postcode;
  final String country;
  final double latitude;
  final double longitude;

  LocationData({
    required this.address,
    this.locality,
    required this.city,
    required this.state,
    this.region,
    required this.postcode,
    this.country = 'Australia',
    required this.latitude,
    required this.longitude,
  });

  String get fullAddress {
    return '$address, $city $state $postcode';
  }

  String get shortAddress {
    if (locality != null) {
      return '$locality, $city';
    }
    return '$city, $state';
  }

  String get detailedAddress {
    final parts = <String>[];
    if (locality != null) parts.add(locality!);
    parts.add(city);
    if (region != null) parts.add(region!);
    parts.add(state);
    return parts.join(', ');
  }

  factory LocationData.fromJson(Map<String, dynamic> json) {
    return LocationData(
      address: json['address'],
      locality: json['locality'],
      city: json['city'],
      state: json['state'],
      region: json['region'],
      postcode: json['postcode'],
      country: json['country'] ?? 'Australia',
      latitude: json['latitude'].toDouble(),
      longitude: json['longitude'].toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'address': address,
      'locality': locality,
      'city': city,
      'state': state,
      'region': region,
      'postcode': postcode,
      'country': country,
      'latitude': latitude,
      'longitude': longitude,
    };
  }
}
