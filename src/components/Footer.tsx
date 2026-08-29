import { MapPin, Phone, Mail, Instagram, Facebook } from "lucide-react";

export default function Footer() {
  return (
    <footer id="contact" className="bg-[#141414] text-white/60 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="space-y-6">
            <h3 className="font-serif text-3xl font-bold text-white uppercase">THE BAGICHI</h3>
            <p className="text-xs uppercase tracking-wider font-light leading-relaxed text-white/60">
              A highly-rated stop for families and road-trippers on the Delhi-Jaipur highway.
            </p>
            <div className="flex gap-4 pt-2">
              <a href="https://www.instagram.com/the_bagichi?utm_source=ig_web_button_share_sheet&igsi=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-[#141414] transition-all text-white/60">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://www.facebook.com/thebagichi" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-[#141414] transition-all text-white/60">
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-6">
            <h4 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/40">Location</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#C5A059] mt-0.5 flex-shrink-0" />
                <a href="https://maps.app.goo.gl/uMgo4BpBVjxm4HrWA" target="_blank" rel="noopener noreferrer" className="text-xs leading-relaxed text-white hover:text-[#C5A059] transition-colors">
                  NH248, Near Bhanpur Mode, Village Gunawata, Amer, Kukas, Rajasthan 302038
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-6">
             <h4 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/40">Reservations</h4>
             <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#C5A059] flex-shrink-0" />
                <span className="text-xs text-white">+91 97723 70490</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#C5A059] flex-shrink-0" />
                <span className="text-xs text-white">hello@thebagichi.com</span>
              </li>
             </ul>
          </div>

          {/* Hours */}
          <div className="space-y-6">
            <h4 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/40">Hours</h4>
            <ul className="space-y-3 text-xs">
              <li className="flex flex-col gap-1 pb-2">
                <span className="text-white/60">Monday - Sunday</span>
                <span className="text-white">11:00 AM - 11:00 PM</span>
              </li>
              <li className="flex justify-between pb-2 text-[#C5A059] italic text-[11px]">
                <span>Open for lunch & dinner</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Map */}
        <div className="h-64 w-full mb-12 rounded-xl overflow-hidden border border-white/10 relative opacity-80 hover:opacity-100 transition-opacity grayscale hover:grayscale-0">
          <iframe
            title="Google Maps Location"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14217.152433022511!2d75.9314917!3d27.0805742!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjfCsDA0JzUwLjEiTiA3NcKwNTYnMjQuOSJF!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>

        <div className="border-t border-white/10 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-widest text-white/40">
          <p>&copy; {new Date().getFullYear()} The Bagichi. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
