import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Calendar, 
  ArrowLeft, 
  Utensils, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  User, 
  ChefHat, 
  X, 
  Bike, 
  Sparkles,
  Flame,
  ArrowRight,
  FileText,
  Cloud,
  Download,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { MenuItem, RestaurantOrder } from "../types";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query, orderBy, doc } from "firebase/firestore";
import { placeWebsiteOrder } from "../lib/zomatoService";
import { saveKotPdfToGoogleDrive, downloadKotPdfLocally } from "../lib/kotPdfService";
import { initiateDriveAuth, getStoredDriveToken } from "../lib/googleDrive";
import { motion, AnimatePresence } from "motion/react";
import LocationAssistant from "./LocationAssistant";

interface CartItem {
  item: MenuItem;
  quantity: number;
  customization: string;
}

export default function Menu({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [isLoading, setIsLoading] = useState(true);

  // Cart & Ordering States
  const [cart, setCart] = useState<{ [id: string]: CartItem }>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderChannel, setOrderChannel] = useState<'ONLINE_DELIVERY' | 'TAKEAWAY' | 'DINE_IN'>('ONLINE_DELIVERY');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [locationCoordinates, setLocationCoordinates] = useState<{ lat: number; lng: number } | undefined>();
  const [mapsLink, setMapsLink] = useState<string | undefined>();
  const [landmark, setLandmark] = useState('');
  const [houseDetails, setHouseDetails] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [cookingInstructions, setCookingInstructions] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<RestaurantOrder | null>(null);
  const [liveOrderStatus, setLiveOrderStatus] = useState<string>('PLACED');
  const [isSavingDrive, setIsSavingDrive] = useState(false);
  const [driveSaveMessage, setDriveSaveMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    // Try subscribing to Firestore menuItems in real-time
    const q = query(collection(db, "menuItems"), orderBy("category"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const firestoreItems: MenuItem[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name || "",
              description: data.description || "",
              price: Number(data.price) || 0,
              category: data.category || "Main Course",
              imageUrl: data.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800",
            };
          });
          setItems(firestoreItems);
          setIsLoading(false);
        } else {
          // Fallback to static menu.json
          fetch("/menu.json")
            .then((res) => res.json())
            .then((data) => {
              setItems(data);
              setIsLoading(false);
            })
            .catch((err) => {
              console.error("Failed to fetch static menu:", err);
              setIsLoading(false);
            });
        }
      },
      (error) => {
        console.warn("Firestore menuItems error, falling back to menu.json:", error);
        fetch("/menu.json")
          .then((res) => res.json())
          .then((data) => {
            setItems(data);
            setIsLoading(false);
          })
          .catch((err) => {
            console.error("Failed to fetch static menu:", err);
            setIsLoading(false);
          });
      }
    );

    return () => unsubscribe();
  }, []);

  // Listen to live updates of confirmed order if any
  useEffect(() => {
    if (!confirmedOrder?.id) return;
    const unsub = onSnapshot(doc(db, "zomatoOrders", confirmedOrder.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status) {
          setLiveOrderStatus(data.status);
        }
        if (data.kotDrivePdfUrl) {
          setConfirmedOrder((prev) => prev ? {
            ...prev,
            kotDrivePdfUrl: data.kotDrivePdfUrl,
            kotDriveFileId: data.kotDriveFileId,
            kotSavedToDriveAt: data.kotSavedToDriveAt
          } : null);
        }
      }
    });
    return () => unsub();
  }, [confirmedOrder?.id]);

  const handleSaveKotToDrive = async () => {
    if (!confirmedOrder) return;
    setIsSavingDrive(true);
    setDriveSaveMessage(null);

    const token = getStoredDriveToken();
    if (!token) {
      initiateDriveAuth(
        async () => {
          try {
            const res = await saveKotPdfToGoogleDrive(confirmedOrder);
            setIsSavingDrive(false);
            if (res.success) {
              setDriveSaveMessage("KOT PDF successfully saved in Google Drive 'kot' folder!");
              if (res.fileInfo?.webViewLink) {
                setConfirmedOrder((prev) => prev ? { ...prev, kotDrivePdfUrl: res.fileInfo?.webViewLink } : null);
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
          setDriveSaveMessage("Google Drive authorization was cancelled or failed.");
        }
      );
    } else {
      try {
        const res = await saveKotPdfToGoogleDrive(confirmedOrder);
        setIsSavingDrive(false);
        if (res.success) {
          setDriveSaveMessage("KOT PDF successfully saved in Google Drive 'kot' folder!");
          if (res.fileInfo?.webViewLink) {
            setConfirmedOrder((prev) => prev ? { ...prev, kotDrivePdfUrl: res.fileInfo?.webViewLink } : null);
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

  const categories = ["All", ...Array.from(new Set(items.map((item) => item.category)))];

  const filteredItems = activeCategory === "All"
    ? items
    : items.filter((item) => item.category === activeCategory);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev[item.id];
      if (existing) {
        return {
          ...prev,
          [item.id]: { ...existing, quantity: existing.quantity + 1 }
        };
      }
      return {
        ...prev,
        [item.id]: { item, quantity: 1, customization: '' }
      };
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return {
        ...prev,
        [itemId]: { ...existing, quantity: newQty }
      };
    });
  };

  const updateCustomization = (itemId: string, note: string) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      return {
        ...prev,
        [itemId]: { ...existing, customization: note }
      };
    });
  };

  const cartList = Object.values(cart);
  const totalCartCount = cartList.reduce((sum, ci) => sum + ci.quantity, 0);
  const subtotal = cartList.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0);
  const tax = Math.round(subtotal * 0.05); // 5% GST
  const grandTotal = subtotal + tax;

  // Handle Order Placement
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (cartList.length === 0) {
      setSubmitError("Your cart is empty. Please add delicious dishes first.");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setSubmitError("Please provide your name and contact phone number.");
      return;
    }
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setSubmitError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (orderChannel === 'ONLINE_DELIVERY' && !deliveryAddress.trim() && !locationCoordinates) {
      setSubmitError("Please provide your delivery address or select your GPS location in Jaipur.");
      return;
    }
    if (orderChannel === 'DINE_IN' && !tableNumber.trim()) {
      setSubmitError("Please enter your table number.");
      return;
    }

    setIsPlacingOrder(true);
    try {
      const itemsPayload = cartList.map((c) => {
        const itemObj: any = {
          id: c.item.id || '',
          name: c.item.name || 'Dish',
          quantity: Number(c.quantity) || 1,
          price: Number(c.item.price) || 0,
          category: c.item.category || 'Special',
          isCompletedInKitchen: false
        };
        if (c.customization && c.customization.trim()) {
          itemObj.customization = c.customization.trim();
        }
        return itemObj;
      });

      const fullAddressString = [
        houseDetails ? `House/Flat: ${houseDetails}` : null,
        deliveryAddress || null,
        landmark ? `Landmark: ${landmark}` : null
      ].filter(Boolean).join(', ');

      const newOrder = await placeWebsiteOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        channel: orderChannel,
        deliveryAddress: orderChannel === 'ONLINE_DELIVERY' ? (fullAddressString || deliveryAddress) : undefined,
        locationCoordinates,
        mapsLink,
        landmark: landmark.trim() || undefined,
        houseDetails: houseDetails.trim() || undefined,
        tableNumber: orderChannel === 'DINE_IN' ? tableNumber : undefined,
        cookingInstructions,
        items: itemsPayload,
        totalAmount: grandTotal
      });

      setConfirmedOrder(newOrder);
      setLiveOrderStatus('PLACED');
      setCart({});
      setIsCartOpen(false);
    } catch (err: any) {
      console.error("Order submission failed:", err);
      setSubmitError(err?.message || "Failed to submit order. Please check your network connection or contact the restaurant.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <section id="menu" className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full relative">
      {/* Header */}
      <div className="flex flex-col items-center justify-center gap-6 mb-12 text-center">
        <div>
          <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#e8a33d] mb-3 inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Outdoor Garden Dining & Online Kitchen
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif text-white mb-4">
            Our Culinary Menu
          </h1>
          <p className="text-sm text-white/60 max-w-xl mx-auto">
            Order freshly prepared garden dishes online for home delivery, takeaway counter pickup, or directly to your garden table.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!isEmbedded && (
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-widest text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Home
            </Link>
          )}
          <Link
            to="/booking"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-white/10 border border-white/15 text-white text-xs font-bold uppercase tracking-wider hover:bg-white/20 transition-all"
          >
            <Calendar className="w-4 h-4 text-[#e8a33d]" /> Book a Table
          </Link>
          <button
            onClick={() => setIsCartOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#e8a33d] text-black text-xs font-bold uppercase tracking-wider hover:bg-[#f3b55c] transition-all shadow-lg shadow-[#e8a33d]/20"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Order Cart ({totalCartCount})</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {categories.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-5 py-2 rounded-full text-xs uppercase tracking-wider font-semibold transition-all ${
                isActive
                  ? "bg-[#e8a33d] text-black shadow-md shadow-[#e8a33d]/20 scale-105"
                  : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Menu Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#e8a33d]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const inCart = cart[item.id];
            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm flex flex-col items-center text-center group hover:border-[#e8a33d]/40 transition-colors relative"
              >
                <div className="h-48 w-full overflow-hidden relative rounded-xl mb-4 bg-black/40">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <span className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#e8a33d] border border-white/10 shadow-lg">
                    ₹{item.price}
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-between w-full">
                  <div className="flex flex-col items-center">
                    <div className="flex flex-col items-center justify-center gap-1 mb-2">
                      <h3 className="font-bold text-white text-base">
                        {item.name}
                      </h3>
                      <span className="text-[10px] uppercase tracking-wider text-[#e8a33d] font-semibold">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-white/60 text-xs font-light leading-relaxed mb-4 line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {/* Order / Quantity Button */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between w-full mt-auto">
                    <span className="text-xs font-bold text-[#e8a33d]">
                      ₹{item.price}
                    </span>

                    {inCart ? (
                      <div className="flex items-center gap-2 bg-[#e8a33d] text-black px-2.5 py-1 rounded-full font-bold text-xs shadow-md">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="hover:opacity-75 transition-opacity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-4 text-center">{inCart.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="hover:opacity-75 transition-opacity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-white/10 hover:bg-[#e8a33d] text-white hover:text-black font-semibold text-xs transition-all border border-white/15 hover:border-transparent"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Cart Bar */}
      <AnimatePresence>
        {totalCartCount > 0 && !isCartOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-lg"
          >
            <div className="bg-[#1a1613] border border-[#e8a33d]/40 rounded-2xl p-3.5 shadow-2xl shadow-black/80 flex items-center justify-between text-white backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e8a33d] text-black flex items-center justify-center font-bold">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">
                    {totalCartCount} {totalCartCount === 1 ? 'Dish' : 'Dishes'} Selected
                  </p>
                  <p className="text-xs text-[#e8a33d] font-mono font-bold">
                    Subtotal: ₹{subtotal}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCartOpen(true)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#e8a33d] hover:bg-[#f3b55c] text-black font-bold text-xs shadow-lg transition-all"
              >
                <span>View Order</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------- CART & CHECKOUT DRAWER / MODAL ----------------- */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-[#14110e] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#e8a33d]/20 text-[#e8a33d] flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base">Your Food Order</h3>
                    <p className="text-[11px] text-white/50">The Bagichi Fresh Garden Kitchen</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cartList.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <Utensils className="w-10 h-10 text-white/20 mx-auto" />
                  <p className="text-sm text-white/60">Your order cart is currently empty.</p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors"
                  >
                    Browse Menu
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePlaceOrder} className="space-y-5">
                  {/* Order Channel Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-white/70 font-semibold block">
                      Select How You'd Like to Receive Your Order:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setOrderChannel('ONLINE_DELIVERY')}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          orderChannel === 'ONLINE_DELIVERY'
                            ? 'bg-[#e8a33d]/20 border-[#e8a33d] text-white font-bold'
                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        <Bike className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                        <span className="text-[11px] block">Delivery</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOrderChannel('TAKEAWAY')}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          orderChannel === 'TAKEAWAY'
                            ? 'bg-[#e8a33d]/20 border-[#e8a33d] text-white font-bold'
                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        <ShoppingBag className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                        <span className="text-[11px] block">Takeaway</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOrderChannel('DINE_IN')}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          orderChannel === 'DINE_IN'
                            ? 'bg-[#e8a33d]/20 border-[#e8a33d] text-white font-bold'
                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        <ChefHat className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                        <span className="text-[11px] block">Dine-In Table</span>
                      </button>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2 border-t border-b border-white/10 py-3 max-h-48 overflow-y-auto">
                    {cartList.map(({ item, quantity, customization }) => (
                      <div key={item.id} className="bg-[#0c0a09] p-3 rounded-xl border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 pr-2">
                            <p className="text-xs font-bold text-white leading-snug">{item.name}</p>
                            <p className="text-[11px] text-[#e8a33d] font-mono">₹{item.price * quantity}</p>
                          </div>
                          <div className="flex items-center gap-2 bg-white/10 px-2.5 py-1 rounded-lg">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, -1)}
                              className="text-white hover:text-[#e8a33d]"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-mono font-bold text-white w-4 text-center">{quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, 1)}
                              className="text-white hover:text-[#e8a33d]"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Customization Note input for item */}
                        <input
                          type="text"
                          placeholder="Special note (e.g. less spicy, jain, extra crispy)"
                          value={customization}
                          onChange={(e) => updateCustomization(item.id, e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#e8a33d]"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Customer Information Form */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-white/70 block mb-1">Your Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rajesh Sharma"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full bg-[#0a0908] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#e8a33d]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-white/70 block mb-1">Phone Number *</label>
                        <input
                          type="tel"
                          required
                          placeholder="+91 98290 12345"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full bg-[#0a0908] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#e8a33d]"
                        />
                      </div>
                    </div>

                    {orderChannel === 'ONLINE_DELIVERY' && (
                      <LocationAssistant
                        initialAddress={deliveryAddress}
                        initialLandmark={landmark}
                        initialHouseDetails={houseDetails}
                        onLocationSelected={(data) => {
                          setDeliveryAddress(data.address);
                          setLocationCoordinates(data.coordinates);
                          setMapsLink(data.mapsLink);
                          if (data.landmark) setLandmark(data.landmark);
                          if (data.houseDetails) setHouseDetails(data.houseDetails);
                        }}
                      />
                    )}

                    {orderChannel === 'DINE_IN' && (
                      <div>
                        <label className="text-[11px] text-white/70 block mb-1">Your Garden Table Number *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Table 5, Gazebo 2, or Lawn Table"
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value)}
                          className="w-full bg-[#0a0908] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#e8a33d]"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] text-white/70 block mb-1">Special Chef Instructions (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Pack mint chutney separately, no garlic"
                        value={cookingInstructions}
                        onChange={(e) => setCookingInstructions(e.target.value)}
                        className="w-full bg-[#0a0908] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#e8a33d]"
                      />
                    </div>
                  </div>

                  {/* Bill Summary */}
                  <div className="bg-white/5 p-3 rounded-xl space-y-1.5 text-xs text-white/70">
                    <div className="flex justify-between">
                      <span>Item Subtotal:</span>
                      <span className="font-mono text-white font-semibold">₹{subtotal}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Restaurant GST (5%):</span>
                      <span className="font-mono text-white/80">₹{tax}</span>
                    </div>
                    <div className="border-t border-white/10 pt-1.5 flex justify-between font-bold text-sm text-white">
                      <span>Total Amount:</span>
                      <span className="font-mono text-[#e8a33d]">₹{grandTotal}</span>
                    </div>
                  </div>

                  {/* Submit Error Notice */}
                  {submitError && (
                    <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-pulse">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isPlacingOrder}
                    className="w-full py-3.5 rounded-2xl bg-[#e8a33d] hover:bg-[#f3b55c] text-black font-bold text-sm shadow-xl shadow-[#e8a33d]/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isPlacingOrder ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        <span>Sending to Kitchen POS...</span>
                      </>
                    ) : (
                      <>
                        <Flame className="w-4 h-4" />
                        <span>Place Order Now • ₹{grandTotal}</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------- ORDER CONFIRMATION & LIVE STATUS TRACKER ----------------- */}
      <AnimatePresence>
        {confirmedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-[#14110e] border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-5 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
                  Kitchen Received Order!
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Thank You, {confirmedOrder.customerName}!
                </h3>
                <p className="text-xs text-white/50 mt-1">
                  Order Ticket <span className="text-[#e8a33d] font-mono font-bold">{confirmedOrder.orderNumber}</span> ({confirmedOrder.kotNumber}) has been transmitted to our kitchen.
                </p>
              </div>

              {/* Real-Time Live Status Tracker */}
              <div className="bg-[#0a0908] p-4 rounded-2xl border border-white/10 space-y-4 text-left">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-white/60">Live Preparation Status:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                    liveOrderStatus === 'FOOD_READY' || liveOrderStatus === 'DISPATCHED'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : liveOrderStatus === 'IN_PREPARATION'
                      ? 'bg-[#e8a33d]/20 text-[#e8a33d]'
                      : 'bg-amber-500/20 text-amber-300 animate-pulse'
                  }`}>
                    ● {liveOrderStatus}
                  </span>
                </div>

                {/* Status Stepper */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Order Received & Placed</p>
                      <p className="text-[10px] text-white/40">POS registered & alert chime sounded</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      liveOrderStatus === 'IN_PREPARATION' || liveOrderStatus === 'FOOD_READY' || liveOrderStatus === 'DISPATCHED'
                        ? 'bg-[#e8a33d] text-black'
                        : 'bg-white/10 text-white/40'
                    }`}>
                      {liveOrderStatus === 'IN_PREPARATION' || liveOrderStatus === 'FOOD_READY' || liveOrderStatus === 'DISPATCHED' ? '✓' : '2'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">In Kitchen (KOT Active)</p>
                      <p className="text-[10px] text-white/40">Chefs are cooking your dishes fresh</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      liveOrderStatus === 'FOOD_READY' || liveOrderStatus === 'DISPATCHED'
                        ? 'bg-emerald-500 text-black'
                        : 'bg-white/10 text-white/40'
                    }`}>
                      {liveOrderStatus === 'FOOD_READY' || liveOrderStatus === 'DISPATCHED' ? '✓' : '3'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Food Ready for Handover</p>
                      <p className="text-[10px] text-white/40">Hot & packed in spill-proof containers</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      liveOrderStatus === 'DISPATCHED'
                        ? 'bg-blue-500 text-black'
                        : 'bg-white/10 text-white/40'
                    }`}>
                      {liveOrderStatus === 'DISPATCHED' ? '✓' : '4'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Dispatched / Served</p>
                      <p className="text-[10px] text-white/40">Enjoy your meal at The Bagichi</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-white/50 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#e8a33d]" /> Est. Prep: 25 Mins
                  </span>
                  <span className="font-mono text-[#e8a33d] font-bold">
                    Total: ₹{confirmedOrder.totalAmount}
                  </span>
                </div>
              </div>

              {/* KOT PDF & Google Drive Integration Card */}
              <div className="bg-[#0a0908] p-4 rounded-2xl border border-amber-500/20 space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-[#e8a33d] flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">Kitchen Order Ticket (KOT)</h4>
                      <p className="text-[10px] text-white/40">Generated in 80mm PDF Format</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">
                    {confirmedOrder.kotNumber || confirmedOrder.orderNumber}
                  </span>
                </div>

                {confirmedOrder.kotDrivePdfUrl ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Saved in Google Drive folder: <strong className="font-semibold text-emerald-300">kot</strong></span>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={confirmedOrder.kotDrivePdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 text-black text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-400 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open in Google Drive
                      </a>
                      <button
                        type="button"
                        onClick={() => downloadKotPdfLocally(confirmedOrder)}
                        className="py-2 px-3 rounded-lg bg-white/10 text-white text-xs font-medium flex items-center justify-center gap-1 hover:bg-white/15 transition-colors"
                        title="Download PDF copy"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {driveSaveMessage && (
                      <p className="text-[11px] text-amber-300/90 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        {driveSaveMessage}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveKotToDrive}
                        disabled={isSavingDrive}
                        className="flex-1 py-2 px-3 rounded-lg bg-[#e8a33d] hover:bg-[#d49232] text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        {isSavingDrive ? "Saving to Drive..." : "Save KOT PDF to Google Drive (kot)"}
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadKotPdfLocally(confirmedOrder)}
                        className="py-2 px-3 rounded-lg bg-white/10 text-white text-xs font-medium flex items-center justify-center gap-1 hover:bg-white/15 transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Link
                  to={`/track?orderId=${confirmedOrder.id}`}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#e8a33d] to-[#d48e28] text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:brightness-110 shadow-lg shadow-[#e8a33d]/20"
                >
                  <Clock className="w-4 h-4" />
                  <span>Open Live Order &amp; KOT Tracking</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => setConfirmedOrder(null)}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all"
                >
                  Close &amp; Continue Browsing
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
