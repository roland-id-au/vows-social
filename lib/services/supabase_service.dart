import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:vow_society/models/venue.dart';
import 'package:vow_society/models/search_filters.dart';

class SupabaseService {
  static final SupabaseService _instance = SupabaseService._internal();
  factory SupabaseService() => _instance;
  SupabaseService._internal();

  final SupabaseClient _client = Supabase.instance.client;

  // Initialize Supabase
  static Future<void> initialize({
    required String url,
    required String anonKey,
  }) async {
    await Supabase.initialize(
      url: url,
      anonKey: anonKey,
    );
  }

  // Venue Operations
  Future<List<Venue>> searchVenues(SearchFilters filters) async {
    try {
      var query = _client.from('listings').select('''
        *,
        listing_media(*),
        instagram_posts(*)
      ''');

      // Apply filters
      if (filters.locality != null) {
        query = query.eq('locality', filters.locality!);
      } else if (filters.region != null) {
        query = query.eq('region', filters.region!);
      } else if (filters.location != null) {
        // Use PostGIS for location-based search
        // This is a simplified version - actual implementation would use ST_Distance
        query = query.ilike('location_data->>city', '%${filters.location}%');
      }

      if (filters.country != null) {
        query = query.eq('country', filters.country!);
      }

      if (filters.minPrice != null) {
        query = query.gte('price_data->>min_price', filters.minPrice!);
      }

      if (filters.maxPrice != null) {
        query = query.lte('price_data->>max_price', filters.maxPrice!);
      }

      if (filters.minCapacity != null) {
        query = query.gte('max_capacity', filters.minCapacity!);
      }

      if (filters.maxCapacity != null) {
        query = query.lte('min_capacity', filters.maxCapacity!);
      }

      if (filters.styles.isNotEmpty) {
        final styles = filters.styles.map((s) => s.name).toList();
        query = query.in('style', styles);
      }

      final response = await query;

      return (response as List)
          .map((json) => Venue.fromJson(json))
          .toList();
    } catch (e) {
      print('Error searching venues: $e');
      return [];
    }
  }

  Future<Venue?> getVenueById(String id) async {
    try {
      final response = await _client
          .from('listings')
          .select('''
            *,
            listing_media(*),
            instagram_posts(*),
            reviews(*)
          ''')
          .eq('id', id)
          .single();

      return Venue.fromJson(response);
    } catch (e) {
      print('Error fetching venue: $e');
      return null;
    }
  }

  Future<List<Venue>> getTrendingVenues({int limit = 10}) async {
    try {
      final response = await _client
          .from('listings')
          .select('''
            *,
            listing_media(*)
          ''')
          .order('created_at', ascending: false)
          .limit(limit);

      return (response as List)
          .map((json) => Venue.fromJson(json))
          .toList();
    } catch (e) {
      print('Error fetching trending venues: $e');
      return [];
    }
  }

  // Favorites Operations
  Future<List<Venue>> getFavorites(String userId) async {
    try {
      final response = await _client
          .from('favorites')
          .select('''
            listing_id,
            listings(
              *,
              listing_media(*)
            )
          ''')
          .eq('user_id', userId);

      return (response as List)
          .map((item) => Venue.fromJson(item['listings']))
          .toList();
    } catch (e) {
      print('Error fetching favorites: $e');
      return [];
    }
  }

  Future<void> addToFavorites(String userId, String listingId) async {
    try {
      await _client.from('favorites').insert({
        'user_id': userId,
        'listing_id': listingId,
        'created_at': DateTime.now().toIso8601String(),
      });
    } catch (e) {
      print('Error adding to favorites: $e');
    }
  }

  Future<void> removeFromFavorites(String userId, String listingId) async {
    try {
      await _client
          .from('favorites')
          .delete()
          .match({'user_id': userId, 'listing_id': listingId});
    } catch (e) {
      print('Error removing from favorites: $e');
    }
  }

  // Inquiry Operations
  Future<void> createInquiry({
    required String userId,
    required String listingId,
    required String message,
  }) async {
    try {
      await _client.from('inquiries').insert({
        'user_id': userId,
        'listing_id': listingId,
        'message': message,
        'status': 'pending',
        'created_at': DateTime.now().toIso8601String(),
      });
    } catch (e) {
      print('Error creating inquiry: $e');
    }
  }

  // User Profile Operations
  Future<Map<String, dynamic>?> getUserProfile(String userId) async {
    try {
      final response = await _client
          .from('users')
          .select()
          .eq('id', userId)
          .single();

      return response;
    } catch (e) {
      print('Error fetching user profile: $e');
      return null;
    }
  }

  Future<void> updateUserProfile(String userId, Map<String, dynamic> data) async {
    try {
      await _client
          .from('users')
          .update(data)
          .eq('id', userId);
    } catch (e) {
      print('Error updating user profile: $e');
    }
  }

  // Analytics
  Future<void> trackEvent({
    required String userId,
    required String eventType,
    required Map<String, dynamic> data,
  }) async {
    try {
      await _client.from('events').insert({
        'user_id': userId,
        'event_type': eventType,
        'data': data,
        'created_at': DateTime.now().toIso8601String(),
      });
    } catch (e) {
      print('Error tracking event: $e');
    }
  }
}
