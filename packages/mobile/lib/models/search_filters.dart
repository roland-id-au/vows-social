import 'package:vow_society/models/venue.dart';
import 'package:vow_society/models/venue_tag.dart';

class SearchFilters {
  final String? location;
  final String? locality;
  final String? region;
  final String? country;
  final DateTime? weddingDate;
  final int? guestCount;
  final int? minPrice;
  final int? maxPrice;
  final int? minCapacity;
  final int? maxCapacity;
  final List<VenueStyle> styles;
  final List<VenueTag> tags;
  final double? maxDistance; // in kilometers
  final bool? waterfront;
  final bool? parking;
  final bool? indoorOutdoor;
  final bool? accommodation;
  final bool? byoAlcohol;

  SearchFilters({
    this.location,
    this.locality,
    this.region,
    this.country = 'Australia',
    this.weddingDate,
    this.guestCount,
    this.minPrice,
    this.maxPrice,
    this.minCapacity,
    this.maxCapacity,
    this.styles = const [],
    this.tags = const [],
    this.maxDistance,
    this.waterfront,
    this.parking,
    this.indoorOutdoor,
    this.accommodation,
    this.byoAlcohol,
  });

  SearchFilters copyWith({
    String? location,
    String? locality,
    String? region,
    String? country,
    DateTime? weddingDate,
    int? guestCount,
    int? minPrice,
    int? maxPrice,
    int? minCapacity,
    int? maxCapacity,
    List<VenueStyle>? styles,
    List<VenueTag>? tags,
    double? maxDistance,
    bool? waterfront,
    bool? parking,
    bool? indoorOutdoor,
    bool? accommodation,
    bool? byoAlcohol,
  }) {
    return SearchFilters(
      location: location ?? this.location,
      locality: locality ?? this.locality,
      region: region ?? this.region,
      country: country ?? this.country,
      weddingDate: weddingDate ?? this.weddingDate,
      guestCount: guestCount ?? this.guestCount,
      minPrice: minPrice ?? this.minPrice,
      maxPrice: maxPrice ?? this.maxPrice,
      minCapacity: minCapacity ?? this.minCapacity,
      maxCapacity: maxCapacity ?? this.maxCapacity,
      styles: styles ?? this.styles,
      tags: tags ?? this.tags,
      maxDistance: maxDistance ?? this.maxDistance,
      waterfront: waterfront ?? this.waterfront,
      parking: parking ?? this.parking,
      indoorOutdoor: indoorOutdoor ?? this.indoorOutdoor,
      accommodation: accommodation ?? this.accommodation,
      byoAlcohol: byoAlcohol ?? this.byoAlcohol,
    );
  }

  bool get hasActiveFilters {
    return (minPrice != null ||
        maxPrice != null ||
        styles.isNotEmpty ||
        tags.isNotEmpty ||
        maxDistance != null ||
        waterfront == true ||
        parking == true ||
        indoorOutdoor == true ||
        accommodation == true ||
        byoAlcohol == true);
  }

  int get activeFilterCount {
    int count = 0;
    if (minPrice != null || maxPrice != null) count++;
    if (styles.isNotEmpty) count++;
    if (tags.isNotEmpty) count++;
    if (maxDistance != null) count++;
    if (waterfront == true) count++;
    if (parking == true) count++;
    if (indoorOutdoor == true) count++;
    if (accommodation == true) count++;
    if (byoAlcohol == true) count++;
    return count;
  }

  SearchFilters clear() {
    return SearchFilters(
      location: location,
      weddingDate: weddingDate,
      guestCount: guestCount,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'location': location,
      'locality': locality,
      'region': region,
      'country': country,
      'wedding_date': weddingDate?.toIso8601String(),
      'guest_count': guestCount,
      'min_price': minPrice,
      'max_price': maxPrice,
      'min_capacity': minCapacity,
      'max_capacity': maxCapacity,
      'styles': styles.map((s) => s.name).toList(),
      'tags': tags.map((t) => t.toJson()).toList(),
      'max_distance': maxDistance,
      'waterfront': waterfront,
      'parking': parking,
      'indoor_outdoor': indoorOutdoor,
      'accommodation': accommodation,
      'byo_alcohol': byoAlcohol,
    };
  }
}
