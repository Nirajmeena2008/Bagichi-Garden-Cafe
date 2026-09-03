import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  HardDrive, 
  ArrowLeft, 
  FileText, 
  Search, 
  Download, 
  ExternalLink, 
  Eye, 
  Copy, 
  Check, 
  X, 
  RefreshCw,
  Sparkles,
  Calendar,
  UtensilsCrossed,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  DriveFileInfo, 
  formatBookingReceiptText, 
  formatBookingsLedgerText, 
  formatMenuCardText, 
  formatReviewsText, 
  getCachedDriveFiles, 
  fetchDriveFileContent, 
  getStoredFolderInfo,
  DRIVE_FOLDER_NAME
} from '../lib/googleDrive';
import GoogleDriveManager from '../components/GoogleDriveManager';

export default function DriveRecordsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Receipt Lookup
  const [searchResNum, setSearchResNum] = useState('');
  const [foundReceipt, setFoundReceipt] = useState<{ booking: any; text: string } | null>(null);
  const [receiptError, setReceiptError] = useState('');
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [bSnap, mSnap, rSnap, reelSnap] = await Promise.all([
          getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc'))).catch(() => ({ docs: [] })),
          getDocs(query(collection(db, 'menuItems'), orderBy('category'))).catch(() => ({ docs: [] })),
          getDocs(query(collection(db, 'reviews'), orderBy('createdAt', 'desc'))).catch(() => ({ docs: [] })),
          getDocs(query(collection(db, 'featuredReels'), orderBy('createdAt', 'desc'))).catch(() => ({ docs: [] }))
        ]);

        setBookings(bSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setMenuItems(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setReviews(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setReels(reelSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Failed to load records:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSearchReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    setReceiptError('');
    setFoundReceipt(null);

    const clean = searchResNum.trim().toUpperCase();
    if (!clean) return;

    const matched = bookings.find(b => 
      (b.reservationNumber && b.reservationNumber.toUpperCase() === clean) ||
      (b.phone && b.phone.includes(clean))
    );

    if (matched) {
      const text = formatBookingReceiptText(matched);
      setFoundReceipt({ booking: matched, text });
    } else {
      setReceiptError(`No booking found matching "${clean}". Try searching with your reservation code (e.g. BGC-1234) or phone number.`);
    }
  };

  const handleCopyReceipt = () => {
    if (!foundReceipt) return;
    navigator.clipboard.writeText(foundReceipt.text);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  const handleDownloadReceipt = () => {
    if (!foundReceipt) return;
    const blob = new Blob([foundReceipt.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Booking_${foundReceipt.booking.reservationNumber || 'Receipt'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0e0c0a] text-[#f4f2ee] pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#e8a33d]/5 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 space-y-10">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-serif text-white font-bold">
                  Google Drive Database & Records
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8a33d]/10 text-[#e8a33d] border border-[#e8a33d]/20">
                  Live Drive Sync
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/60 mt-1">
                Access restaurant bookings, menu catalogues, and guest sentiments stored in Google Drive in text format.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/booking"
              className="px-4 py-2 rounded-xl bg-[#e8a33d] text-black text-xs font-bold uppercase tracking-wider hover:bg-[#f3b55c] transition-colors"
            >
              Book a Table
            </Link>
            <Link
              to="/admin"
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-xs font-medium transition-colors"
            >
              Admin Portal
            </Link>
          </div>
        </div>

        {/* Quick Receipt Search Box for Guests */}
        <div className="bg-[#171412] border border-[#e8a33d]/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <span className="text-[11px] uppercase tracking-widest text-[#e8a33d] font-bold">
                Guest Self-Service
              </span>
              <h2 className="text-xl font-serif text-white mt-1 mb-2">
                Look up your Google Drive Text Receipt (.txt)
              </h2>
              <p className="text-xs text-white/60 leading-relaxed">
                Enter your Reservation Number (e.g. <span className="text-[#e8a33d] font-mono">BGC-1234</span>) to read your official restaurant database text record right here on the website or download it.
              </p>
            </div>

            <form onSubmit={handleSearchReceipt} className="flex-1 max-w-md w-full flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="e.g. BGC-1234"
                  value={searchResNum}
                  onChange={(e) => setSearchResNum(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/40 focus:border-[#e8a33d] outline-none font-mono uppercase"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#e8a33d] hover:bg-[#f3b55c] text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shrink-0"
              >
                Find Receipt
              </button>
            </form>
          </div>

          {/* Receipt Search Results */}
          {receiptError && (
            <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {receiptError}
            </div>
          )}

          {foundReceipt && (
            <div className="mt-6 p-6 bg-[#0a0908] border border-[#e8a33d]/30 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#e8a33d]/20 border border-[#e8a33d]/40 flex items-center justify-center text-[#e8a33d]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-mono font-bold text-sm">
                      Booking_{foundReceipt.booking.reservationNumber || 'Receipt'}.txt
                    </h3>
                    <p className="text-[11px] text-white/50">
                      Guest: {foundReceipt.booking.name} • Security OTP: {foundReceipt.booking.otp}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyReceipt}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs border border-white/10 transition-colors"
                  >
                    {copiedReceipt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReceipt ? 'Copied' : 'Copy Text'}</span>
                  </button>
                  <button
                    onClick={handleDownloadReceipt}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e8a33d] hover:bg-[#f3b55c] text-black text-xs font-bold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .txt</span>
                  </button>
                </div>
              </div>

              {/* Text Record Viewer */}
              <pre className="p-4 bg-black/60 rounded-lg border border-white/5 font-mono text-xs text-white/90 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                {foundReceipt.text}
              </pre>
            </div>
          )}
        </div>

        {/* Google Drive File Explorer & Sync Hub */}
        <GoogleDriveManager
          bookings={bookings}
          menuItems={menuItems}
          reviews={reviews}
          reels={reels}
          isAdminView={false}
        />
      </div>
    </div>
  );
}
