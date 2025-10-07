import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:vow_society/screens/home_screen.dart';
import 'package:vow_society/screens/search_results_screen.dart';
import 'package:vow_society/screens/venue_detail_screen.dart';
import 'package:vow_society/screens/map_view_screen.dart';
import 'package:vow_society/screens/favorites_screen.dart';
import 'package:vow_society/screens/compare_screen.dart';
import 'package:vow_society/screens/filter_screen.dart';
import 'package:vow_society/models/venue.dart';
import 'package:vow_society/models/search_filters.dart';
import 'package:vow_society/services/supabase_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase
  await SupabaseService.initialize(
    url: 'https://nidbhgqeyhrudtnizaya.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w',
  );

  runApp(
    const ProviderScope(
      child: VowSocietyApp(),
    ),
  );
}

class VowSocietyApp extends StatelessWidget {
  const VowSocietyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'The Vow Society',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.black,
          primary: Colors.black,
          secondary: Colors.grey.shade600,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        textTheme: GoogleFonts.interTextTheme().copyWith(
          // Yeseva One for branding elements
          displayLarge: GoogleFonts.yesevaOne(
            fontSize: 48,
            fontWeight: FontWeight.w400,
            color: Colors.black87,
          ),
          displayMedium: GoogleFonts.yesevaOne(
            fontSize: 36,
            fontWeight: FontWeight.w400,
            color: Colors.black87,
          ),
          displaySmall: GoogleFonts.yesevaOne(
            fontSize: 28,
            fontWeight: FontWeight.w400,
            color: Colors.black87,
          ),
          // Inter for body text
          bodyLarge: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w400,
          ),
          bodyMedium: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w400,
          ),
          bodySmall: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w400,
          ),
          titleLarge: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
          titleMedium: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
          titleSmall: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        scaffoldBackgroundColor: Colors.white,
        appBarTheme: AppBarTheme(
          backgroundColor: Colors.white.withOpacity(0.8),
          elevation: 0,
          scrolledUnderElevation: 0,
          iconTheme: const IconThemeData(color: Colors.black87),
          titleTextStyle: GoogleFonts.inter(
            color: Colors.black87,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.black,
            foregroundColor: Colors.white,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
            ),
            textStyle: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Colors.black, width: 2),
          ),
          filled: true,
          fillColor: Colors.grey[50],
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      ),
      routerConfig: _router,
    );
  }
}

// Router configuration
final _router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      name: 'home',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/search-results',
      name: 'search-results',
      builder: (context, state) {
        final filters = state.extra as SearchFilters?;
        return SearchResultsScreen(
          filters: filters ?? SearchFilters(),
        );
      },
    ),
    GoRoute(
      path: '/venue-detail/:id',
      name: 'venue-detail',
      builder: (context, state) {
        final venue = state.extra as Venue;
        return VenueDetailScreen(venue: venue);
      },
    ),
    GoRoute(
      path: '/map-view',
      name: 'map-view',
      builder: (context, state) {
        final data = state.extra as Map<String, dynamic>?;
        final venues = data?['venues'] as List<Venue>? ?? [];
        final filters = data?['filters'] as SearchFilters?;
        return MapViewScreen(
          venues: venues,
          filters: filters,
        );
      },
    ),
    GoRoute(
      path: '/favorites',
      name: 'favorites',
      builder: (context, state) => const FavoritesScreen(),
    ),
    GoRoute(
      path: '/compare',
      name: 'compare',
      builder: (context, state) {
        final venues = state.extra as List<Venue>;
        return CompareScreen(venues: venues);
      },
    ),
    GoRoute(
      path: '/filter',
      name: 'filter',
      builder: (context, state) {
        final filters = state.extra as SearchFilters;
        return FilterScreen(initialFilters: filters);
      },
    ),
  ],
);
