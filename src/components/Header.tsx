import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Leaf } from "lucide-react";
import { cn } from "../lib/utils";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300 border-b",
        isScrolled
          ? "bg-white/90 backdrop-blur-md py-4 border-[#5A5A40]/10"
          : "bg-transparent py-6 border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <Link to="/" className="flex items-baseline space-x-1 group">
          <span className={cn("font-serif text-2xl font-bold transition-colors uppercase", isScrolled ? "text-[#5A5A40]" : "text-white")}>
            THE BAGICHI
          </span>
          <span className={cn("text-[10px] uppercase tracking-widest hidden sm:inline-block transition-colors", isScrolled ? "text-[#5A5A40]/60" : "text-white/60")}>
            Garden Cafe
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#menu" className={cn("text-xs uppercase tracking-widest font-semibold transition-colors hover:text-[#5A5A40]", isScrolled ? "text-[#5A5A40]" : "text-white")}>Menu</a>
          <a href="#reviews" className={cn("text-xs uppercase tracking-widest font-semibold transition-colors hover:text-[#5A5A40]", isScrolled ? "text-[#5A5A40]" : "text-white")}>Reviews</a>
          <Link to="/manage" className={cn("text-xs uppercase tracking-widest font-semibold transition-colors hover:text-[#5A5A40]", isScrolled ? "text-[#5A5A40]" : "text-white")}>Manage Booking</Link>
          <a href="https://maps.app.goo.gl/uMgo4BpBVjxm4HrWA" target="_blank" rel="noopener noreferrer" className={cn("text-xs uppercase tracking-widest font-semibold transition-colors hover:text-[#5A5A40]", isScrolled ? "text-[#5A5A40]" : "text-white")}>Location</a>
          <a
            href="#booking"
            className="bg-[#5A5A40] hover:bg-[#4a4a35] text-white px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-bold transition-all shadow-lg shadow-[#5A5A40]/20"
          >
            Book a Table
          </a>
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className={cn("h-6 w-6", isScrolled ? "text-[#5A5A40]" : "text-white")} />
          ) : (
            <Menu className={cn("h-6 w-6", isScrolled ? "text-[#5A5A40]" : "text-white")} />
          )}
        </button>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg py-6 px-4 flex flex-col gap-6 border-b border-[#5A5A40]/10">
          <a href="#menu" onClick={() => setIsMobileMenuOpen(false)} className="text-xs uppercase tracking-widest font-semibold text-[#5A5A40] hover:text-[#5A5A40]/70">Menu</a>
          <a href="#reviews" onClick={() => setIsMobileMenuOpen(false)} className="text-xs uppercase tracking-widest font-semibold text-[#5A5A40] hover:text-[#5A5A40]/70">Reviews</a>
          <Link to="/manage" onClick={() => setIsMobileMenuOpen(false)} className="text-xs uppercase tracking-widest font-semibold text-[#5A5A40] hover:text-[#5A5A40]/70">Manage Booking</Link>
          <a href="https://maps.app.goo.gl/uMgo4BpBVjxm4HrWA" target="_blank" rel="noopener noreferrer" onClick={() => setIsMobileMenuOpen(false)} className="text-xs uppercase tracking-widest font-semibold text-[#5A5A40] hover:text-[#5A5A40]/70">Location</a>
          <a
            href="#booking"
            onClick={() => setIsMobileMenuOpen(false)}
            className="bg-[#5A5A40] text-white text-center px-4 py-3 rounded-full text-xs uppercase tracking-widest font-bold shadow-lg shadow-[#5A5A40]/20"
          >
            Book a Table
          </a>
        </div>
      )}
    </header>
  );
}
