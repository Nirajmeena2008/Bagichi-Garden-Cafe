import { motion, Variants } from "motion/react";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PageTransitionProps {
  children: ReactNode;
}

const SLAT_COUNT = 5;
const EASE_BEZIER = [0.76, 0, 0.24, 1] as const;

export const SECTIONS = [
  { path: "/", label: "Home", shortLabel: "Home" },
  { path: "/menu", label: "Culinary Menu", shortLabel: "Menu" },
  { path: "/booking", label: "Book a Table", shortLabel: "Reserve" },
  { path: "/reviews", label: "Guest Reviews", shortLabel: "Reviews" },
  { path: "/contact", label: "Location & Hours", shortLabel: "Location" },
  { path: "/manage", label: "Manage Booking", shortLabel: "Manage" },
];

// Shutter / Curtains transition variants
const slatVariants: Variants = {
  initial: {
    scaleY: 1,
    originY: 0,
  },
  animate: (i: number) => ({
    scaleY: 0,
    originY: 0,
    transition: {
      duration: 0.55,
      ease: EASE_BEZIER,
      delay: i * 0.05,
    },
  }),
  exit: (i: number) => ({
    scaleY: 1,
    originY: 1,
    transition: {
      duration: 0.45,
      ease: EASE_BEZIER,
      delay: i * 0.04,
    },
  }),
};

export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Find current index in section hierarchy
  const currentIndex = SECTIONS.findIndex((s) => s.path === location.pathname);
  const nextSection = currentIndex >= 0 && currentIndex < SECTIONS.length - 1
    ? SECTIONS[currentIndex + 1]
    : SECTIONS[0]; // Loops to home if at the end

  const prevSection = currentIndex > 0
    ? SECTIONS[currentIndex - 1]
    : null;

  const isNavigatingRef = useRef(false);
  const touchStartY = useRef<number | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    isNavigatingRef.current = false;
  }, [location.pathname]);

  const goToNext = () => {
    if (isNavigatingRef.current || !nextSection) return;
    isNavigatingRef.current = true;
    navigate(nextSection.path);
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1200);
  };

  const goToPrev = () => {
    if (isNavigatingRef.current || !prevSection) return;
    isNavigatingRef.current = true;
    navigate(prevSection.path);
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1200);
  };

  // Check scroll position and handle wheel / touch gesture
  useEffect(() => {
    let accumulatedDelta = 0;
    let deltaResetTimer: NodeJS.Timeout;

    const handleWheel = (e: WheelEvent) => {
      // Don't trigger if user is scrolling inside an open modal or input
      const target = e.target as HTMLElement;
      if (target && target.closest(".no-page-scroll")) return;

      const windowHeight = window.innerHeight;
      const scrollY = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      
      const isAtBottom = windowHeight + scrollY >= scrollHeight - 30;
      const isAtTop = scrollY <= 15;

      if (e.deltaY > 0) {
        if (isAtBottom) {
          accumulatedDelta += e.deltaY;
          clearTimeout(deltaResetTimer);
          deltaResetTimer = setTimeout(() => {
            accumulatedDelta = 0;
          }, 300);

          if (accumulatedDelta > 40 && !isNavigatingRef.current) {
            accumulatedDelta = 0;
            goToNext();
          }
        }
      } else if (e.deltaY < 0) {
        if (isAtTop && prevSection) {
          accumulatedDelta += Math.abs(e.deltaY);
          clearTimeout(deltaResetTimer);
          deltaResetTimer = setTimeout(() => {
            accumulatedDelta = 0;
          }, 300);

          if (accumulatedDelta > 40 && !isNavigatingRef.current) {
            accumulatedDelta = 0;
            goToPrev();
          }
        }
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      const touchEndY = e.changedTouches[0].clientY;
      const diffY = touchStartY.current - touchEndY;
      touchStartY.current = null;

      const windowHeight = window.innerHeight;
      const scrollY = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      
      const isAtBottom = windowHeight + scrollY >= scrollHeight - 30;
      const isAtTop = scrollY <= 15;

      if (diffY > 60 && isAtBottom) {
        // Swiped up at bottom -> Go to next
        goToNext();
      } else if (diffY < -60 && isAtTop && prevSection) {
        // Swiped down at top -> Go to prev
        goToPrev();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const windowHeight = window.innerHeight;
      const scrollY = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const isAtBottom = windowHeight + scrollY >= scrollHeight - 30;
      const isAtTop = scrollY <= 15;

      if ((e.key === "PageDown" || e.key === "ArrowDown") && isAtBottom) {
        goToNext();
      } else if ((e.key === "PageUp" || e.key === "ArrowUp") && isAtTop && prevSection) {
        goToPrev();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(deltaResetTimer);
    };
  }, [currentIndex, nextSection, prevSection]);

  return (
    <div className="relative w-full min-h-screen">
      {/* Curtain Shutter Columns Overlay */}
      <div 
        className="fixed inset-0 z-[999] pointer-events-none flex flex-row"
        aria-hidden="true"
      >
        {Array.from({ length: SLAT_COUNT }).map((_, i) => (
          <motion.div
            key={i}
            custom={i}
            variants={slatVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 h-full bg-[#110e0c] border-r border-[#e8a33d]/15 last:border-r-0 shadow-2xl relative"
          >
            {/* Subtle accent highlight line inside each slat */}
            <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-[#e8a33d]/30 to-transparent" />
          </motion.div>
        ))}
      </div>

      {/* Side Section Navigation Dots (Desktop) */}
      <nav 
        aria-label="Section Navigation" 
        className="fixed right-5 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col items-center gap-3 bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10"
      >
        {SECTIONS.map((section, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={section.path}
              onClick={() => {
                if (idx !== currentIndex) navigate(section.path);
              }}
              className="group relative flex items-center justify-center p-1.5"
              aria-label={`Go to ${section.label}`}
            >
              <div
                className={`transition-all duration-300 rounded-full ${
                  isActive
                    ? "w-2.5 h-6 bg-[#e8a33d] shadow-sm shadow-[#e8a33d]/50"
                    : "w-2 h-2 bg-white/30 group-hover:bg-white group-hover:scale-125"
                }`}
              />
              {/* Tooltip */}
              <span className="absolute right-8 px-2.5 py-1 rounded-md bg-[#171412] border border-white/15 text-[11px] font-medium text-white tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                {section.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Main Page Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, delay: 0.18 }}
        className="w-full min-h-screen flex flex-col justify-between"
      >
        <div className="flex-1 w-full">
          {children}
        </div>

        {/* Bottom Interactive Scroll-To-Next Bar */}
        {nextSection && (
          <div className="w-full py-6 px-4 flex flex-col items-center justify-center border-t border-white/10 bg-[#0a0807]/90 backdrop-blur-sm z-30">
            <button
              onClick={goToNext}
              className="group inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 hover:bg-[#e8a33d]/15 border border-white/10 hover:border-[#e8a33d]/40 transition-all duration-300 text-xs font-semibold uppercase tracking-widest text-white/80 hover:text-[#e8a33d]"
            >
              <span>Scroll down or click for <strong>{nextSection.label}</strong></span>
              <div className="w-6 h-6 rounded-full bg-[#e8a33d]/20 text-[#e8a33d] flex items-center justify-center group-hover:translate-y-0.5 transition-transform">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </button>
            <p className="text-[10px] text-white/40 mt-1.5 uppercase tracking-wider">
              {currentIndex + 1} of {SECTIONS.length} Sections
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
