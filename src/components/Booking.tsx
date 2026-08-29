import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Users, User, Phone, Mail } from "lucide-react";

export default function Booking() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ reservationNumber: string, otp: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setIsSubmitting(true);
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const responseData = await res.json();
        setSuccessData({ 
          reservationNumber: responseData.booking.reservationNumber,
          otp: responseData.booking.otp
        });
        form.reset();
      }
    } catch (error) {
      console.error("Booking failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="booking" className="py-24 relative bg-[#2D3326]">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#C5A059 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-[#fdfdfb] rounded-3xl p-8 md:p-12 shadow-2xl border border-[#5A5A40]/10">
          <div className="text-center mb-10 flex flex-col items-center">
            <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-[#5A5A40] mb-4">
              Reservations
            </h2>
            <h3 className="text-3xl md:text-4xl font-serif text-[#141414] mb-4">
              Reserve Your Table
            </h3>
            <div className="w-16 h-px bg-[#5A5A40]/30 mx-auto mb-4"></div>
            <p className="text-[#5A5A40]/80 font-light max-w-lg">
              Join us for an unforgettable dining experience under the stars.
            </p>
          </div>

          {successData ? (
            <div className="p-8 bg-[#5A5A40]/5 border border-[#5A5A40]/20 rounded-xl text-center space-y-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-[#5A5A40]/10 mb-4">
                <Calendar className="w-8 h-8 text-[#C5A059]" />
              </div>
              <h4 className="text-2xl font-serif text-[#141414]">Reservation Confirmed</h4>
              <p className="text-sm text-[#5A5A40]/80">We look forward to hosting you at The Bagichi.</p>
              <div className="pt-4 pb-2">
                <p className="text-[10px] uppercase tracking-widest text-[#5A5A40] font-bold mb-1">Your Reservation Number</p>
                <div className="text-3xl font-mono tracking-widest text-[#141414] font-bold">{successData.reservationNumber}</div>
              </div>
              <div className="pb-2">
                <p className="text-[10px] uppercase tracking-widest text-[#5A5A40] font-bold mb-1">Verification OTP</p>
                <div className="text-xl font-mono tracking-widest text-[#141414] font-bold">{successData.otp}</div>
              </div>
              <p className="text-xs text-[#5A5A40]/60 italic mb-6">Please save these details to manage your booking later.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to={`/manage?id=${successData.reservationNumber}`}
                  className="px-6 py-3 rounded-full bg-[#141414] text-white text-xs uppercase tracking-widest font-bold hover:bg-[#5A5A40] transition-all"
                >
                  Manage this Booking
                </Link>
                <button 
                  onClick={() => setSuccessData(null)}
                  className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] hover:text-[#C5A059] transition-colors"
                >
                  Book Another Table
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-semibold text-[#5A5A40] flex items-center gap-2">
                  <User className="w-4 h-4 text-[#5A5A40]/60" /> Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[#5A5A40]/20 focus:ring-1 focus:ring-[#5A5A40] focus:border-[#5A5A40] transition-all outline-none bg-white text-[#141414] text-sm"
                  placeholder="John Doe"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-semibold text-[#5A5A40] flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#5A5A40]/60" /> Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[#5A5A40]/20 focus:ring-1 focus:ring-[#5A5A40] focus:border-[#5A5A40] transition-all outline-none bg-white text-[#141414] text-sm"
                  placeholder="john@example.com"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-semibold text-[#5A5A40] flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#5A5A40]/60" /> Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[#5A5A40]/20 focus:ring-1 focus:ring-[#5A5A40] focus:border-[#5A5A40] transition-all outline-none bg-white text-[#141414] text-sm"
                  placeholder="+91 98765 43210"
                />
              </div>

              {/* Guests */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-semibold text-[#5A5A40] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#5A5A40]/60" /> Number of Guests
                </label>
                <select
                  name="guests"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[#5A5A40]/20 focus:ring-1 focus:ring-[#5A5A40] focus:border-[#5A5A40] transition-all outline-none bg-white text-[#141414] text-sm"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, "9+"].map((num) => (
                    <option key={num} value={num === "9+" ? 10 : num}>
                      {num} {num === 1 ? "Person" : "People"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-semibold text-[#5A5A40] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#5A5A40]/60" /> Date
                </label>
                <input
                  type="date"
                  name="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-3 rounded-xl border border-[#5A5A40]/20 focus:ring-1 focus:ring-[#5A5A40] focus:border-[#5A5A40] transition-all outline-none bg-white text-[#141414] text-sm"
                />
              </div>

              {/* Time */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-semibold text-[#5A5A40] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#5A5A40]/60" /> Time
                </label>
                <input
                  type="time"
                  name="time"
                  required
                  min="11:00"
                  max="23:00"
                  className="w-full px-4 py-3 rounded-xl border border-[#5A5A40]/20 focus:ring-1 focus:ring-[#5A5A40] focus:border-[#5A5A40] transition-all outline-none bg-white text-[#141414] text-sm"
                />
                <p className="text-[10px] uppercase tracking-wider text-[#141414]/60 font-semibold">Open 11:00 AM - 11:00 PM</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#5A5A40] hover:bg-[#4a4a35] text-white text-xs uppercase tracking-widest font-bold py-4 rounded-xl transition-all shadow-lg shadow-[#5A5A40]/20 mt-8 flex justify-center items-center"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                "Confirm Reservation"
              )}
            </button>
          </form>
          )}
        </div>
      </div>
    </section>
  );
}
