import { useEffect, useState } from "react";
import { Star, Quote } from "lucide-react";
import { motion } from "motion/react";
import { Review } from "../types";

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    fetch("/api/reviews")
      .then((res) => res.json())
      .then((data) => setReviews(data))
      .catch((err) => console.error(err));
  }, []);

  if (reviews.length === 0) return null;

  return (
    <section id="reviews" className="py-24 bg-[#f5f5f0] border-t border-[#5A5A40]/10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 flex flex-col items-center">
          <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-[#5A5A40] mb-4">
            Testimonials
          </h2>
          <h3 className="text-4xl md:text-5xl font-serif text-[#141414] mb-6">
            Guest Experiences
          </h3>
          <div className="w-16 h-px bg-[#5A5A40]/30 mx-auto"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((review, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              key={review.id}
              className="bg-[#fdfdfb] p-8 rounded-2xl border border-[#f5f5f0] shadow-sm relative flex flex-col"
            >
              <Quote className="absolute top-6 right-6 w-8 h-8 text-[#5A5A40]/10" />
              <div className="flex items-center gap-1 mb-6">
                {[...Array(5)].map((_, index) => (
                  <Star
                    key={index}
                    className={`w-4 h-4 ${
                      index < review.rating ? "fill-[#C5A059] text-[#C5A059]" : "fill-stone-200 text-stone-200"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm italic text-[#5A5A40]/80 font-serif leading-relaxed flex-1 mb-6">
                "{review.comment}"
              </p>
              <div className="pt-4 border-t border-[#5A5A40]/10 mt-auto">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-[#141414]">— {review.authorName}</p>
                 <p className="text-[9px] uppercase tracking-widest text-[#141414]/60 mt-1">Verified Guest</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
