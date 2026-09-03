import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
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
  ExternalLink,
  Download,
  AlertCircle,
  Search,
  Check
} from "lucide-react";
import { cafeConfig } from "../data/cafeConfig";
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

export default function OnlineOrderSection({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Cart & Ordering States
  const [cart, setCart] = useState<{ [id: string]: CartItem }>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderChannel, setOrderChannel] = useState<'ONLINE_DELIVERY' | 'TAKEAWAY'>('ONLINE_DELIVERY');

  // Form Fields: MANDATORY (Customer Name & Mobile Number)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string }>({});

  // OPTIONAL Fields: Location, Address, Landmark, Cooking Instructions, Alt Phone
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [locationCoordinates, setLocationCoordinates] = useState<{ lat: number; lng: number } | undefined>();
  const [mapsLink, setMapsLink] = useState<string | undefined>();
  const [landmark, setLandmark] = useState('');
  const [houseDetails, setHouseDetails] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [cookingInstructions, setCookingInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE' | 'UPI'>('COD');

  // Checkout submission states
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<RestaurantOrder | null>(null);
  const [liveOrderStatus, setLiveOrderStatus] = useState<string>('PLACED');
  const [isSavingDrive, setIsSavingDrive] = useState(false);
  const [driveSaveMessage, setDriveSaveMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch menu items from Firestore or fallback
  useEffect(() => {
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
          fetch("/menu.json")
            .then((res) => res.json())
            .then((data) => {
              setItems(data);
              setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
        }
      },
      () => {
        fetch("/menu.json")
          .then((res) => res.json())
          .then((data) => {
            setItems(data);
            setIsLoading(false);
          })
          .catch(() => setIsLoading(false));
      }
    );
    return () => unsubscribe();
  }, []);

  // Listen to live order status changes in Firestore
  useEffect(() => {
    if (!confirmedOrder?.id) return;
    const unsub = onSnapshot(doc(db, "zomatoOrders", confirmedOrder.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLiveOrderStatus(data.status || 'PLACED');
        if (data.kotDrivePdfUrl) {
          setConfirmedOrder((prev) => prev ? { ...prev, kotDrivePdfUrl: data.kotDrivePdfUrl } : null);
        }
      }
    });
    return () => unsub();
  }, [confirmedOrder?.id]);

  const categories = ["All", ...Array.from(new Set(items.map((item) => item.category)))];

  const filteredItems = items.filter((item) => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const matchesSearch = !searchQuery.trim() || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

  const cartList = Object.values(cart);
  const totalCartCount = cartList.reduce((sum, ci) => sum + ci.quantity, 0);
  const subtotal = cartList.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0);
  const tax = Math.round(subtotal * 0.05); // 5% GST
  const grandTotal = subtotal + tax;

  // Validate form: Name and Mobile Number are MANDATORY
  const validateForm = () => {
    const errors: { name?: string; phone?: string } = {};
    if (!customerName.trim()) {
      errors.name = "Customer name is mandatory.";
    }
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (!customerPhone.trim()) {
      errors.phone = "Mobile number is mandatory.";
    } else if (cleanPhone.length < 10) {
      errors.phone = "Please enter a valid 10-digit mobile number.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Order Placement
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (cartList.length === 0) {
      setSubmitError("Your cart is empty. Please add items to proceed.");
      return;
    }
    if (!validateForm()) {
      setSubmitError("Please fill in the required details (Name and 10-digit Mobile Number).");
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

      // Full address string including flat/house details
      const fullAddressString = [
        houseDetails ? `House/Flat: ${houseDetails}` : null,
        deliveryAddress || null,
        landmark ? `Landmark: ${landmark}` : null
      ].filter(Boolean).join(', ');

      const newOrder = await placeWebsiteOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        channel: orderChannel,
        deliveryAddress: fullAddressString || (locationCoordinates ? `GPS: ${locationCoordinates.lat}, ${locationCoordinates.lng}` : undefined),
        locationCoordinates,
        mapsLink,
        landmark: landmark.trim() || undefined,
        houseDetails: houseDetails.trim() || undefined,
        alternatePhone: alternatePhone.trim() || undefined,
        cookingInstructions: cookingInstructions.trim() || undefined,
        paymentMethod,
        items: itemsPayload,
        totalAmount: grandTotal
      });

      setConfirmedOrder(newOrder);
      setLiveOrderStatus('PLACED');
      setCart({});
      setIsCartOpen(false);
    } catch (err: any) {
      console.error("Order submission failed:", err);
      setSubmitError(err?.message || "Failed to submit order. Please check your network connection and try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

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

  return (
    <section id="online-order-section" className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e8a33d]/10 border border-[#e8a33d]/20 text-[#e8a33d] text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Direct Kitchen Ordering
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
          Order Food <span className="text-[#e8a33d]">Online</span>
        </h2>
        <p className="mt-3 text-sm sm:text-base text-white/60">
          Fresh garden dining brought straight to your doorstep in Jaipur. Enter your name &amp; mobile number, auto-detect your location with Google Maps, and enjoy live KOT tracking.
        </p>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#e8a33d] text-black shadow-lg shadow-[#e8a33d]/25 scale-105"
                    : "bg-[#14100d] text-white/70 hover:text-white hover:bg-white/10 border border-white/5"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Right side controls: Search Field & Cart Button */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, breads..."
              className="w-full pl-10 pr-4 py-2 rounded-full bg-[#14100d] border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#e8a33d] transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Cart Trigger Button */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border whitespace-nowrap ${
              totalCartCount > 0
                ? "bg-[#e8a33d] text-black border-[#e8a33d] shadow-lg shadow-[#e8a33d]/25 hover:bg-[#f3b55c]"
                : "bg-[#14100d] text-white/70 border-white/10 hover:text-white hover:bg-white/10"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Cart</span>
            {totalCartCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-black text-[#e8a33d] text-[11px] font-black leading-none">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Menu Dishes Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-72 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-[#14100d] rounded-2xl border border-white/5">
          <ChefHat className="w-12 h-12 text-[#e8a33d]/40 mx-auto mb-3" />
          <p className="text-white/70 font-semibold">No dishes found</p>
          <p className="text-white/40 text-xs mt-1">Try selecting another category or clear your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const inCart = cart[item.id];
            return (
              <div
                key={item.id}
                className="group flex flex-col justify-between rounded-2xl bg-[#120f0d] border border-white/5 hover:border-[#e8a33d]/40 transition-all duration-300 overflow-hidden shadow-md hover:shadow-xl hover:shadow-[#e8a33d]/5"
              >
                {/* Dish Image */}
                <div className="relative h-48 w-full overflow-hidden bg-black/40">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#120f0d] via-transparent to-transparent opacity-80" />
                  
                  {/* Category Pill */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[#e8a33d] text-[10px] font-bold uppercase tracking-wider border border-white/10">
                    {item.category}
                  </span>

                  {/* Price Tag */}
                  <span className="absolute bottom-3 right-3 px-3 py-1 rounded-xl bg-[#e8a33d] text-black font-extrabold text-sm shadow-md">
                    ₹{item.price}
                  </span>
                </div>

                {/* Dish Info & Add to Cart */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-[#e8a33d] transition-colors line-clamp-1">
                      {item.name}
                    </h3>
                    <p className="text-xs text-white/55 mt-1.5 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-white/40 font-mono">
                      Fresh garden recipe
                    </span>

                    {inCart ? (
                      <div className="flex items-center gap-2 bg-white/10 rounded-full px-2 py-1 border border-white/10">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-[#e8a33d] px-1 min-w-[16px] text-center">
                          {inCart.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 rounded-full bg-[#e8a33d] hover:bg-[#d48e28] text-black flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(item)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#e8a33d]/15 hover:bg-[#e8a33d] text-[#e8a33d] hover:text-black font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer border border-[#e8a33d]/30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Cart Bar (when items in cart) */}
      <AnimatePresence>
        {totalCartCount > 0 && !isCartOpen && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto z-40"
          >
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-[#e8a33d] hover:bg-[#f3b55c] text-black font-extrabold shadow-2xl shadow-black/80 active:scale-[0.99] transition-all cursor-pointer border border-[#f5c276]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-black text-[#e8a33d] flex items-center justify-center font-black text-xs">
                  {totalCartCount}
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-black/75">
                    {totalCartCount} {totalCartCount === 1 ? 'dish' : 'dishes'} in cart
                  </p>
                  <p className="text-sm font-black text-black">
                    ₹{grandTotal} <span className="text-[11px] font-normal text-black/60">(total)</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black text-white font-bold text-xs shadow-md">
                <span>View Cart &amp; Order</span>
                <ArrowRight className="w-4 h-4 text-[#e8a33d]" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-over Checkout Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Side Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-y-0 right-0 max-w-lg w-full bg-[#120f0d] border-l border-white/10 shadow-2xl flex flex-col text-white"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#171310]">
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-5 h-5 text-[#e8a33d]" />
                  <h3 className="font-extrabold text-base text-white">Your Order &amp; Checkout</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Order Channel Selection */}
                <div className="flex rounded-xl bg-black/40 p-1 border border-white/5">
                  <button
                    type="button"
                    onClick={() => setOrderChannel('ONLINE_DELIVERY')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      orderChannel === 'ONLINE_DELIVERY' 
                        ? 'bg-[#e8a33d] text-black shadow-md' 
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Bike className="w-4 h-4" />
                    Home Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderChannel('TAKEAWAY')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      orderChannel === 'TAKEAWAY' 
                        ? 'bg-[#e8a33d] text-black shadow-md' 
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <ChefHat className="w-4 h-4" />
                    Restaurant Pickup
                  </button>
                </div>

                {/* Selected Dishes list */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/50">Selected Items ({totalCartCount})</h4>
                    <span className="text-xs text-[#e8a33d]">5% GST included</span>
                  </div>

                  {cartList.length === 0 ? (
                    <div className="text-center py-6 bg-black/20 rounded-xl border border-white/5 text-white/40 text-xs">
                      Your cart is empty. Add your favorite dishes from the menu!
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {cartList.map(({ item, quantity, customization }) => (
                        <div key={item.id} className="p-3 rounded-xl bg-black/30 border border-white/5 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 pr-2">
                              <h5 className="text-xs font-bold text-white">{item.name}</h5>
                              <span className="text-xs text-[#e8a33d] font-semibold">₹{item.price * quantity}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold px-1">{quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-6 h-6 rounded-full bg-[#e8a33d] hover:bg-[#d48e28] text-black flex items-center justify-center text-xs cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Custom note per item */}
                          <input
                            type="text"
                            value={customization}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCart(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], customization: val }
                              }));
                            }}
                            placeholder="Optional note: e.g. Less spicy, Jain preparation..."
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[11px] text-white placeholder-white/30 focus:outline-none focus:border-[#e8a33d]"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* MANDATORY CUSTOMER DETAILS SECTION */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/90 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#e8a33d]" />
                      Customer Details
                    </h4>
                    <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                      * Mandatory Fields
                    </span>
                  </div>

                  {/* Customer Name - MANDATORY */}
                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1">
                      Full Name <span className="text-amber-400 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          if (formErrors.name) setFormErrors({ ...formErrors, name: undefined });
                        }}
                        placeholder="e.g. Rahul Sharma"
                        className={`w-full px-3.5 py-2.5 rounded-xl bg-black/50 border text-xs text-white placeholder-white/30 focus:outline-none transition-all ${
                          formErrors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-white/10 focus:border-[#e8a33d]'
                        }`}
                      />
                    </div>
                    {formErrors.name && (
                      <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {formErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Mobile Number - MANDATORY */}
                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1">
                      Mobile Number <span className="text-amber-400 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-white/40">
                        +91
                      </div>
                      <input
                        type="tel"
                        value={customerPhone}
                        maxLength={15}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          if (formErrors.phone) setFormErrors({ ...formErrors, phone: undefined });
                        }}
                        placeholder="98290 12345"
                        className={`w-full pl-12 pr-3.5 py-2.5 rounded-xl bg-black/50 border text-xs text-white placeholder-white/30 font-mono focus:outline-none transition-all ${
                          formErrors.phone ? 'border-red-500 ring-1 ring-red-500' : 'border-white/10 focus:border-[#e8a33d]'
                        }`}
                      />
                    </div>
                    {formErrors.phone && (
                      <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {formErrors.phone}
                      </p>
                    )}
                  </div>

                  {/* Alternate Phone (Optional) */}
                  <div>
                    <label className="block text-[11px] text-white/50 mb-1">
                      Alternate Mobile / WhatsApp <span className="text-white/30">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={alternatePhone}
                      onChange={(e) => setAlternatePhone(e.target.value)}
                      placeholder="Optional backup contact number"
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-white/30 font-mono focus:outline-none focus:border-[#e8a33d]"
                    />
                  </div>
                </div>

                {/* LOCATION ASSISTANCE & ADDRESS (Optional, with Google Maps auto-fetch) */}
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

                {/* Special Chef Instructions (Optional) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-white/70">
                    Special Cooking Instructions <span className="text-white/30 text-[11px]">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={cookingInstructions}
                    onChange={(e) => setCookingInstructions(e.target.value)}
                    placeholder="e.g. Please send extra green chutney, cut rotis in half, keep spices mild..."
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#e8a33d] resize-none"
                  />
                </div>

                {/* Payment Option */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="block text-xs font-semibold text-white/70">
                    Payment Method <span className="text-white/30 text-[11px]">(Optional)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { id: 'COD', label: 'Cash on Delivery' },
                      { id: 'UPI', label: 'UPI / QR on Delivery' },
                      { id: 'ONLINE', label: 'Pay at Counter' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPaymentMethod(p.id as any)}
                        className={`p-2 rounded-xl text-center font-medium border transition-all text-[11px] ${
                          paymentMethod === p.id 
                            ? 'bg-[#e8a33d]/20 border-[#e8a33d] text-[#e8a33d] font-bold' 
                            : 'bg-black/30 border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs">
                  <div className="flex justify-between text-white/60">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>GST (5%):</span>
                    <span className="font-mono">₹{tax}</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Delivery Fee:</span>
                    <span className="font-mono text-emerald-400">FREE</span>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex justify-between text-white font-extrabold text-sm">
                    <span>Total Bill:</span>
                    <span className="font-mono text-[#e8a33d] text-base">₹{grandTotal}</span>
                  </div>
                </div>
              </div>

              {/* Drawer Footer / Submit Button */}
              <div className="p-5 border-t border-white/10 bg-[#171310]">
                {submitError && (
                  <div className="mb-3 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-pulse">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{submitError}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={cartList.length === 0 || isPlacingOrder}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#e8a33d] to-[#d48e28] text-black font-extrabold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-[#e8a33d]/20 flex items-center justify-center gap-2"
                >
                  {isPlacingOrder ? (
                    <span>Submitting Order &amp; Generating KOT...</span>
                  ) : (
                    <>
                      <span>Confirm Order (₹{grandTotal})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-[11px] text-center text-white/40 mt-2">
                  Instant Kitchen Order Ticket (KOT) will be generated &amp; synced.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ORDER CONFIRMATION MODAL & LIVE KOT DISPLAY */}
      <AnimatePresence>
        {confirmedOrder && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#14100d] border border-[#e8a33d]/30 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative"
            >
              {/* Close / Dismiss */}
              <button
                onClick={() => setConfirmedOrder(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Confirmation Header */}
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-extrabold text-white">Order Placed Successfully!</h3>
                <p className="text-xs text-white/60 mt-1">
                  Your order is received and sent to {cafeConfig.name} kitchen.
                </p>
              </div>

              {/* Order & KOT Badges */}
              <div className="mt-4 p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/50">Order Number:</span>
                  <span className="font-mono font-bold text-white text-sm">{confirmedOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/50">KOT Ticket Number:</span>
                  <span className="font-mono font-bold text-[#e8a33d] text-sm bg-[#e8a33d]/15 px-2.5 py-0.5 rounded-md">
                    {confirmedOrder.kotNumber || 'KOT-101'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/50">Customer:</span>
                  <span className="font-semibold text-white">{confirmedOrder.customerName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/50">Contact:</span>
                  <span className="font-mono text-white/90">{confirmedOrder.customerPhone}</span>
                </div>
                {confirmedOrder.deliveryAddress && (
                  <div className="pt-2 border-t border-white/5 text-xs">
                    <span className="text-white/50 block mb-0.5">Delivery Address:</span>
                    <p className="text-white/80 line-clamp-2">{confirmedOrder.deliveryAddress}</p>
                  </div>
                )}
                {confirmedOrder.mapsLink && (
                  <div className="pt-1">
                    <a
                      href={confirmedOrder.mapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#e8a33d] hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      View Pin on Google Maps
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Live Kitchen Status Tracker */}
              <div className="mt-4 p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-white/60 font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#e8a33d]" />
                    Live Kitchen Status
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#e8a33d]/20 text-[#e8a33d] font-bold text-[11px] uppercase">
                    {liveOrderStatus}
                  </span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-[#e8a33d] h-full transition-all duration-500"
                    style={{
                      width: 
                        liveOrderStatus === 'PLACED' ? '25%' :
                        liveOrderStatus === 'ACCEPTED' ? '50%' :
                        liveOrderStatus === 'IN_PREPARATION' ? '75%' :
                        liveOrderStatus === 'FOOD_READY' || liveOrderStatus === 'DISPATCHED' ? '100%' : '30%'
                    }}
                  />
                </div>
              </div>

              {/* Live Tracking CTA */}
              <div className="mt-5">
                <Link
                  to={`/track?orderId=${confirmedOrder.id}`}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#e8a33d] to-[#d48e28] text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:brightness-110 shadow-lg shadow-[#e8a33d]/20"
                >
                  <Clock className="w-4 h-4" />
                  <span>Open Live Order &amp; KOT Tracking</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* KOT PDF Actions */}
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => downloadKotPdfLocally(confirmedOrder)}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#e8a33d]" />
                  Download 80mm KOT Receipt (PDF)
                </button>

                <button
                  type="button"
                  onClick={handleSaveKotToDrive}
                  disabled={isSavingDrive}
                  className="w-full py-2.5 rounded-xl bg-[#e8a33d]/15 hover:bg-[#e8a33d]/25 border border-[#e8a33d]/30 text-[#e8a33d] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  {isSavingDrive ? 'Syncing to Google Drive...' : 'Save KOT in Google Drive "kot" folder'}
                </button>

                {driveSaveMessage && (
                  <p className="text-[11px] text-center text-emerald-400 font-medium">
                    {driveSaveMessage}
                  </p>
                )}

                {confirmedOrder.kotDrivePdfUrl && (
                  <a
                    href={confirmedOrder.kotDrivePdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-xs text-[#e8a33d] hover:underline pt-1"
                  >
                    Open KOT PDF in Google Drive ↗
                  </a>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 text-center">
                <button
                  type="button"
                  onClick={() => setConfirmedOrder(null)}
                  className="text-xs text-white/50 hover:text-white"
                >
                  Done &amp; Return to Menu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
