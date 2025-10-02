import 'package:flutter/material.dart';
import 'package:vow_society/widgets/home_screen/category_selector.dart';
import 'package:vow_society/widgets/home_screen/curated_collections.dart';
import 'package:vow_society/widgets/home_screen/header.dart';
import 'package:vow_society/widgets/home_screen/search_bar.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFFF7F7F7),
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(height: 16),
                    Header(),
                    SizedBox(height: 24),
                    TappableSearchBar(),
                    SizedBox(height: 24),
                    CategorySelector(),
                    SizedBox(height: 32),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: CuratedCollections(),
            ),
          ],
        ),
      ),
    );
  }
}