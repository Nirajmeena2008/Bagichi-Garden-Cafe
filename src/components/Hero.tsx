import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Star } from "./icons";
import { Utensils, Calendar, MapPin, MessageSquare, ClipboardCheck, Sparkles } from "lucide-react";
import "../styles/Hero.css";

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const play = video.play();
    if (play?.catch) play.catch(() => {});
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      video.pause();
      setReady(true);
    }
  }, []);

  return (
    <section className="hero w-full" id="top">
      <div className="hero__media" aria-hidden="true">
        <video 
          ref={videoRef} 
          className={`hero__video ${ready ? 'is-ready' : ''}`}
          src="/hero.mp4" 
          autoPlay 
          muted 
          loop 
          playsInline 
          preload="auto"
          onCanPlay={() => setReady(true)} 
        />
        <div className="hero__scrim" />
      </div>

      <div className="hero__body shell text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-8">
          <Sparkles className="w-3.5 h-3.5 text-[#e8a33d]" />
          <span className="text-[11px] font-medium tracking-widest uppercase text-white/90">
            Delhi-Jaipur Highway Sanctuary
          </span>
        </div>

        <h1 className="hero__title text-center mx-auto">
          Experience the Magic<br />of Outdoor Dining
        </h1>
        <p className="hero__sub text-center mx-auto mt-6">
          A lush green sanctuary on the Delhi-Jaipur highway, serving authentic North Indian delicacies and refreshing beverages under the starlit sky.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-14">
          <Link to="/booking" className="btn hero__cta !mt-0 !bg-[#e8a33d] !text-black font-semibold hover:!bg-[#f5b863] px-8 py-4">
            <Calendar className="w-4 h-4 mr-2" />
            Book a Table
          </Link>
          <Link to="/menu" className="btn hero__cta !mt-0 !bg-white/10 !text-white !border !border-white/20 hover:!bg-white/20 backdrop-blur-md px-8 py-4">
            <Utensils className="w-4 h-4 mr-2" />
            Explore Menu
          </Link>
        </div>

        {/* Secondary Quick Jump Sections Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10 max-w-3xl w-full">
          <Link
            to="/menu"
            className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-[#e8a33d]/50 backdrop-blur-md flex flex-col items-center text-center transition-all group hover:bg-black/60"
          >
            <Utensils className="w-5 h-5 text-[#e8a33d] mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-white">Full Menu</span>
            <span className="text-[10px] text-white/50">Specials & Drinks</span>
          </Link>

          <Link
            to="/booking"
            className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-[#e8a33d]/50 backdrop-blur-md flex flex-col items-center text-center transition-all group hover:bg-black/60"
          >
            <Calendar className="w-5 h-5 text-[#e8a33d] mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-white">Reservations</span>
            <span className="text-[10px] text-white/50">Instant Confirmation</span>
          </Link>

          <Link
            to="/reviews"
            className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-[#e8a33d]/50 backdrop-blur-md flex flex-col items-center text-center transition-all group hover:bg-black/60"
          >
            <MessageSquare className="w-5 h-5 text-[#e8a33d] mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-white">Guest Reviews</span>
            <span className="text-[10px] text-white/50">4.9 ★ Rating</span>
          </Link>

          <Link
            to="/contact"
            className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-[#e8a33d]/50 backdrop-blur-md flex flex-col items-center text-center transition-all group hover:bg-black/60"
          >
            <MapPin className="w-5 h-5 text-[#e8a33d] mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-white">Location</span>
            <span className="text-[10px] text-white/50">Map & Hours</span>
          </Link>
        </div>
      </div>

      <div className="rating shell mt-8">
        <span className="rating__count">1,040+ Google Reviews</span>
        <ul className="rating__stars" aria-label="Rated 5 out of 5">
          {Array.from({ length: 5 }, (_, i) => <li key={i}><Star /></li>)}
        </ul>
        <Link to="/reviews" className="rating__score hover:text-[#e8a33d] underline text-xs">
          Read All Reviews →
        </Link>
      </div>
    </section>
  );
}
