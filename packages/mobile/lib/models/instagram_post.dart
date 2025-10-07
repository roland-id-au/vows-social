// Aligned with web version InstagramPost interface
class InstagramPost {
  final String id;
  final String instagramMediaId;
  final String instagramAccountId;
  final String? instagramAccountUsername;
  final String mediaType;
  final String? mediaUrl;
  final String? thumbnailUrl;
  final String permalink;
  final String? caption;
  final DateTime postedAt;
  final List<String>? hashtags;
  final List<String>? mentions;
  final String? locationName;
  final int? likeCount;
  final int? commentCount;
  final double? engagementRate;
  final bool? isWeddingRelated;
  final List<String>? weddingType;
  final List<String>? detectedThemes;
  final List<String>? detectedVendors;
  final String? city;
  final String? state;
  final String? country;
  final String? discoveredVia;

  InstagramPost({
    required this.id,
    required this.instagramMediaId,
    required this.instagramAccountId,
    this.instagramAccountUsername,
    required this.mediaType,
    this.mediaUrl,
    this.thumbnailUrl,
    required this.permalink,
    this.caption,
    required this.postedAt,
    this.hashtags,
    this.mentions,
    this.locationName,
    this.likeCount,
    this.commentCount,
    this.engagementRate,
    this.isWeddingRelated,
    this.weddingType,
    this.detectedThemes,
    this.detectedVendors,
    this.city,
    this.state,
    this.country,
    this.discoveredVia,
  });

  factory InstagramPost.fromJson(Map<String, dynamic> json) {
    return InstagramPost(
      id: json['id'],
      instagramMediaId: json['instagram_media_id'] ?? json['post_id'] ?? '',
      instagramAccountId: json['instagram_account_id'] ?? '',
      instagramAccountUsername: json['instagram_account_username'] ?? json['username'],
      mediaType: json['media_type'] ?? 'IMAGE',
      mediaUrl: json['media_url'] ?? json['image_url'],
      thumbnailUrl: json['thumbnail_url'],
      permalink: json['permalink'] ?? '',
      caption: json['caption'],
      postedAt: json['posted_at'] != null
          ? DateTime.parse(json['posted_at'])
          : DateTime.now(),
      hashtags: json['hashtags'] != null
          ? List<String>.from(json['hashtags'])
          : null,
      mentions: json['mentions'] != null
          ? List<String>.from(json['mentions'])
          : null,
      locationName: json['location_name'],
      likeCount: json['like_count'] ?? json['likes'],
      commentCount: json['comment_count'],
      engagementRate: json['engagement_rate']?.toDouble(),
      isWeddingRelated: json['is_wedding_related'],
      weddingType: json['wedding_type'] != null
          ? List<String>.from(json['wedding_type'])
          : null,
      detectedThemes: json['detected_themes'] != null
          ? List<String>.from(json['detected_themes'])
          : null,
      detectedVendors: json['detected_vendors'] != null
          ? List<String>.from(json['detected_vendors'])
          : null,
      city: json['city'],
      state: json['state'],
      country: json['country'],
      discoveredVia: json['discovered_via'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'instagram_media_id': instagramMediaId,
      'instagram_account_id': instagramAccountId,
      'instagram_account_username': instagramAccountUsername,
      'media_type': mediaType,
      'media_url': mediaUrl,
      'thumbnail_url': thumbnailUrl,
      'permalink': permalink,
      'caption': caption,
      'posted_at': postedAt.toIso8601String(),
      'hashtags': hashtags,
      'mentions': mentions,
      'location_name': locationName,
      'like_count': likeCount,
      'comment_count': commentCount,
      'engagement_rate': engagementRate,
      'is_wedding_related': isWeddingRelated,
      'wedding_type': weddingType,
      'detected_themes': detectedThemes,
      'detected_vendors': detectedVendors,
      'city': city,
      'state': state,
      'country': country,
      'discovered_via': discoveredVia,
    };
  }

  String get formattedLikes {
    final count = likeCount ?? 0;
    if (count >= 1000000) {
      return '${(count / 1000000).toStringAsFixed(1)}M';
    }
    if (count >= 1000) {
      return '${(count / 1000).toStringAsFixed(1)}K';
    }
    return count.toString();
  }
}
