import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useParams, useNavigate, Link } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ZomatoOrder, OrderStatus } from "../types";
import { getOrderById, searchOrders, printKotTicket } from "../lib/zomatoService";
import { downloadKotPdfLocally, saveKotPdfToGoogleDrive } from "../lib/kotPdfService";
import { getStoredDriveToken, initiateDriveAuth } from "../lib/googleDrive";
import { soundManager } from "../lib/soundAlert";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PageTransition from "../components/PageTransition";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingBag, 
  Clock, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  ChefHat, 
  Bike, 
  FileText, 
  Download, 
  Printer, 
  ArrowRight, 
  Search, 
  ExternalLink, 
  Sparkles, 
  RefreshCw, 
  Check, 
  AlertCircle,
  HelpCircle,
  Utensils
} from "lucide-react";

export default function OrderTrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { orderId: paramOrderId } = useParams<{ orderId?: string }>();
  const navigate = useNavigate();

  const queryOrderId = paramOrderId || searchParams.get("orderId") || searchParams.get("id");

  const [order, setOrder] = useState<ZomatoOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<ZomatoOrder[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  // Drive saving state
  const [isSavingDrive, setIsSavingDrive] = useState<boolean>(false);
  const [driveSaveMessage, setDriveSaveMessage] = useState<string | null>(null);

  // Status tracking sound & change detection
  const prevStatusRef = useRef<OrderStatus | null>(null);

  // Load recent orders from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("thebagichi_order_history");
      if (stored) {
        setRecentOrders(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Could not load local order history:", e);
    }
  }, []);

  // Subscribe to real-time Firestore updates if an orderId is active
  useEffect(() => {
    if (!queryOrderId) {
      // Check if we have a last order stored
      const lastId = localStorage.getItem("thebagichi_last_order_id");
      if (lastId) {
        setSearchParams({ orderId: lastId });
      } else {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    const orderDocRef = doc(db, "zomatoOrders", queryOrderId);
    const unsub = onSnapshot(
      orderDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...(docSnap.data() as any) } as ZomatoOrder;
          setOrder(data);

          // If status upgraded in real time, play celebratory alert
          if (prevStatusRef.current && prevStatusRef.current !== data.status) {
            soundManager.playOrderAlert();
          }
          prevStatusRef.current = data.status;
        } else {
          setOrder(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error subscribing to order tracking:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [queryOrderId, setSearchParams]);

  // Handle Search
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    try {
      const results = await searchOrders(searchQuery.trim());
      setSearchResults(results);
      if (results.length === 1) {
        // Auto select if only one match
        setSearchParams({ orderId: results[0].id });
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Save KOT to Drive
  const handleSaveKotToDrive = async () => {
    if (!order) return;
    setIsSavingDrive(true);
    setDriveSaveMessage(null);

    const token = getStoredDriveToken();
    if (!token) {
      initiateDriveAuth(
        async () => {
          try {
            const res = await saveKotPdfToGoogleDrive(order);
            setIsSavingDrive(false);
            if (res.success) {
              setDriveSaveMessage("KOT PDF successfully saved to Google Drive 'kot' folder!");
              if (res.fileInfo?.webViewLink) {
                setOrder((prev) => prev ? { ...prev, kotDrivePdfUrl: res.fileInfo?.webViewLink } : null);
              }
            } else {
              setDriveSaveMessage(res.error || "Failed to upload KOT PDF to Drive.");
            }
          } catch (e: any) {
            setIsSavingDrive(false);
            setDriveSaveMessage(e?.message || "Failed to upload.");
          }
        },
        () => {
          setIsSavingDrive(false);
          setDriveSaveMessage("Google Drive authorization was cancelled.");
        }
      );
    } else {
      try {
        const res = await saveKotPdfToGoogleDrive(order);
        setIsSavingDrive(false);
        if (res.success) {
          setDriveSaveMessage("KOT PDF successfully saved to Google Drive 'kot' folder!");
          if (res.fileInfo?.webViewLink) {
            setOrder((prev) => prev ? { ...prev, kotDrivePdfUrl: res.fileInfo?.webViewLink } : null);
          }
        } else {
          setDriveSaveMessage(res.error || "Failed to upload KOT PDF to Drive.");
        }
      } catch (e: any) {
        setIsSavingDrive(false);
        setDriveSaveMessage(e?.message || "Failed to upload.");
      }
    }
  };

  // Stages configuration
  const stages: {
    status: OrderStatus;
    title: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      status: "PLACED",
      title: "Order Placed & Confirmed",
      description: "Received by restaurant POS and verified.",
      icon: <CheckCircle2 className="w-5 h-5" />
    },
    {
      status: "ACCEPTED",
      title: "KOT Sent to Kitchen",
      description: `Official KOT ticket #${order?.kotNumber || 'GENERATED'} printed for head chef.`,
      icon: <FileText className="w-5 h-5" />
    },
    {
      status: "IN_PREPARATION",
      title: "Chefs Preparing Fresh",
      description: "Dishes are cooking on traditional tandoor & curries.",
      icon: <ChefHat className="w-5 h-5" />
    },
    {
      status: "FOOD_READY",
      title: "Food Ready & Quality Checked",
      description: "Packed hot with fresh condiments, ready for pickup.",
      icon: <Sparkles className="w-5 h-5" />
    },
    {
      status: "DISPATCHED",
      title: order?.channel === 'DINE_IN' ? "Served at Table" : order?.channel === 'TAKEAWAY' ? "Ready for Customer Pickup" : "Out for Delivery",
      description: order?.channel === 'DINE_IN' ? "Enjoy your meal in the garden dining area!" : "En route to your location with delivery fleet.",
      icon: <Bike className="w-5 h-5" />
    }
  ];

  const getStageIndex = (currentStatus?: OrderStatus) => {
    switch (currentStatus) {
      case "PLACED": return 0;
      case "ACCEPTED": return 1;
      case "IN_PREPARATION": return 2;
      case "FOOD_READY": return 3;
      case "DISPATCHED": return 4;
      case "CANCELLED": return -1;
      default: return 0;
    }
  };

  const currentStageIndex = getStageIndex(order?.status);

  return (
    <PageTransition>
      <div className="min-h-screen w-full bg-[#080706] text-white flex flex-col justify-between selection:bg-[#e8a33d]/30 selection:text-white pt-24 pb-12">
        <Header />

        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6">
          {/* Top Bar Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e8a33d]/10 border border-[#e8a33d]/20 text-[#e8a33d] text-xs font-bold uppercase tracking-wider mb-2">
              <Clock className="w-3.5 h-3.5" />
              <span>Real-Time Kitchen Sync</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Live Order &amp; KOT Tracking
            </h1>
            <p className="text-xs sm:text-sm text-white/60 max-w-xl mx-auto mt-2">
              Track live chef preparation progress, view your Kitchen Order Ticket (KOT), and follow your order right to your doorstep or table.
            </p>
          </div>

          {/* Quick Order Lookup Bar */}
          <div className="bg-[#14100d] border border-white/10 rounded-2xl p-4 mb-8 shadow-xl max-w-2xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Track by Order # (e.g. BAG-8942) or 10-digit Mobile"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#e8a33d] transition-all font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#e8a33d] hover:bg-[#f3b55c] text-black font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {isSearching ? "Searching..." : "Track"}
              </button>
            </form>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                <p className="text-[11px] text-white/50 font-semibold">Found Orders:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {searchResults.map((res) => (
                    <button
                      key={res.id}
                      onClick={() => {
                        setSearchParams({ orderId: res.id });
                        setSearchResults([]);
                      }}
                      className="p-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-[#e8a33d] text-left transition-all group flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-mono font-bold text-white group-hover:text-[#e8a33d]">
                          {res.orderNumber} <span className="text-[10px] text-[#e8a33d]">({res.kotNumber})</span>
                        </p>
                        <p className="text-[11px] text-white/60">{res.customerName} • ₹{res.totalAmount}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-white/40 group-hover:text-[#e8a33d] transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="bg-[#14100d] border border-white/10 rounded-3xl p-12 text-center text-white/60">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-[#e8a33d]" />
              <p className="text-sm font-semibold">Connecting to Kitchen POS and fetching live order state...</p>
            </div>
          ) : !order ? (
            /* No active order found */
            <div className="bg-[#14100d] border border-white/10 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">No Order Found</h3>
              <p className="text-xs text-white/60 mt-1 max-w-sm mx-auto">
                Please enter your Order Number or phone number in the search box above to view your real-time status.
              </p>

              {/* Recent local orders */}
              {recentOrders.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10 text-left">
                  <p className="text-xs font-bold text-white/80 uppercase tracking-wider mb-3">Your Recent Orders:</p>
                  <div className="space-y-2">
                    {recentOrders.map((rec) => (
                      <button
                        key={rec.id}
                        onClick={() => setSearchParams({ orderId: rec.id })}
                        className="w-full p-3 rounded-xl bg-black/40 border border-white/10 hover:border-[#e8a33d] flex items-center justify-between text-left transition-all"
                      >
                        <div>
                          <p className="text-xs font-mono font-bold text-white">
                            {rec.orderNumber} <span className="text-[#e8a33d]">({rec.kotNumber || 'KOT'})</span>
                          </p>
                          <p className="text-[11px] text-white/50">{rec.customerName || 'Customer'} • ₹{rec.totalAmount}</p>
                        </div>
                        <span className="text-xs font-bold text-[#e8a33d] flex items-center gap-1">
                          Track <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <Link
                  to="/order"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#e8a33d] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#f3b55c] transition-all"
                >
                  <Utensils className="w-4 h-4" />
                  Order Food Now
                </Link>
              </div>
            </div>
          ) : (
            /* ACTIVE ORDER FOUND - COMPLETE DASHBOARD */
            <div className="space-y-6">
              {/* Order Status Banner & Live Progress */}
              <div className="bg-[#14100d] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#e8a33d]/20 text-[#e8a33d] text-xs font-mono font-black">
                        {order.kotNumber || 'KOT TICKET'}
                      </span>
                      <span className="text-xs font-mono text-white/50">
                        Order #{order.orderNumber}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      Status:{" "}
                      <span className={
                        order.status === 'CANCELLED' ? 'text-red-400' :
                        order.status === 'DISPATCHED' ? 'text-emerald-400' :
                        order.status === 'FOOD_READY' ? 'text-emerald-400' :
                        'text-[#e8a33d]'
                      }>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadKotPdfLocally(order)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#e8a33d]" />
                      <span>KOT 80mm PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => printKotTicket(order)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#e8a33d]/15 hover:bg-[#e8a33d]/25 border border-[#e8a33d]/30 text-[#e8a33d] text-xs font-bold transition-all cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Slip</span>
                    </button>
                  </div>
                </div>

                {/* Stepper Pipeline */}
                {order.status !== 'CANCELLED' ? (
                  <div className="py-8">
                    {/* Horizontal progress line for desktop */}
                    <div className="hidden md:block relative mb-8">
                      <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1 bg-white/10 rounded-full z-0" />
                      <div 
                        className="absolute top-1/2 left-6 -translate-y-1/2 h-1 bg-[#e8a33d] rounded-full z-0 transition-all duration-700"
                        style={{
                          width: `${Math.min(100, Math.max(0, (currentStageIndex / (stages.length - 1)) * 92))}%`
                        }}
                      />
                      <div className="flex justify-between items-center relative z-10">
                        {stages.map((st, idx) => {
                          const isDone = currentStageIndex >= idx;
                          const isCurrent = currentStageIndex === idx;
                          return (
                            <div key={st.status} className="flex flex-col items-center text-center max-w-[130px]">
                              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                                isDone
                                  ? 'bg-[#e8a33d] text-black shadow-lg shadow-[#e8a33d]/20 scale-105'
                                  : 'bg-[#1e1713] text-white/40 border border-white/10'
                              } ${isCurrent ? 'ring-4 ring-[#e8a33d]/25' : ''}`}>
                                {st.icon}
                              </div>
                              <p className={`text-xs font-bold mt-2.5 leading-tight ${isDone ? 'text-white' : 'text-white/40'}`}>
                                {st.title}
                              </p>
                              <p className="text-[10px] text-white/40 mt-0.5 leading-tight">
                                {st.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Vertical list for mobile */}
                    <div className="md:hidden space-y-4">
                      {stages.map((st, idx) => {
                        const isDone = currentStageIndex >= idx;
                        const isCurrent = currentStageIndex === idx;
                        return (
                          <div 
                            key={st.status} 
                            className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                              isCurrent
                                ? 'bg-[#e8a33d]/10 border-[#e8a33d] ring-1 ring-[#e8a33d]'
                                : isDone
                                ? 'bg-black/40 border-white/10 text-white'
                                : 'bg-black/20 border-white/5 opacity-50'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isDone ? 'bg-[#e8a33d] text-black font-bold' : 'bg-white/10 text-white/40'
                            }`}>
                              {st.icon}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{st.title}</p>
                              <p className="text-[11px] text-white/60">{st.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-red-400 font-bold">
                    This order was marked as cancelled. Please contact the restaurant at +91 98290 12345.
                  </div>
                )}

                {/* Google Drive KOT integration action */}
                <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-white/50">Google Drive KOT:</span>
                    {order.kotDrivePdfUrl ? (
                      <a
                        href={order.kotDrivePdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#e8a33d] font-bold hover:underline inline-flex items-center gap-1"
                      >
                        <span>View Saved KOT in Google Drive</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-white/40 italic">Ready for cloud sync</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveKotToDrive}
                    disabled={isSavingDrive}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e8a33d]/10 hover:bg-[#e8a33d]/20 border border-[#e8a33d]/30 text-[#e8a33d] text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{isSavingDrive ? 'Syncing to Drive...' : 'Sync KOT to Drive "kot" Folder'}</span>
                  </button>
                </div>
                {driveSaveMessage && (
                  <p className="text-[11px] text-center text-emerald-400 font-medium mt-2">
                    {driveSaveMessage}
                  </p>
                )}
              </div>

              {/* Order Info & Delivery / Dining Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Customer & Delivery Details */}
                <div className="bg-[#14100d] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-white/10">
                    <MapPin className="w-4 h-4 text-[#e8a33d]" />
                    Delivery &amp; Customer Information
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-white/40 block">Customer Name:</span>
                      <span className="text-white font-semibold text-sm">{order.customerName}</span>
                    </div>

                    <div>
                      <span className="text-white/40 block">Contact Phone:</span>
                      <a href={`tel:${order.customerPhone}`} className="text-[#e8a33d] font-mono font-bold hover:underline">
                        {order.customerPhone}
                      </a>
                    </div>

                    {order.deliveryAddress && (
                      <div>
                        <span className="text-white/40 block">Address in Jaipur:</span>
                        <p className="text-white/80 mt-0.5 leading-relaxed">{order.deliveryAddress}</p>
                      </div>
                    )}

                    {order.landmark && (
                      <div>
                        <span className="text-white/40 block">Landmark:</span>
                        <p className="text-white/80">{order.landmark}</p>
                      </div>
                    )}

                    {order.mapsLink && (
                      <div className="pt-2">
                        <a
                          href={order.mapsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold hover:bg-emerald-500/25 transition-all"
                        >
                          <MapPin className="w-4 h-4" />
                          <span>Open Pin in Google Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {order.cookingInstructions && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                        <span className="font-bold block mb-0.5">Special Chef Instructions:</span>
                        <p>{order.cookingInstructions}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Itemized Order Receipt */}
                <div className="bg-[#14100d] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-white/10">
                    <ShoppingBag className="w-4 h-4 text-[#e8a33d]" />
                    Itemized Order Summary
                  </h3>

                  <div className="divide-y divide-white/5 space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {order.items?.map((it, idx) => (
                      <div key={idx} className="pt-2 first:pt-0 flex justify-between items-start text-xs">
                        <div>
                          <p className="font-bold text-white">
                            <span className="text-[#e8a33d] font-mono mr-1.5">[{it.quantity}x]</span>
                            {it.name}
                          </p>
                          {it.customization && (
                            <p className="text-[11px] text-amber-400/80 italic mt-0.5">
                              Note: {it.customization}
                            </p>
                          )}
                        </div>
                        <span className="font-mono text-white/90">
                          ₹{it.price * it.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Financial Total */}
                  <div className="pt-3 border-t border-white/10 space-y-1.5 text-xs">
                    <div className="flex justify-between text-white/60">
                      <span>Order Channel:</span>
                      <span className="font-semibold text-white uppercase">{order.channel.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex justify-between text-white/60">
                      <span>Payment Method:</span>
                      <span className="font-semibold text-white">
                        {order.paymentMethod === 'ONLINE' ? 'Paid Online' : 'Cash / UPI on Delivery'}
                      </span>
                    </div>
                    <div className="flex justify-between text-white font-black text-sm pt-2 border-t border-white/5">
                      <span>Total Amount:</span>
                      <span className="text-[#e8a33d] font-mono text-base">₹{order.totalAmount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assistance & Action Footer */}
              <div className="bg-[#14100d] border border-white/10 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Need help with your order?</h4>
                  <p className="text-xs text-white/60 mt-0.5">
                    Our restaurant desk is live. Call us directly for any changes or urgent requests.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href="tel:+919829012345"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs transition-all"
                  >
                    <Phone className="w-4 h-4 text-[#e8a33d]" />
                    <span>Call +91 98290 12345</span>
                  </a>

                  <Link
                    to="/menu"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#e8a33d] hover:bg-[#f3b55c] text-black font-bold text-xs transition-all"
                  >
                    <span>Browse Menu</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
}
