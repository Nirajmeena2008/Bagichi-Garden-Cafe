import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  MapPin, 
  Phone, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Printer, 
  Download, 
  ExternalLink, 
  RefreshCw, 
  ChefHat, 
  Bike, 
  Check, 
  X, 
  Trash2, 
  ArrowUpRight, 
  Sparkles,
  UtensilsCrossed,
  Navigation
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ZomatoOrder, ZomatoOrderStatus } from '../types';
import { 
  updateZomatoOrderStatus, 
  generateOrAssignKotToOrder, 
  printKotTicket, 
  deleteRestaurantOrder,
  formatKotTicketText
} from '../lib/zomatoService';
import { saveKotPdfToGoogleDrive, downloadKotPdfLocally } from '../lib/kotPdfService';
import { initiateDriveAuth, getStoredDriveToken } from '../lib/googleDrive';
import { soundManager } from '../lib/soundAlert';

export default function AdminOrderManagement({ onOpenKds }: { onOpenKds?: () => void }) {
  const [orders, setOrders] = useState<ZomatoOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  
  // KOT Action states
  const [activeKotPreview, setActiveKotPreview] = useState<ZomatoOrder | null>(null);
  const [isGeneratingKot, setIsGeneratingKot] = useState<string | null>(null);
  const [driveSavingId, setDriveSavingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ id: string; text: string; type: 'success' | 'error' } | null>(null);

  // Subscribe to all orders in real-time
  useEffect(() => {
    const q = query(collection(db, 'zomatoOrders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ZomatoOrder[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any)
        }));
        setOrders(list);
        setIsLoading(false);
      },
      (error) => {
        console.warn('[AdminOrderManagement] Orders fetch error:', error);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGenerateKot = async (order: ZomatoOrder) => {
    setIsGeneratingKot(order.id);
    try {
      const kotNumber = await generateOrAssignKotToOrder(order.id, order);
      soundManager.playOrderAlert();
      setActionNotice({
        id: order.id,
        text: `KOT ${kotNumber} generated successfully and synced to kitchen!`,
        type: 'success'
      });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to generate KOT:', err);
      setActionNotice({
        id: order.id,
        text: 'Failed to generate KOT ticket.',
        type: 'error'
      });
    } finally {
      setIsGeneratingKot(null);
    }
  };

  const handleSaveToDrive = async (order: ZomatoOrder) => {
    setDriveSavingId(order.id);
    const token = getStoredDriveToken();

    const doSave = async () => {
      try {
        const res = await saveKotPdfToGoogleDrive(order);
        setDriveSavingId(null);
        if (res.success) {
          setActionNotice({
            id: order.id,
            text: `KOT PDF uploaded to Google Drive 'kot' folder!`,
            type: 'success'
          });
        } else {
          setActionNotice({
            id: order.id,
            text: res.error || 'Failed to upload KOT to Drive.',
            type: 'error'
          });
        }
        setTimeout(() => setActionNotice(null), 4000);
      } catch (e: any) {
        setDriveSavingId(null);
        setActionNotice({
          id: order.id,
          text: e.message || 'Drive save error',
          type: 'error'
        });
      }
    };

    if (!token) {
      initiateDriveAuth(
        () => doSave(),
        () => {
          setDriveSavingId(null);
          setActionNotice({
            id: order.id,
            text: 'Google Drive authorization cancelled.',
            type: 'error'
          });
        }
      );
    } else {
      await doSave();
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: ZomatoOrderStatus) => {
    try {
      await updateZomatoOrderStatus(orderId, newStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesChannel = channelFilter === 'ALL' || o.channel === channelFilter;
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch = !q || 
      (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
      (o.kotNumber && o.kotNumber.toLowerCase().includes(q)) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      (o.customerPhone && o.customerPhone.includes(q)) ||
      (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(q));

    return matchesStatus && matchesChannel && matchesSearch;
  });

  const countPlaced = orders.filter(o => o.status === 'PLACED').length;
  const countInPrep = orders.filter(o => o.status === 'ACCEPTED' || o.status === 'IN_PREPARATION').length;
  const countReady = orders.filter(o => o.status === 'FOOD_READY').length;
  const countDispatched = orders.filter(o => o.status === 'DISPATCHED').length;

  return (
    <div className="space-y-6">
      {/* Overview Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#120f0d] border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>New Orders</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400 font-mono">{countPlaced}</span>
            <span className="text-[11px] text-white/40">Action needed</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#120f0d] border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>In Kitchen</span>
            <ChefHat className="w-4 h-4 text-[#e8a33d]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#e8a33d] font-mono">{countInPrep}</span>
            <span className="text-[11px] text-white/40">KOT active</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#120f0d] border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>Food Ready</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">{countReady}</span>
            <span className="text-[11px] text-white/40">Ready to serve</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#120f0d] border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>Dispatched / Done</span>
            <Bike className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-400 font-mono">{countDispatched}</span>
            <span className="text-[11px] text-white/40">Total fulfilled</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Kitchen KDS Link */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#120f0d] border border-white/5 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Order #, KOT #, Name, Phone, Address..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#e8a33d]"
          />
        </div>

        {/* Status Filters & KDS Switch */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
          {/* Status filter pills */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white/80 focus:outline-none focus:border-[#e8a33d]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PLACED">Placed (New)</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="IN_PREPARATION">In Kitchen Prep</option>
            <option value="FOOD_READY">Food Ready</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white/80 focus:outline-none focus:border-[#e8a33d]"
          >
            <option value="ALL">All Channels</option>
            <option value="ONLINE_DELIVERY">Online Delivery</option>
            <option value="TAKEAWAY">Takeaway Pickup</option>
            <option value="DINE_IN">Dine In</option>
          </select>

          {onOpenKds && (
            <button
              type="button"
              onClick={onOpenKds}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e8a33d]/15 hover:bg-[#e8a33d] text-[#e8a33d] hover:text-black font-bold text-xs transition-all border border-[#e8a33d]/30 cursor-pointer"
            >
              <ChefHat className="w-4 h-4" />
              Open Kitchen KDS Display
            </button>
          )}
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-40 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-[#120f0d] rounded-2xl border border-white/5">
          <ShoppingBag className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/70 font-semibold">No orders matching criteria</p>
          <p className="text-white/40 text-xs mt-1">Try resetting search filters or place a test order online.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const hasKot = !!order.kotNumber;
            const timeAgo = order.createdAt?.toDate 
              ? new Date(order.createdAt.toDate()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
              : 'Recent';

            return (
              <div
                key={order.id}
                className={`p-5 rounded-2xl bg-[#120f0d] border transition-all duration-200 ${
                  order.status === 'PLACED' 
                    ? 'border-amber-500/40 shadow-lg shadow-amber-500/5' 
                    : 'border-white/5 hover:border-white/10'
                }`}
              >
                {/* Top Row: Order Number, Channel, KOT Status, Status Badge */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-black text-white text-base">
                      {order.orderNumber}
                    </span>

                    {/* Channel badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                      order.channel === 'ONLINE_DELIVERY' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' :
                      order.channel === 'TAKEAWAY' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                      'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {order.channel === 'ONLINE_DELIVERY' ? 'Online Delivery' :
                       order.channel === 'TAKEAWAY' ? 'Takeaway' : 'Dine In'}
                    </span>

                    {/* KOT Number Badge */}
                    {hasKot ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#e8a33d]/20 text-[#e8a33d] font-mono font-bold text-xs border border-[#e8a33d]/30">
                        <FileText className="w-3.5 h-3.5" />
                        {order.kotNumber}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 font-bold text-xs border border-red-500/20">
                        <AlertCircle className="w-3 h-3" />
                        No KOT Assigned
                      </span>
                    )}

                    <span className="text-white/40 text-xs flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" /> {timeAgo}
                    </span>
                  </div>

                  {/* Status progression pill */}
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      order.status === 'PLACED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      order.status === 'ACCEPTED' ? 'bg-blue-500/20 text-blue-400' :
                      order.status === 'IN_PREPARATION' ? 'bg-[#e8a33d]/20 text-[#e8a33d]' :
                      order.status === 'FOOD_READY' ? 'bg-emerald-500/20 text-emerald-400' :
                      order.status === 'DISPATCHED' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-white/10 text-white/50'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Middle Row: Customer Info, Location Assistance, and Items */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-4">
                  {/* Customer & Location Box (Mandatory details highlighted) */}
                  <div className="lg:col-span-4 space-y-2.5">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-white/40 font-semibold block">
                        Customer (Mandatory)
                      </span>
                      <p className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                        {order.customerName}
                      </p>
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="inline-flex items-center gap-1 text-xs text-[#e8a33d] font-mono hover:underline mt-0.5"
                      >
                        <Phone className="w-3 h-3" />
                        {order.customerPhone}
                      </a>
                      {order.alternatePhone && (
                        <span className="text-xs text-white/40 font-mono block">
                          Alt: {order.alternatePhone}
                        </span>
                      )}
                    </div>

                    {/* Delivery Address & Google Map Assistance Details */}
                    {(order.deliveryAddress || order.locationCoordinates || order.mapsLink) && (
                      <div className="pt-2 border-t border-white/5 space-y-1">
                        <span className="text-[11px] uppercase tracking-wider text-white/40 font-semibold flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#e8a33d]" />
                          Delivery Location
                        </span>
                        {order.deliveryAddress && (
                          <p className="text-xs text-white/80 leading-relaxed">
                            {order.deliveryAddress}
                          </p>
                        )}
                        {order.landmark && (
                          <p className="text-xs text-white/50 italic">
                            Landmark: {order.landmark}
                          </p>
                        )}

                        {/* Google Maps link button for delivery staff */}
                        {(order.mapsLink || order.locationCoordinates) && (
                          <div className="pt-1.5">
                            <a
                              href={order.mapsLink || `https://www.google.com/maps?q=${order.locationCoordinates?.lat},${order.locationCoordinates?.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e8a33d]/15 text-[#e8a33d] hover:bg-[#e8a33d] hover:text-black font-bold text-xs transition-colors border border-[#e8a33d]/30"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              View Pin on Google Maps
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Items Ordered & Special Instructions */}
                  <div className="lg:col-span-5 space-y-3">
                    <span className="text-[11px] uppercase tracking-wider text-white/40 font-semibold block">
                      Kitchen Items ({order.items.reduce((s, i) => s + i.quantity, 0)})
                    </span>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex items-start justify-between text-xs py-1 border-b border-white/5">
                          <div>
                            <span className="font-extrabold text-[#e8a33d] mr-2">[{it.quantity}x]</span>
                            <span className="font-semibold text-white">{it.name}</span>
                            {it.customization && (
                              <p className="text-[11px] text-amber-200/80 italic pl-6">
                                * {it.customization}
                              </p>
                            )}
                          </div>
                          <span className="font-mono text-white/60">₹{it.price * it.quantity}</span>
                        </div>
                      ))}
                    </div>

                    {/* Special Chef Instructions */}
                    {order.cookingInstructions && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                        <span className="font-bold block text-[10px] uppercase tracking-wider text-amber-400">
                          Special Instructions for Kitchen:
                        </span>
                        {order.cookingInstructions}
                      </div>
                    )}
                  </div>

                  {/* Pricing & KOT Actions Box */}
                  <div className="lg:col-span-3 flex flex-col justify-between space-y-3 lg:border-l lg:border-white/5 lg:pl-6">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-white/40 font-semibold block">
                        Total Amount
                      </span>
                      <p className="text-xl font-black text-white font-mono mt-0.5">
                        ₹{order.totalAmount}
                      </p>
                      <span className="text-[11px] text-emerald-400 font-semibold">
                        {order.paymentMethod || 'COD'}
                      </span>
                    </div>

                    {/* KOT Generation & Print Buttons */}
                    <div className="space-y-1.5 pt-2">
                      <div className="text-[10px] uppercase font-bold text-white/40">
                        KOT Operations
                      </div>

                      <div className="flex flex-col gap-1.5">
                        {/* Generate or Re-generate KOT */}
                        <button
                          type="button"
                          onClick={() => handleGenerateKot(order)}
                          disabled={isGeneratingKot === order.id}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-[#e8a33d]/15 hover:bg-[#e8a33d] text-[#e8a33d] hover:text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-[#e8a33d]/30 disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {isGeneratingKot === order.id 
                            ? 'Generating KOT...' 
                            : hasKot ? 'Regenerate KOT' : 'Generate KOT Ticket'}
                        </button>

                        {/* Print 80mm KOT Slip */}
                        <button
                          type="button"
                          onClick={() => printKotTicket(order)}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all border border-white/10 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-white/60" />
                          Print 80mm Slip
                        </button>

                        {/* Download PDF & Google Drive Sync */}
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => downloadKotPdfLocally(order)}
                            title="Download KOT PDF"
                            className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs flex items-center justify-center gap-1 border border-white/10"
                          >
                            <Download className="w-3 h-3" />
                            <span>PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSaveToDrive(order)}
                            disabled={driveSavingId === order.id}
                            title="Save to Google Drive kot folder"
                            className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#e8a33d] text-xs flex items-center justify-center gap-1 border border-white/10 disabled:opacity-50"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Drive</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Status Transition Lifecycle Actions */}
                <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {order.status === 'PLACED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'ACCEPTED')}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept Order
                      </button>
                    )}

                    {(order.status === 'PLACED' || order.status === 'ACCEPTED') && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'IN_PREPARATION')}
                        className="px-3 py-1.5 rounded-lg bg-[#e8a33d] hover:bg-[#d48e28] text-black font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <ChefHat className="w-3.5 h-3.5" />
                        Start Preparation
                      </button>
                    )}

                    {order.status === 'IN_PREPARATION' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'FOOD_READY')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark Food Ready
                      </button>
                    )}

                    {order.status === 'FOOD_READY' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'DISPATCHED')}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Bike className="w-3.5 h-3.5" />
                        Dispatch / Out for Delivery
                      </button>
                    )}

                    {order.status !== 'CANCELLED' && order.status !== 'DISPATCHED' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Cancel order ${order.orderNumber}?`)) {
                            handleUpdateStatus(order.id, 'CANCELLED');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 font-medium text-xs transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {/* Action Notice feedback */}
                  {actionNotice && actionNotice.id === order.id && (
                    <span className={`text-xs font-semibold ${
                      actionNotice.type === 'success' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {actionNotice.text}
                    </span>
                  )}

                  {/* View KOT Slip Preview Button */}
                  <button
                    type="button"
                    onClick={() => setActiveKotPreview(order)}
                    className="text-xs text-white/50 hover:text-[#e8a33d] flex items-center gap-1 cursor-pointer"
                  >
                    <span>View 80mm Slip</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: 80mm KOT Thermal Slip Preview */}
      {activeKotPreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#14100d] border border-white/10 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#e8a33d]" />
                <h4 className="font-bold text-sm">80mm POS Slip Preview</h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveKotPreview(null)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal paper receipt look */}
            <div className="bg-white text-black p-4 rounded-xl font-mono text-xs shadow-inner whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto border border-gray-300">
              {formatKotTicketText(activeKotPreview)}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex gap-2">
              <button
                type="button"
                onClick={() => printKotTicket(activeKotPreview)}
                className="flex-1 py-2 rounded-xl bg-[#e8a33d] text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#f3b55c]"
              >
                <Printer className="w-4 h-4" />
                Print Ticket
              </button>
              <button
                type="button"
                onClick={() => downloadKotPdfLocally(activeKotPreview)}
                className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
