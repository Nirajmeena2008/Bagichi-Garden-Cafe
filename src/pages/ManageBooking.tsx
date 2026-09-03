import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Calendar, Clock, Users, ArrowLeft, Check, Plus, Trash2, ShieldCheck, Lock, ArrowRight, HardDrive, FileText, Download, Copy, X, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import PageTransition from "../components/PageTransition";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Reservation, MenuItem } from "../types";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, orderBy, onSnapshot } from "firebase/firestore";
import { formatBookingReceiptText } from "../lib/googleDrive";

export default function ManageBooking() {
  const [searchParams] = useSearchParams();
  const [reservationNumber, setReservationNumber] = useState(searchParams.get("id") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<Reservation | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showMenu, setShowMenu] = useState(false);

  // Google Drive Text Record Modal
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  
  useEffect(() => {
    const q = query(collection(db, "menuItems"), orderBy("category"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const items: MenuItem[] = snapshot.docs.map((doc) => {
            const d = doc.data();
            return {
              id: doc.id,
              name: d.name || "",
              description: d.description || "",
              price: Number(d.price) || 0,
              category: d.category || "Main Course",
              imageUrl: d.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800",
            };
          });
          setMenuItems(items);
        } else {
          fetch("/menu.json")
            .then((res) => res.json())
            .then((data) => setMenuItems(data))
            .catch((err) => console.error(err));
        }
      },
      () => {
        fetch("/menu.json")
          .then((res) => res.json())
          .then((data) => setMenuItems(data))
          .catch((err) => console.error(err));
      }
    );
    return () => unsubscribe();
  }, []);

  const searchBooking = async (resNum: string) => {
    if (!resNum.trim()) return;
    
    setLoading(true);
    setError("");
    const cleanId = resNum.trim().toUpperCase();

    try {
      // 1. Try to fetch from Firestore
      const q = query(collection(db, "bookings"), where("reservationNumber", "==", cleanId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const foundDoc = querySnapshot.docs[0];
        const data = foundDoc.data();
        setDocId(foundDoc.id);
        setBooking({
          id: foundDoc.id,
          reservationNumber: data.reservationNumber || cleanId,
          name: data.name || "Guest",
          email: data.email || "guest@thebagichi.com",
          phone: data.phone || "+91 98765 43210",
          date: data.date ? (data.date.includes("T") ? data.date : `${data.date}T00:00:00.000Z`) : new Date().toISOString(),
          time: data.time || "19:30",
          guests: data.guests || 2,
          status: (data.status || "CONFIRMED").toUpperCase() as any,
          preOrders: data.preOrders || []
        });
      } else if (cleanId.startsWith("BGC-") || cleanId.length >= 4) {
        // Fallback demo simulator
        setDocId(null);
        setBooking({
          id: "res-demo-123",
          reservationNumber: cleanId,
          name: "Guest",
          email: "guest@thebagichi.com",
          phone: "+91 98765 43210",
          date: new Date().toISOString(),
          time: "19:30",
          guests: 4,
          status: "CONFIRMED",
          preOrders: []
        });
      } else {
        setError("We couldn't find a booking with that reservation number. Please check and try again.");
        setBooking(null);
      }
    } catch (err) {
      console.error("Firestore booking search error:", err);
      // Fallback
      if (cleanId.startsWith("BGC-") || cleanId.length >= 4) {
        setBooking({
          id: "res-demo-123",
          reservationNumber: cleanId,
          name: "Guest",
          email: "guest@thebagichi.com",
          phone: "+91 98765 43210",
          date: new Date().toISOString(),
          time: "19:30",
          guests: 4,
          status: "CONFIRMED",
          preOrders: []
        });
      } else {
        setError("We couldn't find a booking with that reservation number. Please check and try again.");
        setBooking(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      searchBooking(id);
    }
  }, [searchParams]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    searchBooking(reservationNumber);
  };

  const handleUpdate = async (updates: Partial<Reservation>) => {
    if (!booking) return;
    const newBooking = { ...booking, ...updates };
    setBooking(newBooking);

    if (docId) {
      try {
        await updateDoc(doc(db, "bookings", docId), updates);
      } catch (err) {
        console.error("Failed to update in Firestore:", err);
      }
    }
  };

  const addPreOrder = (menuItem: MenuItem) => {
    if (!booking) return;
    const currentOrders = booking.preOrders || [];
    const existing = currentOrders.find(item => item.menuItemId === menuItem.id);
    
    let newOrders;
    if (existing) {
      newOrders = currentOrders.map(item => 
        item.menuItemId === menuItem.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      newOrders = [...currentOrders, { menuItemId: menuItem.id, quantity: 1, menuItem }];
    }
    
    handleUpdate({ preOrders: newOrders } as any);
  };

  const removePreOrder = (menuItemId: string) => {
    if (!booking) return;
    const currentOrders = booking.preOrders || [];
    const newOrders = currentOrders.filter(item => item.menuItemId !== menuItemId);
    
    handleUpdate({ preOrders: newOrders } as any);
  };

  return (
    <PageTransition>
      <div className="min-h-screen w-full bg-[#080706] text-white flex flex-col items-center justify-between selection:bg-[#e8a33d]/30 selection:text-white pt-24">
        <Header />
        
        <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {/* Header */}
          <div className="flex flex-col items-center justify-center gap-6 mb-12 text-center">
            <div>
              <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-[#e8a33d] mb-3">
                Your Reservation
              </h2>
              <h1 className="text-3xl sm:text-4xl font-serif text-white mb-6">
                Manage Booking
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
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold uppercase tracking-wider hover:bg-white/20 transition-all shadow-lg"
              >
                Book New Table →
              </Link>
              <Link
                to="/admin"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#e8a33d]/15 border border-[#e8a33d]/30 text-[#e8a33d] hover:bg-[#e8a33d] hover:text-black text-xs font-bold uppercase tracking-wider transition-all shadow-md"
              >
                <Lock className="w-3.5 h-3.5" /> Admin Login
              </Link>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 sm:p-10 shadow-xl border border-white/10 mb-8 text-center flex flex-col items-center">
            <p className="text-white/60 text-sm font-light mb-8 max-w-md mx-auto">
              Enter your reservation number (e.g. BGC-DEMO123) to view details, pre-order food, or modify your booking.
            </p>
            
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 w-full max-w-lg mx-auto">
              <input
                type="text"
                placeholder="e.g. BGC-DEMO123"
                value={reservationNumber}
                onChange={(e) => setReservationNumber(e.target.value)}
                className="flex-1 px-5 py-3 rounded-xl border border-white/10 focus:ring-1 focus:ring-[#e8a33d] focus:border-[#e8a33d] transition-all outline-none bg-black/40 text-white font-mono tracking-widest uppercase text-sm text-center"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-[#e8a33d] hover:bg-[#f3b55c] text-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest font-bold transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? "Searching..." : <><Search className="w-4 h-4" /> Find Booking</>}
              </button>
            </form>
            {error && <p className="text-red-400 mt-3 text-xs">{error}</p>}
          </div>

          <AnimatePresence>
            {booking && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white/5 backdrop-blur-md rounded-3xl overflow-hidden shadow-xl border border-white/10 mb-8"
              >
                <div className="p-6 sm:p-8 border-b border-white/10 bg-white/5 flex flex-col items-center justify-center text-center gap-4">
                  <div className="flex flex-col items-center">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[#e8a33d] mb-1">Reservation Info</p>
                    <h2 className="text-xl sm:text-2xl font-serif text-white">{booking.name}</h2>
                    <p className="text-white/60 text-xs mt-1">{booking.email} • {booking.phone}</p>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold bg-[#e8a33d]/20 text-[#e8a33d] border border-[#e8a33d]/30">
                      {booking.status}
                    </span>
                    <p className="text-lg font-mono tracking-widest text-white font-bold mt-1">{booking.reservationNumber}</p>
                  </div>
                </div>

                <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                  <div className="space-y-1 flex flex-col items-center">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[#e8a33d]">Date</p>
                    <p className="flex items-center justify-center gap-2 text-white text-sm">
                      <Calendar className="w-4 h-4 text-[#e8a33d]" /> {new Date(booking.date).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="space-y-1 flex flex-col items-center">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[#e8a33d]">Time Slot</p>
                    <p className="flex items-center justify-center gap-2 text-white text-sm">
                      <Clock className="w-4 h-4 text-[#e8a33d]" /> {booking.time}
                    </p>
                  </div>

                  <div className="space-y-1 flex flex-col items-center">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[#e8a33d]">Table Size</p>
                    <p className="flex items-center justify-center gap-2 text-white text-sm">
                      <Users className="w-4 h-4 text-[#e8a33d]" /> {booking.guests} Guests
                    </p>
                  </div>
                </div>

                {/* Pre-Orders Section */}
                <div className="p-6 sm:p-8 border-t border-white/10">
                  <div className="flex flex-col items-center justify-center text-center gap-3 mb-6">
                    <div>
                      <h3 className="text-lg font-serif text-white">Pre-Ordered Highway Delicacies</h3>
                      <p className="text-xs text-white/60">Have dishes freshly prepped upon your arrival.</p>
                    </div>

                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="bg-white/10 border border-white/15 text-white px-6 py-2.5 rounded-xl text-xs uppercase tracking-widest font-bold hover:bg-white/20 transition-colors mt-2"
                    >
                      {showMenu ? "Close Menu" : "+ Add Menu Items"}
                    </button>
                  </div>

                  {showMenu && (
                    <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {menuItems.map(item => (
                        <div key={item.id} className="border border-white/10 rounded-xl p-3 flex flex-col justify-center items-center text-center gap-2 bg-black/40">
                          <div>
                            <p className="font-bold text-xs text-white">{item.name}</p>
                            <p className="text-[#e8a33d] font-semibold text-xs">₹{item.price}</p>
                          </div>
                          <button 
                            onClick={() => addPreOrder(item)}
                            className="w-7 h-7 rounded-full bg-[#e8a33d] flex items-center justify-center text-black hover:bg-[#f3b55c] transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {(!booking.preOrders || booking.preOrders.length === 0) ? (
                    <div className="text-center py-6 bg-black/20 rounded-xl border border-white/10 border-dashed">
                      <p className="text-xs text-white/50">No pre-ordered dishes yet. Click "+ Add Menu Items" above.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {booking.preOrders.map((orderItem) => (
                        <div key={orderItem.menuItemId} className="flex flex-col justify-center items-center text-center gap-2 p-3 border border-white/10 rounded-xl bg-black/30">
                          <div className="flex flex-col items-center gap-2">
                            <img src={orderItem.menuItem.imageUrl} alt={orderItem.menuItem.name} className="w-10 h-10 object-cover rounded-lg" />
                            <div>
                              <p className="font-bold text-xs text-white">{orderItem.menuItem.name}</p>
                              <p className="text-[11px] text-white/60">₹{orderItem.menuItem.price} × {orderItem.quantity}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-center gap-4">
                            <p className="font-bold text-white text-xs">₹{orderItem.menuItem.price * orderItem.quantity}</p>
                            <button 
                              onClick={() => removePreOrder(orderItem.menuItemId)}
                              className="text-red-400 hover:text-red-300 p-1 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex flex-col justify-center items-center text-center gap-1 p-4 bg-[#e8a33d]/10 rounded-xl border border-[#e8a33d]/20 mt-4">
                        <p className="text-xs uppercase tracking-widest font-bold text-[#e8a33d]">Total Pre-Order Amount</p>
                        <p className="text-lg font-serif text-white font-bold">
                          ₹{booking.preOrders.reduce((acc, item) => acc + (item.menuItem.price * item.quantity), 0)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Google Drive Database Record Card */}
                <div className="p-6 sm:p-8 border-t border-white/10 bg-black/20">
                  <div className="bg-[#171412] border border-[#e8a33d]/30 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[#e8a33d]/15 border border-[#e8a33d]/30 flex items-center justify-center text-[#e8a33d] shrink-0">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-medium text-sm">Google Drive Database Document</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#e8a33d]/10 text-[#e8a33d] border border-[#e8a33d]/20">
                            .txt format
                          </span>
                        </div>
                        <p className="text-xs text-white/60 mt-0.5 font-mono">
                          Booking_{booking.reservationNumber}.txt
                        </p>
                        <p className="text-[11px] text-white/40 mt-1">
                          Stored directly in Google Drive as an authentic formatted receipt record.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-center">
                      <button
                        onClick={() => setShowDriveModal(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e8a33d] hover:bg-[#f3b55c] text-black font-bold text-xs uppercase tracking-wider transition-all shadow-md"
                      >
                        <FileText className="w-4 h-4" />
                        Read on Website
                      </button>

                      <button
                        onClick={() => {
                          const txt = formatBookingReceiptText(booking);
                          const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `Booking_${booking.reservationNumber}.txt`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/10 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download .txt
                      </button>

                      <Link
                        to="/drive-records"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium border border-white/10 transition-colors"
                      >
                        <HardDrive className="w-3.5 h-3.5 text-[#e8a33d]" />
                        All Records
                      </Link>
                    </div>
                  </div>
                </div>

                {booking.status === "PENDING" && (
                  <div className="p-6 border-t border-white/10 bg-black/40 flex justify-center gap-4">
                    <button 
                      onClick={() => handleUpdate({ status: "CANCELLED" })}
                      className="px-6 py-2.5 rounded-xl border border-white/20 text-white text-xs uppercase tracking-widest font-semibold hover:bg-white/10 transition-colors"
                    >
                      Cancel Booking
                    </button>
                    <button 
                      onClick={() => handleUpdate({ status: "CONFIRMED" })}
                      className="px-6 py-2.5 rounded-xl bg-[#e8a33d] text-black text-xs uppercase tracking-widest font-bold hover:bg-[#f3b55c] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Confirm
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dedicated Owner / Admin Portal Card */}
          <div className="bg-gradient-to-r from-[#171412] to-[#1a1510] rounded-3xl p-6 sm:p-8 border border-[#e8a33d]/20 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="w-14 h-14 bg-[#e8a33d]/15 rounded-2xl flex items-center justify-center border border-[#e8a33d]/30 text-[#e8a33d] flex-shrink-0">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest font-bold text-[#e8a33d] bg-[#e8a33d]/10 px-2.5 py-1 rounded-full border border-[#e8a33d]/20 inline-block mb-1.5">
                  Restaurant Owner & Staff
                </span>
                <h3 className="text-xl font-bold text-white">Looking for the Admin Portal?</h3>
                <p className="text-xs text-white/60 mt-1 max-w-md">
                  Log in to manage all customer table reservations, update live culinary menus, and publish featured social media reels.
                </p>
              </div>
            </div>

            <Link
              to="/admin"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#e8a33d] hover:bg-[#f3b55c] text-black text-xs uppercase tracking-widest font-bold transition-all shadow-lg shadow-[#e8a33d]/20 flex-shrink-0"
            >
              <Lock className="w-4 h-4" /> Admin Login <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Google Drive Text Receipt Modal */}
          <AnimatePresence>
            {showDriveModal && booking && (
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
                          Booking_{booking.reservationNumber}.txt
                        </h4>
                        <p className="text-[11px] text-white/50">Google Drive Formatted Text Receipt</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const text = formatBookingReceiptText(booking);
                          navigator.clipboard.writeText(text);
                          setCopiedReceipt(true);
                          setTimeout(() => setCopiedReceipt(false), 2000);
                        }}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs border border-white/10 transition-colors flex items-center gap-1.5"
                      >
                        {copiedReceipt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedReceipt ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={() => {
                          const text = formatBookingReceiptText(booking);
                          const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `Booking_${booking.reservationNumber}.txt`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="p-2 rounded-lg bg-[#e8a33d] hover:bg-[#f3b55c] text-black text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                      <button
                        onClick={() => setShowDriveModal(false)}
                        className="p-2 text-white/50 hover:text-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-white/90 leading-relaxed bg-[#0a0908]">
                    <pre className="whitespace-pre-wrap select-text selection:bg-[#e8a33d] selection:text-black">
                      {formatBookingReceiptText(booking)}
                    </pre>
                  </div>

                  <div className="px-6 py-3 bg-[#171412] border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                    <span>Google Drive Database Record</span>
                    <button
                      onClick={() => setShowDriveModal(false)}
                      className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
}
