import { MapPin, Phone, Mail, Image as ImageIcon, Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer id="contact" className="bg-[#0e0c0a] border-t border-white/10 text-white/60 pt-12 pb-8 w-full mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="space-y-4 flex flex-col items-center text-center">
            <div className="flex flex-col items-center">
              <img 
                src="/instagram-logo.png" 
                alt="The Bagichi Logo" 
                className="w-12 h-12 rounded-full object-cover mb-3"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                }}
              />
              <h3 className="font-serif text-2xl font-bold text-white uppercase tracking-wider">THE BAGICHI</h3>
            </div>
            <p className="text-xs uppercase tracking-wider font-light leading-[2.2] text-white/60">
              A highly-rated outdoor garden sanctuary for families and road-trippers on the Delhi-Jaipur highway.
            </p>
            <div className="flex justify-center gap-3 pt-1">
              <a 
                href="https://www.instagram.com/the_bagichi?utm_source=ig_web_button_share_sheet&igsi=ZDNlZDc0MzIxNw==" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-[#e8a33d] hover:text-black transition-all text-white/70"
                aria-label="Instagram"
              >
                <ImageIcon className="w-4 h-4" />
              </a>
              <a 
                href="https://www.facebook.com/thebagichi" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-[#e8a33d] hover:text-black transition-all text-white/70"
                aria-label="Facebook"
              >
                <Users className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4 flex flex-col items-center text-center">
            <h4 className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#e8a33d]">Explore</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-white transition-colors">Home Experience</Link>
              </li>
              <li>
                <Link to="/menu" className="hover:text-white transition-colors">Culinary Menu</Link>
              </li>
              <li>
                <Link to="/booking" className="hover:text-white transition-colors">Table Reservation</Link>
              </li>
              <li>
                <Link to="/reviews" className="hover:text-white transition-colors">Guest Reviews</Link>
              </li>
              <li>
                <Link to="/manage" className="hover:text-white transition-colors">Manage Booking</Link>
              </li>
            </ul>
          </div>

          {/* Location & Contact */}
          <div className="space-y-4 flex flex-col items-center text-center">
            <h4 className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#e8a33d]">Location</h4>
            <ul className="space-y-3 flex flex-col items-center">
              <li className="flex flex-col items-center justify-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#e8a33d] mt-0.5 flex-shrink-0" />
                <a 
                  href="https://maps.app.goo.gl/uMgo4BpBVjxm4HrWA" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs leading-[2.2] text-white/80 hover:text-[#e8a33d] transition-colors"
                >
                  NH248, Near Bhanpur Mode, Village Gunawata, Amer, Kukas, Rajasthan 302038
                </a>
              </li>
              <li className="flex flex-col items-center justify-center gap-1.5">
                <Phone className="w-4 h-4 text-[#e8a33d] flex-shrink-0" />
                <a href="tel:+919772370490" className="text-xs text-white/80 hover:text-[#e8a33d]">
                  +91 97723 70490
                </a>
              </li>
              <li className="flex flex-col items-center justify-center gap-1.5">
                <Mail className="w-4 h-4 text-[#e8a33d] flex-shrink-0" />
                <a href="mailto:hello@thebagichi.com" className="text-xs text-white/80 hover:text-[#e8a33d]">
                  hello@thebagichi.com
                </a>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div className="space-y-4 flex flex-col items-center text-center">
            <h4 className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#e8a33d]">Opening Hours</h4>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs space-y-1">
              <div className="flex flex-col items-center justify-center text-white font-medium gap-1">
                <span>Monday – Sunday</span>
                <span className="text-[#e8a33d]">11:00 AM – 11:00 PM</span>
              </div>
              <p className="text-[10px] text-white/50 italic pt-1">
                Outdoor seating, live kitchen, lunch & dinner
              </p>
            </div>
            <Link
              to="/booking"
              className="inline-block w-full text-center py-2.5 rounded-xl bg-[#e8a33d] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#f3b55c] transition-all"
            >
              Book a Table Now
            </Link>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] uppercase tracking-widest text-white/40">
          <p>&copy; {new Date().getFullYear()} The Bagichi Garden Cafe & Restaurant. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/kds" className="hover:text-[#e8a33d] transition-colors">Kitchen (KDS)</Link>
            <Link to="/drive-records" className="hover:text-[#e8a33d] transition-colors">Drive Records</Link>
            <Link to="/admin" className="hover:text-white transition-colors">Staff Login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
