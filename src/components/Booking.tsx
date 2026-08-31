import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Users, User, Phone, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export default function Booking() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ reservationNumber: string, otp: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setIsSubmitting(true);
    
    // Simulate API delay & booking creation
    setTimeout(() => {
      const generatedId = `BGC-${Math.floor(1000 + Math.random() * 9000)}`;
      const generatedOtp = `${Math.floor(100000 + Math.random() * 900000)}`;
      setSuccessData({ 
        reservationNumber: generatedId,
        otp: generatedOtp
      });
      form.reset();
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <section id="booking" className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full flex flex-col justify-center">
      {/* Top Header */}
      <div className="flex flex-col items-center justify-center gap-6 mb-12 text-center">
        <div>
          <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-[#e8a33d] mb-3">
            Table Reservations
          </h2>
          <h1 className="text-3xl sm:text-4xl font-serif text-white mb-6">
            Book Your Experience
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
            to="/manage"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold uppercase tracking-wider hover:bg-white/20 transition-all shadow-lg"
          >
            Manage Booking →
          </Link>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 sm:p-10 shadow-2xl border border-white/10 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#e8a33d]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-12 flex flex-col items-center">
          <p className="text-white/60 text-sm font-light max-w-md">
            Join us for an exquisite outdoor dining experience under the starlit Rajasthan sky. Select your date and time below.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {successData ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 bg-black/40 border border-white/10 rounded-2xl text-center space-y-4"
            >
              <div className="w-14 h-14 bg-[#e8a33d]/20 border border-[#e8a33d]/30 rounded-full flex items-center justify-center mx-auto text-[#e8a33d]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-serif text-white">Table Reserved Successfully!</h3>
              <p className="text-xs text-white/70">Your booking request has been confirmed at The Bagichi.</p>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 my-4 max-w-sm mx-auto">
                <div className="pb-3 border-b border-white/10">
                  <p className="text-[10px] uppercase tracking-widest text-[#e8a33d] font-bold mb-1">Reservation Number</p>
                  <div className="text-2xl font-mono tracking-widest text-white font-bold">{successData.reservationNumber}</div>
                </div>
                <div className="pt-3">
                  <p className="text-[10px] uppercase tracking-widest text-[#e8a33d] font-bold mb-1">Management Passcode</p>
                  <div className="text-lg font-mono tracking-widest text-white font-semibold">{successData.otp}</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  to={`/manage?id=${successData.reservationNumber}`}
                  className="px-6 py-3 rounded-full bg-[#e8a33d] text-black text-xs uppercase tracking-widest font-bold hover:bg-[#f3b55c] transition-all"
                >
                  Manage & Pre-Order Dishes
                </Link>
                <button 
                  onClick={() => setSuccessData(null)}
                  className="px-6 py-3 rounded-full bg-white/10 text-white text-xs uppercase tracking-widest font-semibold hover:bg-white/20 transition-colors"
                >
                  Book Another Table
                </button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1.5 flex flex-col items-center">
                  <label className="text-xs uppercase tracking-wider font-semibold text-[#e8a33d] flex items-center justify-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 focus:ring-1 focus:ring-[#e8a33d] focus:border-[#e8a33d] transition-all outline-none bg-black/40 text-white text-sm text-center"
                    placeholder="E.g. Vikram Sharma"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5 flex flex-col items-center">
                  <label className="text-xs uppercase tracking-wider font-semibold text-[#e8a33d] flex items-center justify-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 focus:ring-1 focus:ring-[#e8a33d] focus:border-[#e8a33d] transition-all outline-none bg-black/40 text-white text-sm text-center"
                    placeholder="vikram@example.com"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5 flex flex-col items-center">
                  <label className="text-xs uppercase tracking-wider font-semibold text-[#e8a33d] flex items-center justify-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 focus:ring-1 focus:ring-[#e8a33d] focus:border-[#e8a33d] transition-all outline-none bg-black/40 text-white text-sm text-center"
                    placeholder="+91 98765 43210"
                  />
                </div>

                {/* Guests */}
                <div className="space-y-1.5 flex flex-col items-center">
                  <label className="text-xs uppercase tracking-wider font-semibold text-[#e8a33d] flex items-center justify-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Number of Guests
                  </label>
                  <select
                    name="guests"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 focus:ring-1 focus:ring-[#e8a33d] focus:border-[#e8a33d] transition-all outline-none bg-[#171412] text-white text-sm text-center"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 10, 15, 20].map((num) => (
                      <option key={num} value={num} className="bg-[#171412] text-white text-center">
                        {num} {num === 1 ? "Guest" : "Guests"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="space-y-1.5 flex flex-col items-center">
                  <label className="text-xs uppercase tracking-wider font-semibold text-[#e8a33d] flex items-center justify-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 focus:ring-1 focus:ring-[#e8a33d] focus:border-[#e8a33d] transition-all outline-none bg-black/40 text-white text-sm text-center"
                  />
                </div>

                {/* Time */}
                <div className="space-y-1.5 flex flex-col items-center">
                  <label className="text-xs uppercase tracking-wider font-semibold text-[#e8a33d] flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Preferred Time
                  </label>
                  <input
                    type="time"
                    name="time"
                    required
                    defaultValue="19:30"
                    min="11:00"
                    max="23:00"
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 focus:ring-1 focus:ring-[#e8a33d] focus:border-[#e8a33d] transition-all outline-none bg-black/40 text-white text-sm text-center"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#e8a33d] hover:bg-[#f3b55c] text-black text-xs uppercase tracking-widest font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[#e8a33d]/20 mt-4 flex justify-center items-center gap-2"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black"></div>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    Confirm Table Reservation
                  </>
                )}
              </button>
            </form>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
