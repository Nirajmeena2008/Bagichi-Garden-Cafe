import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Calendar, Clock, Users, ArrowLeft, Check, Plus, Minus, Trash2 } from "lucide-react";
import { Reservation, MenuItem } from "../types";

export default function ManageBooking() {
  const [searchParams] = useSearchParams();
  const [reservationNumber, setReservationNumber] = useState(searchParams.get("id") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<Reservation | null>(null);
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  
  useEffect(() => {
    fetch("/api/menu")
      .then((res) => res.json())
      .then((data) => setMenuItems(data))
      .catch((err) => console.error(err));
  }, []);

  const searchBooking = async (resNum: string) => {
    if (!resNum.trim()) return;
    
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch(`/api/bookings/${resNum.toUpperCase()}`);
      if (!res.ok) throw new Error("Booking not found");
      const data = await res.json();
      setBooking(data);
    } catch (err) {
      setError("We couldn't find a booking with that number.");
      setBooking(null);
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
    
    try {
      const res = await fetch(`/api/bookings/${booking.reservationNumber}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...booking, ...updates }),
      });
      if (res.ok) {
        const data = await res.json();
        setBooking(data.booking);
      }
    } catch (err) {
      console.error(err);
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
    
    // We send just the structure expected by the API
    const preOrdersPayload = newOrders.map(o => ({
      menuItemId: o.menuItemId,
      quantity: o.quantity
    }));
    
    handleUpdate({ preOrders: preOrdersPayload } as any);
  };

  const removePreOrder = (menuItemId: string) => {
    if (!booking) return;
    const currentOrders = booking.preOrders || [];
    const newOrders = currentOrders.filter(item => item.menuItemId !== menuItemId);
    
    const preOrdersPayload = newOrders.map(o => ({
      menuItemId: o.menuItemId,
      quantity: o.quantity
    }));
    
    handleUpdate({ preOrders: preOrdersPayload } as any);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a] font-sans selection:bg-[#C5A059]/30 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-[#5A5A40] hover:text-[#C5A059] transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        <div className="bg-[#fdfdfb] rounded-3xl p-8 shadow-xl border border-[#5A5A40]/10 mb-8">
          <h1 className="text-3xl font-serif text-[#141414] mb-2">Manage Booking</h1>
          <p className="text-[#5A5A40]/80 font-light mb-8">Enter your reservation number to view details, pre-order food, or modify your booking.</p>
          
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="e.g. BGC-XXXXXX"
                value={reservationNumber}
                onChange={(e) => setReservationNumber(e.target.value)}
                className="w-full px-6 py-4 rounded-xl border border-[#5A5A40]/20 focus:ring-1 focus:ring-[#5A5A40] focus:border-[#5A5A40] transition-all outline-none bg-white text-[#141414] font-mono tracking-widest uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#5A5A40] hover:bg-[#4a4a35] text-white px-8 rounded-xl text-xs uppercase tracking-widest font-bold transition-all shadow-lg flex items-center gap-2"
            >
              {loading ? "Searching..." : <><Search className="w-4 h-4" /> Find</>}
            </button>
          </form>
          {error && <p className="text-red-500 mt-4 text-sm font-medium">{error}</p>}
        </div>

        {booking && (
          <div className="bg-[#fdfdfb] rounded-3xl overflow-hidden shadow-xl border border-[#5A5A40]/10">
            <div className="p-8 border-b border-[#5A5A40]/10 bg-[#5A5A40]/5 flex justify-between items-start">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#5A5A40] mb-2">Reservation Info</p>
                <h2 className="text-2xl font-serif text-[#141414]">{booking.name}</h2>
                <p className="text-[#5A5A40]/80 text-sm mt-1">{booking.email} • {booking.phone}</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold bg-[#C5A059]/20 text-[#141414]">
                  {booking.status}
                </span>
                <p className="text-xl font-mono tracking-widest text-[#141414] font-bold mt-2">{booking.reservationNumber}</p>
              </div>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#5A5A40] mb-2">Date</p>
                <p className="flex items-center gap-2 text-[#141414]"><Calendar className="w-4 h-4 text-[#C5A059]" /> {new Date(booking.date).toLocaleDateString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#5A5A40] mb-2">Time</p>
                <p className="flex items-center gap-2 text-[#141414]"><Clock className="w-4 h-4 text-[#C5A059]" /> {booking.time}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#5A5A40] mb-2">Guests</p>
                <p className="flex items-center gap-2 text-[#141414]"><Users className="w-4 h-4 text-[#C5A059]" /> {booking.guests} People</p>
              </div>
            </div>

            {/* Pre-Orders Section */}
            <div className="p-8 border-t border-[#5A5A40]/10">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-serif text-[#141414]">Pre-Ordered Food</h3>
                  <p className="text-xs text-[#5A5A40]/80 mt-1">Order ahead so your food is ready when you arrive.</p>
                </div>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="bg-white border border-[#5A5A40]/20 text-[#141414] px-4 py-2 rounded-lg text-xs uppercase tracking-widest font-bold hover:bg-[#5A5A40]/5 transition-colors"
                >
                  {showMenu ? "Close Menu" : "Add Items"}
                </button>
              </div>
              
              {showMenu && (
                <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {menuItems.map(item => (
                    <div key={item.id} className="border border-[#5A5A40]/10 rounded-xl p-4 flex justify-between items-center bg-white">
                      <div>
                        <p className="font-bold text-sm text-[#141414]">{item.name}</p>
                        <p className="text-[#C5A059] font-medium text-xs">₹{item.price}</p>
                      </div>
                      <button 
                        onClick={() => addPreOrder(item)}
                        className="w-8 h-8 rounded-full bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40] hover:bg-[#5A5A40] hover:text-white transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {(!booking.preOrders || booking.preOrders.length === 0) ? (
                <div className="text-center py-8 bg-[#5A5A40]/5 rounded-xl border border-[#5A5A40]/10 border-dashed">
                  <p className="text-sm text-[#5A5A40]/80">No food items added yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {booking.preOrders.map((orderItem) => (
                    <div key={orderItem.menuItemId} className="flex justify-between items-center p-4 border border-[#5A5A40]/10 rounded-xl bg-white">
                      <div className="flex items-center gap-4">
                        <img src={orderItem.menuItem.imageUrl} alt={orderItem.menuItem.name} className="w-12 h-12 object-cover rounded-md" />
                        <div>
                          <p className="font-bold text-sm text-[#141414]">{orderItem.menuItem.name}</p>
                          <p className="text-xs text-[#5A5A40]/80">₹{orderItem.menuItem.price} × {orderItem.quantity}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold text-[#141414]">₹{orderItem.menuItem.price * orderItem.quantity}</p>
                        <button 
                          onClick={() => removePreOrder(orderItem.menuItemId)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-between items-center p-4 bg-[#5A5A40]/5 rounded-xl border border-[#5A5A40]/10 mt-4">
                    <p className="text-xs uppercase tracking-widest font-bold text-[#5A5A40]">Total Pre-Order Amount</p>
                    <p className="text-xl font-serif text-[#141414]">
                      ₹{booking.preOrders.reduce((acc, item) => acc + (item.menuItem.price * item.quantity), 0)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {booking.status === "PENDING" && (
              <div className="p-8 border-t border-[#5A5A40]/10 bg-[#5A5A40]/5 flex justify-end gap-4">
                <button 
                  onClick={() => handleUpdate({ status: "CANCELLED" })}
                  className="px-6 py-3 rounded-xl border border-[#5A5A40]/20 text-[#141414] text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors"
                >
                  Cancel Booking
                </button>
                <button 
                  onClick={() => handleUpdate({ status: "CONFIRMED" })}
                  className="px-6 py-3 rounded-xl bg-[#5A5A40] text-white text-xs uppercase tracking-widest font-bold shadow-lg shadow-[#5A5A40]/20 hover:bg-[#4a4a35] transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Confirm Booking
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
