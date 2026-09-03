import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  increment, 
  addDoc, 
  serverTimestamp,
  where 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Heart, 
  MessageCircle, 
  Maximize2, 
  X, 
  ArrowLeft,
  Pin,
  Send,
  Camera,
  Film,
  Eye,
  CheckCircle2,
  Tv,
  Grid
} from 'lucide-react';
import { parseSocialVideoUrl, SAMPLE_RESTAURANT_REELS } from '../lib/videoUtils';
import { SocialReel, ReelComment } from '../types';

export default function FeaturedReels() {
  const [reels, setReels] = useState<SocialReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false); // Voice enabled by default
  const [progress, setProgress] = useState(0);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'cinema' | 'grid'>('cinema');
  const [fullscreenReel, setFullscreenReel] = useState<SocialReel | null>(null);
  
  // Comments Drawer States
  const [activeCommentsReelId, setActiveCommentsReelId] = useState<string | null>(null);
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [newCommentAuthor, setNewCommentAuthor] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fullscreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const duration = 8000; // 8 seconds per reel for auto-advance
  const intervalStep = 50;

  // Viewport Intersection Observer: Pause video immediately when scrolled away
  const [isInViewport, setIsInViewport] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
        setIsInViewport(isVisible);
        if (!isVisible) {
          if (videoRef.current) {
            videoRef.current.pause();
          }
        } else {
          if (isPlaying && videoRef.current) {
            videoRef.current.play().catch(() => {
              // Autoplay might need user interaction if unmuted
            });
          }
        }
      },
      { threshold: [0, 0.2, 0.35, 0.5, 0.8] }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isPlaying]);

  // Fetch Reels from Firestore with fallback to sample restaurant reels
  useEffect(() => {
    const q = query(collection(db, 'featuredReels'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const fetched: SocialReel[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            const parsed = parseSocialVideoUrl(data.url || data.videoUrl || '', data.aspectRatio);
            return {
              id: docSnap.id,
              url: data.url || data.videoUrl || '',
              caption: data.caption || '',
              platform: data.platform || parsed.platform,
              aspectRatio: data.aspectRatio || parsed.aspectRatio,
              title: data.title || 'Bagichi Garden Moments',
              likes: typeof data.likes === 'number' ? data.likes : (parseInt(data.likes) || 0),
              views: typeof data.views === 'number' ? data.views : (parseInt(data.views) || 0),
              likedUsers: Array.isArray(data.likedUsers) ? data.likedUsers : [],
              viewedUsers: Array.isArray(data.viewedUsers) ? data.viewedUsers : [],
              authorHandle: data.authorHandle || '@thebagichigarden',
              thumbnailUrl: data.thumbnailUrl || parsed.thumbnailUrl,
              videoUrl: data.videoUrl || (parsed.isDirectVideo ? parsed.embedUrl : undefined),
              createdAt: data.createdAt,
            };
          });
          setReels(fetched);
        } else {
          // Use high quality sample restaurant reels
          const defaultItems: SocialReel[] = SAMPLE_RESTAURANT_REELS.map((item, idx) => ({
            id: `sample-${idx}`,
            url: item.videoUrl || item.url,
            videoUrl: item.videoUrl,
            caption: item.caption,
            platform: item.platform as any,
            aspectRatio: item.aspectRatio as any,
            title: item.title,
            likes: parseFloat(item.likes) * 1000 || 120,
            views: 450,
            authorHandle: item.authorHandle,
            thumbnailUrl: item.url,
          }));
          setReels(defaultItems);
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Firestore featuredReels snapshot error, using samples:', error);
        const defaultItems: SocialReel[] = SAMPLE_RESTAURANT_REELS.map((item, idx) => ({
          id: `sample-${idx}`,
          url: item.videoUrl || item.url,
          videoUrl: item.videoUrl,
          caption: item.caption,
          platform: item.platform as any,
          aspectRatio: item.aspectRatio as any,
          title: item.title,
          likes: 240,
          views: 650,
          authorHandle: item.authorHandle,
          thumbnailUrl: item.url,
        }));
        setReels(defaultItems);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch comments for active reel
  useEffect(() => {
    if (!activeCommentsReelId) return;

    const q = query(
      collection(db, 'reelComments'),
      where('reelId', '==', activeCommentsReelId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ReelComment[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as ReelComment));

      // Sort: Pinned comments first, then newest
      list.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });

      setComments(list);
    });

    return () => unsubscribe();
  }, [activeCommentsReelId]);

  // Video playback auto-sync
  useEffect(() => {
    if (!videoRef.current) return;
    if (isInViewport && isPlaying) {
      videoRef.current.play().catch(() => {
        // In case browser requires unmuted interaction
      });
    } else {
      videoRef.current.pause();
    }
  }, [currentIndex, isPlaying, isInViewport]);

  // Auto Advance Progress Timer (only when in viewport)
  useEffect(() => {
    if (!isPlaying || !isInViewport || reels.length <= 1 || fullscreenReel !== null) {
      return;
    }

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentIndex((curr) => (curr + 1) % reels.length);
          return 0;
        }
        return prev + (intervalStep / duration) * 100;
      });
    }, intervalStep);

    return () => clearInterval(timer);
  }, [isPlaying, isInViewport, reels.length, currentIndex, fullscreenReel]);

  const handleSelectReel = (index: number) => {
    setCurrentIndex(index);
    setProgress(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (isPlaying && isInViewport) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % reels.length);
    setProgress(0);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + reels.length) % reels.length);
    setProgress(0);
  };

  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (videoRef.current) {
      if (nextState) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (videoRef.current) {
      videoRef.current.muted = nextMute;
    }
    if (fullscreenVideoRef.current) {
      fullscreenVideoRef.current.muted = nextMute;
    }
  };

  const toggleLike = async (id: string) => {
    const isLiked = likedMap[id];
    setLikedMap((prev) => ({ ...prev, [id]: !isLiked }));
    try {
      await updateDoc(doc(db, 'featuredReels', id), {
        likes: increment(isLiked ? -1 : 1)
      });
    } catch (err) {
      console.error('Failed to update likes', err);
    }
  };

  // Record view count when looked at for more than 2 seconds in viewport
  useEffect(() => {
    if (reels.length === 0 || !isInViewport) return;
    const currentReel = reels[currentIndex];
    if (!currentReel || currentReel.id.startsWith('sample-')) return;

    const timer = setTimeout(async () => {
      const viewedKey = `viewed_${currentReel.id}`;
      if (!sessionStorage.getItem(viewedKey)) {
        sessionStorage.setItem(viewedKey, 'true');
        try {
          await updateDoc(doc(db, 'featuredReels', currentReel.id), {
            views: increment(1)
          });
        } catch (e) {
          console.error('Failed to update views', e);
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentIndex, reels, isInViewport]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommentsReelId || !newCommentAuthor.trim() || !newCommentText.trim()) return;

    setIsPostingComment(true);
    try {
      await addDoc(collection(db, 'reelComments'), {
        reelId: activeCommentsReelId,
        authorName: newCommentAuthor.trim(),
        text: newCommentText.trim(),
        createdAt: serverTimestamp(),
        isPinned: false,
        adminLiked: false,
        likes: 0
      });

      setCommentSuccess(true);
      setNewCommentText('');
      setTimeout(() => setCommentSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsPostingComment(false);
    }
  };

  if (loading) {
    return (
      <section className="w-full max-w-7xl mx-auto px-6 py-20">
        <div className="h-96 rounded-3xl bg-[#120f0d] border border-white/5 relative overflow-hidden flex items-center justify-center isolate">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent z-10"
          />
          <Film className="w-8 h-8 text-[#e8a33d]/20 relative z-20" />
        </div>
      </section>
    );
  }

  if (reels.length === 0) return null;

  const currentReel = reels[currentIndex] || reels[0];
  const parsedCurrent = parseSocialVideoUrl(currentReel.videoUrl || currentReel.url, currentReel.aspectRatio, isMuted);

  const formatCount = (count?: number | string) => {
    if (typeof count === 'number') {
      if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
      if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
      return count.toString();
    }
    return count || '0';
  };

  return (
    <section 
      id="social-reels" 
      ref={containerRef}
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-24 relative z-10"
    >
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e8a33d]/10 border border-[#e8a33d]/20 text-[#e8a33d] text-xs font-bold uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Social Media Spotlight
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif text-white tracking-tight">
            Vibes & <span className="text-[#e8a33d]">Moments</span>
          </h2>
          <p className="text-white/60 text-sm sm:text-base max-w-xl mt-2 leading-[2.2]">
            Immerse yourself in our live garden ambience, sizzling tandoor kitchens, and royal dining stories.
          </p>
        </div>

        {/* View Toggle & Auto-play status */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className={`inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all border ${
              isPlaying
                ? 'bg-[#e8a33d]/15 text-[#e8a33d] border-[#e8a33d]/30 hover:bg-[#e8a33d]/25'
                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
            }`}
            title={isPlaying ? 'Pause Story Player' : 'Resume Story Player'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 text-[#e8a33d] fill-current" />
            )}
          </button>

          <div className="flex items-center p-1 rounded-xl bg-[#120f0d] border border-white/10">
            <button
              onClick={() => setViewMode('cinema')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'cinema' ? 'bg-[#e8a33d] text-black font-bold' : 'text-white/60 hover:text-white'
              }`}
              title="Stories & Cinema Player"
            >
              <Tv className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-[#e8a33d] text-black font-bold' : 'text-white/60 hover:text-white'
              }`}
              title="Reels Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* -------------------- CINEMA / STORIES PLAYER MODE -------------------- */}
      {viewMode === 'cinema' ? (
        <div className="space-y-8">
          
          {/* Main Showcase Stage */}
          <div className="relative rounded-3xl overflow-hidden bg-[#120f0d] border border-[#e8a33d]/20 shadow-2xl p-4 sm:p-8">
            
            {/* Top Segmented Story Progress Bars */}
            <div className="flex items-center gap-1.5 mb-6 z-20 relative">
              {reels.map((_, idx) => {
                let barWidth = '0%';
                if (idx < currentIndex) barWidth = '100%';
                else if (idx === currentIndex) barWidth = `${progress}%`;

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectReel(idx)}
                    className="flex-1 h-1.5 rounded-full bg-white/15 overflow-hidden transition-all hover:h-2.5 focus:outline-none"
                    title={`Go to Reel ${idx + 1}`}
                  >
                    <div
                      className="h-full bg-[#e8a33d] transition-all duration-75 ease-linear rounded-full"
                      style={{ width: barWidth }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Video Stage Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Vertical 9:16 Adaptive Reel Frame */}
              <div className="lg:col-span-6 xl:col-span-5 flex justify-center">
                <div className="relative w-full max-w-[340px] sm:max-w-[380px] aspect-[9/16] rounded-3xl overflow-hidden bg-black border border-white/15 shadow-2xl shadow-black/80 group">
                  
                  {/* Background Ambient Blur Layer */}
                  <div
                    className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-40 scale-125 pointer-events-none"
                    style={{
                      backgroundImage: `url(${currentReel.thumbnailUrl || parsedCurrent.thumbnailUrl})`,
                    }}
                  />

                  {/* Video Renderer */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentReel.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.35 }}
                      className="w-full h-full relative z-10 flex items-center justify-center overflow-hidden"
                    >
                      {parsedCurrent.isDirectVideo || currentReel.videoUrl ? (
                        <video
                          ref={videoRef}
                          key={currentReel.videoUrl || currentReel.url}
                          src={currentReel.videoUrl || currentReel.url}
                          autoPlay={isPlaying && isInViewport}
                          playsInline
                          loop
                          muted={isMuted}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={togglePlay}
                          poster={currentReel.thumbnailUrl}
                        />
                      ) : parsedCurrent.platform === 'youtube' ? (
                        <iframe
                          src={parsedCurrent.embedUrl}
                          title={currentReel.title || "Social Reel"}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full object-cover border-0 pointer-events-none scale-[1.35]"
                        />
                      ) : parsedCurrent.platform === 'instagram' ? (
                        <div className="w-full h-full relative flex items-center justify-center bg-black/80">
                          <iframe
                            src={parsedCurrent.embedUrl}
                            title="Instagram Reel"
                            className="w-full h-full border-0 scale-100"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full relative flex flex-col items-center justify-center p-6 text-center bg-black/70">
                          <img
                            src={currentReel.thumbnailUrl || parsedCurrent.thumbnailUrl}
                            alt={currentReel.title}
                            className="absolute inset-0 w-full h-full object-cover opacity-60"
                          />
                          <div className="relative z-10 flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-[#e8a33d] flex items-center justify-center text-black shadow-lg">
                              <Play className="w-7 h-7 ml-1 fill-current" />
                            </div>
                            <span className="text-xs font-bold text-white uppercase tracking-wider bg-black/70 px-3 py-1.5 rounded-full border border-white/20">
                              Watch Reel
                            </span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Overlaid Reel Header Controls (Sound & Fullscreen with Back) */}
                  <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-auto">
                    <span className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white border border-white/15 flex items-center gap-1.5 uppercase tracking-wider">
                      <Camera className="w-3 h-3 text-[#e8a33d]" />
                      {currentReel.platform || parsedCurrent.platform}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleMute}
                        className="w-9 h-9 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-black transition-colors"
                        title={isMuted ? 'Unmute Audio (Voice Enabled)' : 'Mute Audio'}
                      >
                        {isMuted ? (
                          <VolumeX className="w-4 h-4 text-white/70" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-[#e8a33d]" />
                        )}
                      </button>

                      <button
                        onClick={() => setFullscreenReel(currentReel)}
                        className="w-9 h-9 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-black transition-colors"
                        title="Enlarge Video on Full Screen"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Floating Action Buttons Inside Reel (Likes, Views, Comments) */}
                  {/* Note: External link / YouTube open button has been completely removed as requested */}
                  <div className="absolute right-4 bottom-8 z-30 flex flex-col items-center gap-4 pointer-events-auto">
                    {/* Likes */}
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => toggleLike(currentReel.id)}
                        className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 ${
                          likedMap[currentReel.id]
                            ? 'bg-rose-500 text-white shadow-rose-500/30'
                            : 'bg-black/70 backdrop-blur-md border border-white/20 text-white hover:text-rose-400'
                        }`}
                        title="Like Reel"
                      >
                        <Heart className={`w-5 h-5 ${likedMap[currentReel.id] ? 'fill-current' : ''}`} />
                      </button>
                      <span className="text-[10px] font-bold text-white drop-shadow">
                        {formatCount(Number(currentReel.likes || 0) + (likedMap[currentReel.id] ? 1 : 0))}
                      </span>
                    </div>

                    {/* Views */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center bg-black/70 backdrop-blur-md border border-white/20 text-white shadow-lg">
                        <Eye className="w-5 h-5 text-white/80" />
                      </div>
                      <span className="text-[10px] font-bold text-white drop-shadow">
                        {formatCount(currentReel.views)}
                      </span>
                    </div>

                    {/* Comments Drawer Button */}
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => setActiveCommentsReelId(currentReel.id)}
                        className="w-11 h-11 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:text-[#e8a33d] transition-colors shadow-lg active:scale-90"
                        title="View & Leave Comments"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                      <span className="text-[10px] font-bold text-white drop-shadow">
                        Comments
                      </span>
                    </div>
                  </div>

                  {/* Overlaid Playback Controls (Prev, Play/Pause, Next) */}
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 pointer-events-auto">
                    <button 
                      onClick={handlePrev} 
                      className="w-10 h-10 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black transition-colors" 
                      title="Previous Reel"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={togglePlay} 
                      className="w-12 h-12 rounded-full bg-[#e8a33d] text-black shadow-lg shadow-[#e8a33d]/30 flex items-center justify-center hover:scale-105 transition-transform" 
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </button>
                    <button 
                      onClick={handleNext} 
                      className="w-10 h-10 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black transition-colors" 
                      title="Next Reel"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Side: Reel Narrative, Caption & Interactive Navigation */}
              <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-between h-full space-y-6">
                
                {/* Meta Badge & Reel Title */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl sm:text-3xl font-bold font-serif text-white">
                      {currentReel.title || 'The Bagichi Garden Atmosphere'}
                    </h3>
                  </div>

                  <div className="mt-4 p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
                    <p className="text-white/80 text-sm sm:text-base leading-[2.2]">
                      {currentReel.caption}
                    </p>
                  </div>

                  {/* Customer Interactive Action Bar */}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setActiveCommentsReelId(currentReel.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 text-[#e8a33d]" /> 
                      Leave a Comment
                    </button>
                    <button
                      onClick={() => setFullscreenReel(currentReel)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <Maximize2 className="w-4 h-4 text-[#e8a33d]" />
                      Full Screen View
                    </button>
                  </div>
                </div>

                {/* Bottom Story Strip Selector */}
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-white/50 block mb-2.5">
                    Select a Story to Play ({reels.length} Reels)
                  </span>
                  <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {reels.map((item, idx) => {
                      const isSelected = idx === currentIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectReel(idx)}
                          className={`relative flex-shrink-0 w-20 sm:w-24 aspect-[9/16] rounded-xl overflow-hidden border-2 transition-all ${
                            isSelected
                              ? 'border-[#e8a33d] scale-105 shadow-lg shadow-[#e8a33d]/30 ring-2 ring-[#e8a33d]/40'
                              : 'border-white/15 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={item.thumbnailUrl || parseSocialVideoUrl(item.url, item.aspectRatio, true).thumbnailUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold text-white truncate max-w-[80%]">
                            #{idx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      ) : (
        /* -------------------- GRID VIEW MODE -------------------- */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {reels.map((reel, idx) => {
            const parsed = parseSocialVideoUrl(reel.videoUrl || reel.url, reel.aspectRatio);
            return (
              <motion.div
                key={reel.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="group relative bg-[#120f0d] rounded-3xl overflow-hidden border border-white/10 hover:border-[#e8a33d]/40 transition-all shadow-xl flex flex-col justify-between cursor-pointer"
                onClick={() => {
                  setCurrentIndex(idx);
                  setViewMode('cinema');
                }}
              >
                {/* 9:16 Frame Container */}
                <div className="aspect-[9/16] relative bg-black overflow-hidden flex items-center justify-center">
                  <img
                    src={reel.thumbnailUrl || parsed.thumbnailUrl}
                    alt={reel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40" />

                  {/* Center Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[#e8a33d] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#e8a33d] group-hover:text-black transition-all shadow-xl">
                      <Play className="w-6 h-6 ml-0.5 fill-current" />
                    </div>
                  </div>

                  {/* Top Platform Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white border border-white/15 flex items-center gap-1.5 capitalize">
                      <Camera className="w-3 h-3 text-[#e8a33d]" />
                      {parsed.platform}
                    </span>
                  </div>

                  {/* Bottom Caption Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                    <h4 className="text-sm font-bold text-white line-clamp-1 mb-1">{reel.title}</h4>
                    <p className="text-white/70 text-xs line-clamp-2 leading-[2.2]">{reel.caption}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* -------------------- FULLSCREEN MODAL PLAYER (WITH BACK BUTTON) -------------------- */}
      <AnimatePresence>
        {fullscreenReel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-lg">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md aspect-[9/16] bg-black rounded-3xl overflow-hidden border border-[#e8a33d]/40 shadow-2xl flex flex-col justify-between"
            >
              {/* Prominent Back Button (Top Left) & Close (Top Right) */}
              <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-auto">
                <button
                  onClick={() => setFullscreenReel(null)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/80 backdrop-blur-md text-white border border-white/20 hover:bg-[#e8a33d] hover:text-black transition-all shadow-xl font-bold text-xs"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="w-10 h-10 rounded-full bg-black/80 backdrop-blur-md text-white flex items-center justify-center border border-white/20 hover:bg-white/20 transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-white/70" /> : <Volume2 className="w-4 h-4 text-[#e8a33d]" />}
                  </button>

                  <button
                    onClick={() => setFullscreenReel(null)}
                    className="w-10 h-10 rounded-full bg-black/80 backdrop-blur-md text-white flex items-center justify-center border border-white/20 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Fullscreen Video Player */}
              <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
                {parseSocialVideoUrl(fullscreenReel.videoUrl || fullscreenReel.url, fullscreenReel.aspectRatio, isMuted).isDirectVideo || fullscreenReel.videoUrl ? (
                  <video
                    ref={fullscreenVideoRef}
                    src={fullscreenReel.videoUrl || fullscreenReel.url}
                    autoPlay
                    controls
                    playsInline
                    loop
                    muted={isMuted}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <iframe
                    src={parseSocialVideoUrl(fullscreenReel.videoUrl || fullscreenReel.url, fullscreenReel.aspectRatio, isMuted).embedUrl}
                    title="Fullscreen Reel"
                    className="w-full h-full border-0 pointer-events-none scale-[1.35]"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>

              {/* Bottom Caption in Fullscreen */}
              <div className="absolute bottom-4 left-4 right-4 z-30 pointer-events-none bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <h4 className="text-sm font-bold text-white mb-1">{fullscreenReel.title}</h4>
                <p className="text-xs text-white/80 line-clamp-2">{fullscreenReel.caption}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- CUSTOMER COMMENTS DRAWER / MODAL -------------------- */}
      <AnimatePresence>
        {activeCommentsReelId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#120f0d] rounded-3xl border border-[#e8a33d]/40 w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-[#e8a33d]" />
                  <h3 className="text-lg font-bold text-white">Reel Comments ({comments.length})</h3>
                </div>
                <button
                  onClick={() => setActiveCommentsReelId(null)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-10 text-white/40 space-y-2">
                    <MessageCircle className="w-10 h-10 mx-auto text-[#e8a33d]/30" />
                    <p className="text-sm">No comments yet. Be the first to share your thoughts!</p>
                  </div>
                ) : (
                  comments.map((cmt) => (
                    <div
                      key={cmt.id}
                      className={`p-4 rounded-2xl transition-all border ${
                        cmt.isPinned
                          ? 'bg-[#e8a33d]/10 border-[#e8a33d]/40 ring-1 ring-[#e8a33d]/30'
                          : 'bg-white/[0.03] border-white/10'
                      }`}
                    >
                      {/* Pinned Badge (Only Admin Pinned Comments show at top) */}
                      {cmt.isPinned && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#e8a33d] uppercase tracking-wider mb-2">
                          <Pin className="w-3.5 h-3.5 fill-[#e8a33d]" /> Pinned by Admin
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{cmt.authorName}</span>
                            <span className="text-[10px] text-white/40">
                              {cmt.createdAt?.toDate ? cmt.createdAt.toDate().toLocaleDateString() : 'Just now'}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">{cmt.text}</p>
                        </div>

                        {/* Admin Liked Heart Badge */}
                        {cmt.adminLiked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 flex-shrink-0">
                            <Heart className="w-3 h-3 fill-rose-500 text-rose-500" /> Liked by Admin
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handlePostComment} className="p-4 border-t border-white/10 bg-black/60 space-y-3">
                {commentSuccess && (
                  <div className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" /> Comment posted successfully!
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Your Name *"
                    value={newCommentAuthor}
                    onChange={(e) => setNewCommentAuthor(e.target.value)}
                    className="bg-[#080706] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#e8a33d]"
                  />
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Write your comment..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 bg-[#080706] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#e8a33d]"
                    />
                    <button
                      type="submit"
                      disabled={isPostingComment}
                      className="px-4 py-2 rounded-xl bg-[#e8a33d] text-black font-bold text-xs hover:bg-[#f3b55c] transition-all disabled:opacity-50 flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </section>
  );
}

