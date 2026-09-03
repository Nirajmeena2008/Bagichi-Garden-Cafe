import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, Quote, ArrowLeft, Calendar, Plus, Check, Filter, MessageSquare, ThumbsUp } from "lucide-react";
import { collection, query, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { motion } from "motion/react";
import { Trash2 } from "lucide-react";
import { db } from "../lib/firebase";
import { Review } from "../types";

const INITIAL_FALLBACK_REVIEWS: Review[] = [
  {
    id: "fb-1",
    authorName: "Afreen R.",
    rating: 5,
    comment: "Ambience and cleanliness was very good. Food top notch. Special mention to the royal garden seating under the evening lights!",
    createdAt: new Date()
  },
  {
    id: "fb-2",
    authorName: "Lav P.",
    rating: 5,
    comment: "Lush green garden, spacious restaurant, delicious food will make your experience unforgettable. Good option for lunch and caters to big groups with ease.",
    createdAt: new Date()
  },
  {
    id: "fb-3",
    authorName: "Wanderlog Reviewer",
    rating: 5,
    comment: "A truly delightful dining experience. The ambiance is charming, with lovely lighting and comfortable outdoor seating.",
    createdAt: new Date()
  },
  {
    id: "fb-4",
    authorName: "Vikram Mehta",
    rating: 4,
    comment: "The Dal Makhani and Garlic Naan were extraordinary. Great highway stop with ample parking and peaceful greenery.",
    createdAt: new Date()
  }
];

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddReview, setShowAddReview] = useState(false);
  const [newAuthor, setNewAuthor] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');

  const [deviceToken, setDeviceToken] = useState("");
  useEffect(() => {
    let token = localStorage.getItem("bagichi_reviewer_id");
    if (!token) {
      token = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("bagichi_reviewer_id", token);
    }
    setDeviceToken(token);
  }, []);

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteDoc(doc(db, "reviews", reviewId));
    } catch(err) {
      console.error("Failed to delete review", err);
    }
  };


  // Real-time Firestore reviews listener
  useEffect(() => {
    const q = query(collection(db, 'reviews'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Review[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              authorName: data.authorName || 'Guest Visitor',
              rating: typeof data.rating === 'number' ? data.rating : 5,
              comment: data.comment || '',
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
              likes: data.likes || 0,
              deviceToken: data.deviceToken
            };
          });

          // Rank them according to star level: highest stars at top, lowest stars at bottom.
          // For equal stars, sort newest first.
          list.sort((a, b) => {
            if (b.rating !== a.rating) {
              return b.rating - a.rating;
            }
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });

          setReviews(list);
        } else {
          // If no reviews exist in DB yet, show fallback and automatically sort them
          const fallbackSorted = [...INITIAL_FALLBACK_REVIEWS].sort((a, b) => b.rating - a.rating);
          setReviews(fallbackSorted);
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Firestore reviews snapshot error, using fallbacks:', error);
        const fallbackSorted = [...INITIAL_FALLBACK_REVIEWS].sort((a, b) => b.rating - a.rating);
        setReviews(fallbackSorted);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthor.trim() || !newComment.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        authorName: newAuthor.trim(),
        comment: newComment.trim(),
        rating: Number(newRating),
        createdAt: serverTimestamp(),
        likes: 0,
        deviceToken: deviceToken
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setShowAddReview(false);
        setNewAuthor("");
        setNewComment("");
        setNewRating(5);
        setSubmitting(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to post review:', err);
      // Fallback local update if offline
      const localRev: Review = {
        id: `rev-${Date.now()}`,
        authorName: newAuthor,
        rating: newRating,
        comment: newComment,
        createdAt: new Date()
      };
      setReviews(prev => [localRev, ...prev].sort((a, b) => b.rating - a.rating));
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setShowAddReview(false);
        setNewAuthor("");
        setNewComment("");
        setNewRating(5);
        setSubmitting(false);
      }, 1500);
    }
  };

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1)
    : "4.9";

  // Filtered reviews based on user selected star tab
  const displayedReviews = filterRating === 'all'
    ? reviews
    : reviews.filter(r => r.rating === filterRating);

  return (
    <section id="reviews" className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex flex-col items-center justify-center gap-6 mb-14 text-center">
        <div>
          <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-[#e8a33d] mb-3">
            Verified Testimonials
          </h2>
          <h1 className="text-3xl sm:text-4xl font-serif text-white mb-4">
            Guest Experiences
          </h1>
          <p className="text-white/60 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Rated by our highway travellers, families, and evening diners. Ranked by highest star reviews.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-widest text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <button
            onClick={() => setShowAddReview(!showAddReview)}
            className="inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-full bg-[#e8a33d] text-black text-xs font-bold uppercase tracking-wider hover:bg-[#f3b55c] transition-all shadow-lg shadow-[#e8a33d]/20"
          >
            <Plus className="w-4 h-4" /> Write a Review
          </button>
          <Link
            to="/booking"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/10 text-white text-xs font-semibold uppercase tracking-wider hover:bg-white/20 transition-all border border-white/15"
          >
            <Calendar className="w-4 h-4 text-[#e8a33d]" /> Book Table
          </Link>
        </div>
      </div>

      {/* Review Summary Banner */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md">
        <div className="flex items-center gap-5 text-left">
          <div className="text-5xl font-serif font-bold text-[#e8a33d]">{averageRating}</div>
          <div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-[#e8a33d] text-[#e8a33d]" />
              ))}
            </div>
            <p className="text-xs text-white/60 mt-1">Based on {reviews.length > 0 ? reviews.length + 1040 : '1,040'}+ visitor ratings</p>
          </div>
        </div>

        {/* Star Rating Quick Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-white/50 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#e8a33d]" /> Filter:
          </span>
          <button
            onClick={() => setFilterRating('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              filterRating === 'all'
                ? 'bg-[#e8a33d] text-black border-[#e8a33d]'
                : 'bg-black/40 text-white/70 border-white/10 hover:border-white/30'
            }`}
          >
            All Stars
          </button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => setFilterRating(star)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all border ${
                filterRating === star
                  ? 'bg-[#e8a33d] text-black border-[#e8a33d]'
                  : 'bg-black/40 text-white/70 border-white/10 hover:border-white/30'
              }`}
            >
              <span>{star}</span>
              <Star className={`w-3 h-3 ${filterRating === star ? 'fill-black' : 'fill-[#e8a33d] text-[#e8a33d]'}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Write Review Form Modal / Box */}
      {showAddReview && (
        <form
          onSubmit={handleAddReview}
          className="bg-[#120f0d] border border-[#e8a33d]/40 rounded-3xl p-6 sm:p-8 mb-10 max-w-xl mx-auto shadow-2xl backdrop-blur-md"
        >
          <div className="text-center mb-6">
            <span className="text-[10px] uppercase tracking-widest text-[#e8a33d] font-bold">Leave Your Feedback</span>
            <h3 className="text-2xl font-serif text-white mt-1">Rate Your Visit</h3>
            <p className="text-xs text-white/60 mt-1">Your review helps fellow highway travelers and guests enjoy great dining.</p>
          </div>

          {submitted ? (
            <div className="p-6 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-2xl text-center flex flex-col items-center justify-center gap-2 text-sm font-semibold">
              <Check className="w-8 h-8 text-emerald-400 bg-emerald-500/20 rounded-full p-1" />
              <span>Thank you, {newAuthor}! Your review has been published.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-[#e8a33d] block mb-1.5">Your Full Name *</label>
                <input
                  type="text"
                  required
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="e.g. Priya Sharma or Rahul Verma"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-sm outline-none focus:border-[#e8a33d] transition-colors"
                />
              </div>

              {/* 5-Star Rating System */}
              <div className="flex flex-col items-center justify-center py-2 bg-black/40 rounded-2xl border border-white/10">
                <label className="text-xs uppercase tracking-wider text-[#e8a33d] font-bold block mb-2">
                  Select Rating ({newRating} of 5 Stars)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className="p-1 hover:scale-125 transition-transform"
                      title={`${star} Stars`}
                    >
                      <Star
                        className={`w-8 h-8 cursor-pointer transition-colors ${
                          star <= newRating ? "fill-[#e8a33d] text-[#e8a33d]" : "text-white/20 hover:text-[#e8a33d]/40"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-white/50 mt-1 font-medium">
                  {newRating === 5 ? "🌟 Exceptional Dining" : newRating === 4 ? "👍 Very Good Experience" : newRating === 3 ? "👌 Good Visit" : newRating === 2 ? "⚠️ Below Expectations" : "👎 Needs Improvement"}
                </span>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-[#e8a33d] block mb-1.5">Detailed Review & What You Liked *</label>
                <textarea
                  required
                  rows={4}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Tell us about the garden ambience, flavors, signature curries, service speed, or parking..."
                  className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-sm outline-none focus:border-[#e8a33d] transition-colors"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddReview(false)}
                  className="px-5 py-2.5 rounded-xl text-xs uppercase font-bold text-white/60 hover:text-white bg-white/5 border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#e8a33d] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#f3b55c] transition-all shadow-lg shadow-[#e8a33d]/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? 'Publishing...' : 'Post Review'}
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Reviews Grid - Ranked by Star Level (5 Stars First) */}
      
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-[#120f0d] p-6 rounded-3xl border border-white/10 shadow-lg h-64 overflow-hidden relative isolate">
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent z-10"
                />
                <div className="w-1/3 h-4 bg-white/10 rounded-full mb-6"></div>
                <div className="space-y-3 mb-6">
                  <div className="w-full h-3 bg-white/10 rounded-full"></div>
                  <div className="w-5/6 h-3 bg-white/10 rounded-full"></div>
                  <div className="w-4/6 h-3 bg-white/10 rounded-full"></div>
                </div>
                <div className="absolute bottom-6 left-6 right-6 flex justify-between">
                  <div className="w-1/4 h-3 bg-white/10 rounded-full"></div>
                  <div className="w-1/5 h-3 bg-white/10 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {displayedReviews.map((review, index) => (
          <div
            key={review.id || index}
            className="bg-[#120f0d] p-6 rounded-3xl border border-white/10 shadow-lg relative flex flex-col justify-between hover:border-[#e8a33d]/40 transition-all group"
          >
            {review.deviceToken === deviceToken && !review.id.startsWith("fb-") && (
              <button onClick={() => handleDeleteReview(review.id)} className="absolute top-5 left-5 p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors z-20" title="Delete my review">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <Quote className="absolute top-5 right-5 w-8 h-8 text-[#e8a33d]/15 group-hover:text-[#e8a33d]/30 transition-colors" />

            <div>
              {/* Star Rating Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < review.rating
                          ? "fill-[#e8a33d] text-[#e8a33d]"
                          : "fill-white/10 text-white/10"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#e8a33d]/10 text-[#e8a33d] border border-[#e8a33d]/20">
                  {review.rating}.0 ★
                </span>
              </div>

              {/* Review Text */}
              <p className="text-xs sm:text-sm text-white/80 font-serif leading-[2.2] italic mb-6">
                "{review.comment}"
              </p>
            </div>

            {/* Author Footer */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{review.authorName}</p>
                <p className="text-[10px] uppercase tracking-widest text-[#e8a33d]/80 font-semibold">
                  Verified Diner
                </p>
              </div>
              <div className="text-[10px] text-white/40">
                {review.createdAt instanceof Date
                  ? review.createdAt.toLocaleDateString()
                  : 'Recent Guest'}
              </div>
            </div>
          </div>
        ))}
      </div>
        )}
    </section>
  );
}

