import { MapPin, Phone, Mail, Clock, Navigation, Calendar, ArrowLeft, Image as ImageIcon, Users } from "lucide-react";
import { Link } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function ContactPage() {
  return (
    <PageTransition>
      <div className="min-h-screen w-full bg-[#080706] text-white flex flex-col items-center justify-between selection:bg-[#e8a33d]/30 selection:text-white pt-24">
        <Header />
        
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {/* Header */}
          <div className="flex flex-col items-center justify-center gap-6 mb-14 text-center">
            <div>
              <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-[#e8a33d] mb-3">
                Find Us on Delhi-Jaipur Highway
              </h2>
              <h1 className="text-3xl sm:text-4xl font-serif text-white mb-6">
                Location & Contact
              </h1>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-widest text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Home
              </Link>
              <Link
                to="/booking"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#e8a33d] text-black text-xs font-bold uppercase tracking-wider hover:bg-[#f3b55c] transition-all shadow-lg shadow-[#e8a33d]/15"
              >
                <Calendar className="w-4 h-4" /> Book Table
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
            {/* Contact Details Card */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-6 flex flex-col items-center text-center">
                <div className="flex flex-col items-center">
                  <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-[#e8a33d] mb-3">Address & Route</h3>
                  <div className="flex flex-col items-center gap-3">
                    <MapPin className="w-5 h-5 text-[#e8a33d] flex-shrink-0" />
                    <div>
                      <p className="text-sm text-white font-medium leading-[2.2]">
                        NH248, Near Bhanpur Mode, Village Gunawata, Amer, Kukas, Rajasthan 302038
                      </p>
                      <a
                        href="https://maps.app.goo.gl/uMgo4BpBVjxm4HrWA"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 mt-3 px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-all border border-white/15"
                      >
                        <Navigation className="w-3.5 h-3.5 text-[#e8a33d]" /> Open in Google Maps
                      </a>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 w-full flex flex-col items-center">
                  <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-[#e8a33d] mb-3">Reservations & Inquiries</h3>
                  <div className="space-y-3 flex flex-col items-center">
                    <a
                      href="tel:+919772370490"
                      className="flex flex-col items-center justify-center gap-1.5 text-sm text-white/90 hover:text-[#e8a33d] transition-colors"
                    >
                      <Phone className="w-4 h-4 text-[#e8a33d]" /> +91 97723 70490
                    </a>
                    <a
                      href="mailto:hello@thebagichi.com"
                      className="flex flex-col items-center justify-center gap-1.5 text-sm text-white/90 hover:text-[#e8a33d] transition-colors"
                    >
                      <Mail className="w-4 h-4 text-[#e8a33d]" /> hello@thebagichi.com
                    </a>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 w-full flex flex-col items-center">
                  <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-[#e8a33d] mb-3">Operating Hours</h3>
                  <div className="flex flex-col items-center gap-3">
                    <Clock className="w-4 h-4 text-[#e8a33d] flex-shrink-0" />
                    <div>
                      <p className="text-sm text-white font-medium">Monday to Sunday: 11:00 AM – 11:00 PM</p>
                      <p className="text-xs text-white/60 mt-0.5">Serving lunch, high tea, bonfire dinner & live grills.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 w-full flex flex-col items-center justify-center gap-3">
                  <span className="text-xs text-white/60">Follow Us:</span>
                  <div className="flex gap-2">
                    <a
                      href="https://www.instagram.com/the_bagichi?utm_source=ig_web_button_share_sheet&igsi=ZDNlZDc0MzIxNw=="
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white/10 hover:bg-[#e8a33d] hover:text-black transition-colors"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </a>
                    <a
                      href="https://www.facebook.com/thebagichi"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white/10 hover:bg-[#e8a33d] hover:text-black transition-colors"
                    >
                      <Users className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Highway Perks */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-[#e8a33d] font-bold text-xs uppercase mb-1">Ample Parking</div>
                  <div className="text-[11px] text-white/60">Dedicated spaces for cars & buses</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-[#e8a33d] font-bold text-xs uppercase mb-1">Garden Seating</div>
                  <div className="text-[11px] text-white/60">Lush lawn tables under the stars</div>
                </div>
              </div>
            </div>

            {/* Map Frame */}
            <div className="lg:col-span-7 h-[420px] lg:h-auto min-h-[380px] rounded-2xl overflow-hidden border border-white/15 shadow-2xl relative">
              <iframe
                title="The Bagichi Google Map Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14217.152433022511!2d75.9314917!3d27.0805742!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjfCsDA0JzUwLjEiTiA3NcKwNTYnMjQuOSJF!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full"
              ></iframe>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
}
