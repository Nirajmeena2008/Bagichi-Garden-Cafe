import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, Quote, ArrowLeft, Calendar, Plus, Check } from "lucide-react";
import { Review } from "../types";

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showAddReview, setShowAddReview] = useState(false);
  const [newAuthor, setNewAuthor] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/reviews.json")
      .then((res) => res.json())
      .then((data) => setReviews(data))
      .catch((err) => console.error(err));
  }, []);

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthor || !newComment) return;

    const newRev: Review = {
      id: `rev-${Date.now()}`,
      authorName: newAuthor,
      rating: newRating,
      comment: newComment,
    };

    setReviews([newRev, ...reviews]);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setShowAddReview(false);
      setNewAuthor("");
      setNewComment("");
      setNewRating(5);
    }, 1500);
  };

  return (
    <section id="reviews" className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/60 hover:text-[#e8a33d] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="text-center">
          <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-[#e8a33d] mb-1">
            Verified Testimonials
          </h2>
          <h1 className="text-3xl sm:text-4xl font-serif text-white">
            Guest Experiences
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddReview(!showAddReview)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 text-white text-xs font-semibold uppercase tracking-wider hover:bg-white/20 transition-all border border-white/15"
          >
            <Plus className="w-3.5 h-3.5 text-[#e8a33d]" /> Write Review
          </button>
          <Link
            to="/booking"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#e8a33d] text-black text-xs font-bold uppercase tracking-wider hover:bg-[#f3b55c] transition-all"
          >
            <Calendar className="w-3.5 h-3.5" /> Book Table
          </Link>
        </div>
      </div>

      {/* Review Summary Banner */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="text-4xl font-serif font-bold text-[#e8a33d]">4.9</div>
          <div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-[#e8a33d] text-[#e8a33d]" />
              ))}
            </div>
            <p className="text-xs text-white/60 mt-1">Based on 1,040+ highway visitor ratings</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-white/80">
          <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10">
            🌿 Outdoor Garden Lawn
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10">
            🍲 Authentic Highway Flavors
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10">
            🚗 Ample Free Parking
          </div>
        </div>
      </div>

      {/* Write Review Form Modal / Drawer */}
      {showAddReview && (
        <form
          onSubmit={handleAddReview}
          className="bg-black/60 border border-[#e8a33d]/40 rounded-2xl p-6 mb-8 max-w-xl mx-auto shadow-2xl backdrop-blur-md"
        >
          <h3 className="text-base font-serif text-white mb-4">Share Your Experience</h3>
          {submitted ? (
            <div className="p-4 bg-[#e8a33d]/20 text-[#e8a33d] rounded-xl text-center flex items-center justify-center gap-2 text-sm font-semibold">
              <Check className="w-5 h-5" /> Thank you for your feedback!
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-[#e8a33d] block mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="E.g. Priya Sharma"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm outline-none focus:border-[#e8a33d]"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-[#e8a33d] block mb-1">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= newRating ? "fill-[#e8a33d] text-[#e8a33d]" : "text-white/20"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-[#e8a33d] block mb-1">Review</label>
                <textarea
                  required
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="How was the food, outdoor ambience, and highway halt experience?"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm outline-none focus:border-[#e8a33d]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddReview(false)}
                  className="px-4 py-2 rounded-xl text-xs uppercase text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#e8a33d] text-black font-bold text-xs uppercase hover:bg-[#f3b55c]"
                >
                  Post Review
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-sm relative flex flex-col justify-between hover:border-[#e8a33d]/30 transition-colors"
          >
            <Quote className="absolute top-4 right-4 w-7 h-7 text-[#e8a33d]/15" />
            <div>
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, index) => (
                  <Star
                    key={index}
                    className={`w-3.5 h-3.5 ${
                      index < review.rating
                        ? "fill-[#e8a33d] text-[#e8a33d]"
                        : "fill-white/20 text-white/20"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-white/80 font-serif leading-relaxed italic mb-4">
                "{review.comment}"
              </p>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">{review.authorName}</p>
                <p className="text-[10px] uppercase tracking-widest text-[#e8a33d]/80">Verified Guest</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
