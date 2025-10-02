import 'package:flutter/material.dart';

class CuratedCollections extends StatelessWidget {
  const CuratedCollections({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildCollection('Trending this week', _buildTrendingVenues()),
        const SizedBox(height: 24),
        _buildCollection('Unique outdoor venues', _buildUniqueVenues()),
      ],
    );
  }

  Widget _buildCollection(String title, Widget content) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0),
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Color(0xFF222222),
            ),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 300,
          child: content,
        ),
      ],
    );
  }

  Widget _buildTrendingVenues() {
    final venues = [
      Venue(
        name: 'The Grounds of Alexandria',
        location: 'Sydney, NSW',
        price: '$150/guest',
        imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
      ),
      Venue(
        name: 'Beta Events',
        location: 'Sydney, NSW',
        price: '$200/guest',
        imageUrl: 'https://images.unsplash.com/photo-152354223604-9a4254b91668?w=800',
      ),
      Venue(
        name: 'The Boathouse Palm Beach',
        location: 'Sydney, NSW',
        price: '$180/guest',
        imageUrl: 'https://images.unsplash.com/photo-1522036841237-a5b55cf442ce?w=800',
      ),
    ];

    return ListView.builder(
      scrollDirection: Axis.horizontal,
      itemCount: venues.length,
      itemBuilder: (context, index) {
        return Padding(
          padding: EdgeInsets.only(left: 16, right: index == venues.length - 1 ? 16 : 0),
          child: VenueCard(venue: venues[index]),
        );
      },
    );
  }

  Widget _buildUniqueVenues() {
    final venues = [
      Venue(
        name: 'Taronga Zoo',
        location: 'Sydney, NSW',
        price: '$250/guest',
        imageUrl: 'https://images.unsplash.com/photo-1560114928-40f1f1eb26a0?w=800',
      ),
      Venue(
        name: 'Sydney Opera House',
        location: 'Sydney, NSW',
        price: '$500/guest',
        imageUrl: 'https://images.unsplash.com/photo-1549180085-0e373b487a13?w=800',
      ),
      Venue(
        name: 'Luna Park',
        location: 'Sydney, NSW',
        price: '$220/guest',
        imageUrl: 'https://images.unsplash.com/photo-1599576421058-8a7457a78652?w=800',
      ),
    ];

    return ListView.builder(
      scrollDirection: Axis.horizontal,
      itemCount: venues.length,
      itemBuilder: (context, index) {
        return Padding(
          padding: EdgeInsets.only(left: 16, right: index == venues.length - 1 ? 16 : 0),
          child: VenueCard(venue: venues[index]),
        );
      },
    );
  }
}

class Venue {
  final String name;
  final String location;
  final String price;
  final String imageUrl;

  Venue({
    required this.name,
    required this.location,
    required this.price,
    required this.imageUrl,
  });
}

class VenueCard extends StatelessWidget {
  final Venue venue;

  const VenueCard({Key? key, required this.venue}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 280,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 200,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(15),
              image: DecorationImage(
                image: NetworkImage(venue.imageUrl),
                fit: BoxFit.cover,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            venue.name,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF222222),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            venue.location,
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF666666),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            venue.price,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Color(0xFF222222),
            ),
          ),
        ],
      ),
    );
  }
}
