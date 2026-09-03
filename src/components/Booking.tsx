import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Users, User, Phone, Mail, ArrowLeft, CheckCircle2, FileText, HardDrive, Download, Copy, Check, X, ExternalLink } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { 
  formatBookingReceiptText, 
  syncSingleBookingToDrive, 
  getStoredDriveToken 
} from "../lib/googleDrive";
import { soundManager } from "../lib/soundAlert";

export default function Booking() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ 
    reservationNumber: string; 
    otp: string;
    receiptText?: string;
    driveLink?: string;
    isDriveSynced?: boolean;
  } | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setIsSubmitting(true);
    
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const guests = Number(formData.get("guests") || 2);
    const date = formData.get("date") as string;
    const time = formData.get("time") as string;
    const generatedId = `BGC-${Math.floor(1000 + Math.random() * 9000)}`;
    const generatedOtp = `${Math.floor(100000 + Math.random() * 900000)}`;

    const bookingPayload = {
      reservationNumber: generatedId,
      otp: generatedOtp,
      name,
      email,
      phone,
      guests,
      date,
      time,
      status: "confirmed",
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "bookings"), bookingPayload);
      // Play audible reservation arrival chime
      soundManager.playReservationAlert();
    } catch (err) {
      console.error("Error saving booking to Firestore:", err);
    }

    // Format text receipt according to database text specifications
    const receiptText = formatBookingReceiptText({
      ...bookingPayload,
      createdAt: new Date().toISOString()
    });

    let driveLink = '';
    let isDriveSynced = false;

    // Check if Google Drive access token is available to sync immediately
    const driveToken = getStoredDriveToken();
    if (driveToken) {
      try {
        const driveResult = await syncSingleBookingToDrive(driveToken, bookingPayload);
        driveLink = driveResult.webViewLink;
        isDriveSynced = true;
      } catch (driveErr) {
        console.warn("Could not sync single booking directly to Google Drive:", driveErr);
      }
    }

    setSuccessData({ 
      reservationNumber: generatedId,
      otp: generatedOtp,
      receiptText,
      driveLink,
      isDriveSynced
    });
    form.reset();
    setIsSubmitting(false);
  };

  const handleDownloadReceipt = () => {
    if (!successData?.receiptText) return;
    const blob = new Blob([successData.receiptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Booking_${successData.reservationNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyReceipt = () => {
    if (!successData?.receiptText) return;
    navigator.clipboard.writeText(successData.receiptText);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
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

              {/* Google Drive Database Record Status */}
              <div className="bg-[#171412] border border-[#e8a33d]/30 rounded-xl p-4 max-w-md mx-auto text-left space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-[#e8a33d]" />
                    <span className="text-xs font-semibold text-white">Google Drive Database Record</span>
                  </div>
                  {successData.isDriveSynced ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      Synced to Drive
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e8a33d]/10 text-[#e8a33d] border border-[#e8a33d]/20 font-medium">
                      Text Format (.txt) Ready
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/60 font-mono">
                  Booking_{successData.reservationNumber}.txt (Formatted Database Document)
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setShowReceiptModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e8a33d]/15 hover:bg-[#e8a33d]/25 text-[#e8a33d] rounded-lg text-xs font-medium border border-[#e8a33d]/30 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Read Record on Website
                  </button>
                  <button
                    onClick={handleDownloadReceipt}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg text-xs font-medium border border-white/10 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .txt
                  </button>
                  {successData.driveLink && (
                    <a
                      href={successData.driveLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg text-xs font-medium border border-white/10 transition-colors ml-auto"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#e8a33d]" />
                      Drive
                    </a>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  to={`/manage?id=${successData.reservationNumber}`}
                  className="px-6 py-3 rounded-full bg-[#e8a33d] text-black text-xs uppercase tracking-widest font-bold hover:bg-[#f3b55c] transition-all"
                >
                  Manage & Pre-Order Dishes
                </Link>
                <Link
                  to="/drive-records"
                  className="px-6 py-3 rounded-full bg-white/10 text-white text-xs uppercase tracking-widest font-semibold hover:bg-white/20 transition-colors flex items-center gap-2"
                >
                  <HardDrive className="w-3.5 h-3.5 text-[#e8a33d]" />
                  Browse Drive Database
                </Link>
                <button 
                  onClick={() => setSuccessData(null)}
                  className="px-5 py-3 rounded-full bg-transparent text-white/50 text-xs uppercase tracking-widest font-semibold hover:text-white transition-colors"
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
      {/* Google Drive Text Receipt Modal */}
      <AnimatePresence>
        {showReceiptModal && successData?.receiptText && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#12100e] border border-[#e8a33d]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-6 py-4 bg-[#171412] border-b border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#e8a33d]/10 border border-[#e8a33d]/30 flex items-center justify-center text-[#e8a33d]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-white font-mono font-medium text-sm">
                      Booking_{successData.reservationNumber}.txt
                    </h4>
                    <p className="text-[11px] text-white/50">Google Drive Formatted Text Receipt</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyReceipt}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs border border-white/10 transition-colors flex items-center gap-1.5"
                  >
                    {copiedReceipt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReceipt ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handleDownloadReceipt}
                    className="p-2 rounded-lg bg-[#e8a33d] hover:bg-[#f3b55c] text-black text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => setShowReceiptModal(false)}
                    className="p-2 text-white/50 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-white/90 leading-relaxed bg-[#0a0908]">
                <pre className="whitespace-pre-wrap select-text selection:bg-[#e8a33d] selection:text-black">
                  {successData.receiptText}
                </pre>
              </div>

              <div className="px-6 py-3 bg-[#171412] border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                <span>Stored directly in The Bagichi Google Drive Database</span>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
