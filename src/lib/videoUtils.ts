export interface ParsedVideo {
  originalUrl: string;
  platform: 'instagram' | 'youtube' | 'tiktok' | 'facebook' | 'direct' | 'other';
  embedUrl: string;
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:5' | 'auto';
  videoId?: string;
  thumbnailUrl?: string;
  isDirectVideo: boolean;
}

export function parseSocialVideoUrl(rawUrl: string, userRatio: string = 'auto', isMuted: boolean = true): ParsedVideo {
  const url = (rawUrl || '').trim();

  // 1. YouTube Shorts & Standard YouTube
  // Matches: youtube.com/shorts/ID, youtu.be/ID, youtube.com/watch?v=ID, youtube.com/embed/ID
  const ytShortsMatch = url.match(/(?:youtube\.com\/shorts\/|youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytShortsMatch) {
    const videoId = ytShortsMatch[1];
    const isShort = url.includes('/shorts/') || userRatio === '9:16';
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`;
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    
    return {
      originalUrl: url,
      platform: 'youtube',
      embedUrl,
      aspectRatio: userRatio === 'auto' ? (isShort ? '9:16' : '16:9') : (userRatio as any),
      videoId,
      thumbnailUrl,
      isDirectVideo: false
    };
  }

  // 2. Instagram Reels and Posts
  // Matches: instagram.com/reel/CODE, instagram.com/p/CODE, instagram.com/tv/CODE
  const igMatch = url.match(/instagram\.com\/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/);
  if (igMatch) {
    const code = igMatch[1];
    const embedUrl = `https://www.instagram.com/reel/${code}/embed/`;
    return {
      originalUrl: url,
      platform: 'instagram',
      embedUrl,
      aspectRatio: userRatio === 'auto' ? '9:16' : (userRatio as any),
      videoId: code,
      thumbnailUrl: `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800`,
      isDirectVideo: false
    };
  }

  // 3. TikTok
  // Matches: tiktok.com/@username/video/VIDEO_ID
  const tiktokMatch = url.match(/tiktok\.com\/(?:@[\w.-]+\/video\/|v\/|embed\/)(\d+)/);
  if (tiktokMatch) {
    const videoId = tiktokMatch[1];
    return {
      originalUrl: url,
      platform: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
      aspectRatio: userRatio === 'auto' ? '9:16' : (userRatio as any),
      videoId,
      thumbnailUrl: `https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800`,
      isDirectVideo: false
    };
  }

  // 4. Facebook Reel / Video
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true&mute=${isMuted ? 1 : 0}`;
    return {
      originalUrl: url,
      platform: 'facebook',
      embedUrl,
      aspectRatio: userRatio === 'auto' ? '9:16' : (userRatio as any),
      thumbnailUrl: `https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800`,
      isDirectVideo: false
    };
  }

  // 5. Direct Video File (.mp4, .webm, .mov, etc.)
  const isDirect = /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url) || url.startsWith('blob:') || url.includes('storage.googleapis.com') || url.includes('firebasestorage.googleapis.com');
  if (isDirect) {
    return {
      originalUrl: url,
      platform: 'direct',
      embedUrl: url,
      aspectRatio: userRatio === 'auto' ? '9:16' : (userRatio as any),
      thumbnailUrl: `https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=800`,
      isDirectVideo: true
    };
  }

  // 6. Generic fallback
  return {
    originalUrl: url,
    platform: 'other',
    embedUrl: url,
    aspectRatio: userRatio === 'auto' ? '9:16' : (userRatio as any),
    thumbnailUrl: `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800`,
    isDirectVideo: false
  };
}

export const SAMPLE_RESTAURANT_REELS = [
  {
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-serving-dinner-in-a-restaurant-41443-large.mp4',
    caption: '✨ Candlelit garden dining & live acoustic evenings at The Bagichi. Experience royal Rajasthani hospitality under the stars.',
    platform: 'direct',
    aspectRatio: '9:16',
    title: 'Evening Garden Vibes',
    authorHandle: '@thebagichigarden',
    likes: '2.4k'
  },
  {
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-chef-cooking-vegetables-in-a-pan-41441-large.mp4',
    caption: '🔥 Sizzling clay-oven tandoor kebabs & artisanal spices freshly prepared by our Master Chefs. Taste true perfection!',
    platform: 'direct',
    aspectRatio: '9:16',
    title: 'Live Tandoor & Sizzlers',
    authorHandle: '@thebagichigarden',
    likes: '1.8k'
  },
  {
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-a-drink-into-a-glass-with-ice-41440-large.mp4',
    caption: '🍹 Refreshing signature mocktails & artisanal shakes crafted with exotic garden botanicals.',
    platform: 'direct',
    aspectRatio: '9:16',
    title: 'Botanical Mocktails',
    authorHandle: '@thebagichigarden',
    likes: '3.1k'
  },
  {
    url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=800',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-table-filled-with-different-dishes-41445-large.mp4',
    caption: '🌿 The grand royal vegetarian feast! Rich Dal Makhani, Paneer Tikka, buttery Naans, and fragrant Dum Biryani.',
    platform: 'direct',
    aspectRatio: '9:16',
    title: 'Royal Garden Feast',
    authorHandle: '@thebagichigarden',
    likes: '4.5k'
  }
];
