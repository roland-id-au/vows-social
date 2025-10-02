class InstagramPost {
  final String id;
  final String postId;
  final String imageUrl;
  final String? caption;
  final int likes;
  final String username;
  final DateTime postedAt;

  InstagramPost({
    required this.id,
    required this.postId,
    required this.imageUrl,
    this.caption,
    required this.likes,
    required this.username,
    required this.postedAt,
  });

  factory InstagramPost.fromJson(Map<String, dynamic> json) {
    return InstagramPost(
      id: json['id'],
      postId: json['post_id'],
      imageUrl: json['image_url'],
      caption: json['caption'],
      likes: json['likes'] ?? 0,
      username: json['username'],
      postedAt: DateTime.parse(json['posted_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'post_id': postId,
      'image_url': imageUrl,
      'caption': caption,
      'likes': likes,
      'username': username,
      'posted_at': postedAt.toIso8601String(),
    };
  }

  String get formattedLikes {
    if (likes >= 1000) {
      return '${(likes / 1000).toStringAsFixed(1)}k';
    }
    return likes.toString();
  }
}
