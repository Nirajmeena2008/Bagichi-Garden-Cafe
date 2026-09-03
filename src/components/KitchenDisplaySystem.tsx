import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ZomatoOrder, ZomatoOrderStatus } from '../types';
import { 
  printKotTicket, 
  formatKotTicketText, 
  updateZomatoOrderStatus, 
  createSimulatedZomatoOrder,
  SAMPLE_ZOMATO_ORDERS
} from '../lib/zomatoService';
import { cafeConfig } from '../data/cafeConfig';
import { soundManager } from '../lib/soundAlert';
import { saveKotPdfToGoogleDrive, downloadKotPdfLocally } from '../lib/kotPdfService';
import { getStoredDriveToken, initiateDriveAuth } from '../lib/googleDrive';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChefHat, 
  Clock, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  Play, 
  Plus, 
  ExternalLink, 
  FileText, 
  Bike, 
  RefreshCw, 
  ShoppingBag, 
  Search, 
  Flame, 
  Check, 
  Trash2, 
  Sliders, 
  X,
  Phone,
  MapPin,
  Sparkles,
  Cloud,
  Download
} from 'lucide-react';

interface Props {
  isAdminView?: boolean;
}

export default function KitchenDisplaySystem({ isAdminView = false }: Props) {
  const [orders, setOrders] = useState<ZomatoOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderForKot, setSelectedOrderForKot] = useState<ZomatoOrder | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'PLACED' | 'IN_PREPARATION' | 'FOOD_READY' | 'DISPATCHED'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sound controls
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [volume, setVolume] = useState(soundManager.getVolume());
  const [customSoundUrl, setCustomSoundUrl] = useState(soundManager.getCustomSoundUrl() || '');
  const [soundTestSuccess, setSoundTestSuccess] = useState(false);

  // Time ticker for live elapsed timers (updates every 5 seconds)
  const [, setTicker] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTicker(t => t + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  // Track known orders to ring bell only on NEW arrivals
  const initialLoadDone = useRef(false);
  const knownOrderIds = useRef<Set<string>>(new Set());
  const [savingDriveOrderId, setSavingDriveOrderId] = useState<string | null>(null);
  const [hasDriveToken, setHasDriveToken] = useState<boolean>(Boolean(getStoredDriveToken()));

  useEffect(() => {
    setHasDriveToken(Boolean(getStoredDriveToken()));
  }, []);

  const handleSaveOrderToDrive = async (order: ZomatoOrder) => {
    setSavingDriveOrderId(order.id);
    const token = getStoredDriveToken();
    if (!token) {
      initiateDriveAuth(
        async () => {
          setHasDriveToken(true);
          try {
            await saveKotPdfToGoogleDrive(order);
          } catch (e) {
            console.error("Failed saving KOT PDF to Drive:", e);
          } finally {
            setSavingDriveOrderId(null);
          }
        },
        () => setSavingDriveOrderId(null)
      );
    } else {
      try {
        await saveKotPdfToGoogleDrive(order);
      } catch (e) {
        console.error("Failed saving KOT PDF to Drive:", e);
      } finally {
        setSavingDriveOrderId(null);
      }
    }
  };

  useEffect(() => {
    const ordersCol = collection(db, 'zomatoOrders');
    const q = query(ordersCol, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: ZomatoOrder[] = [];
      let hasNewPlacedOrder = false;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const order: ZomatoOrder = {
          id: docSnap.id,
          orderNumber: data.orderNumber || `ZOM-${docSnap.id.slice(0, 4)}`,
          kotNumber: data.kotNumber || 'KOT-101',
          channel: data.channel || 'ZOMATO',
          customerName: data.customerName || 'Zomato Guest',
          customerPhone: data.customerPhone || '',
          deliveryAddress: data.deliveryAddress || '',
          cookingInstructions: data.cookingInstructions || '',
          riderName: data.riderName || '',
          riderPhone: data.riderPhone || '',
          riderEtaMinutes: data.riderEtaMinutes || 15,
          items: data.items || [],
          totalAmount: data.totalAmount || 0,
          status: data.status || 'PLACED',
          prepTimeMinutes: data.prepTimeMinutes || 25,
          kotPrinted: !!data.kotPrinted,
          kotPrintedAt: data.kotPrintedAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          foodReadyAt: data.foodReadyAt,
          dispatchedAt: data.dispatchedAt,
        };
        fetched.push(order);

        // Detect if this is a newly arrived order with status PLACED
        if (initialLoadDone.current && !knownOrderIds.current.has(order.id) && order.status === 'PLACED') {
          hasNewPlacedOrder = true;
        }
        knownOrderIds.current.add(order.id);
      });

      if (hasNewPlacedOrder) {
        soundManager.playOrderAlert();
      }

      setOrders(fetched);
      setLoading(false);
      initialLoadDone.current = true;
    }, (err) => {
      console.error('Error fetching Zomato orders from Firestore:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helper to calculate elapsed minutes
  const getElapsedMinutes = (order: ZomatoOrder): number => {
    if (!order.createdAt) return 0;
    const orderTime = order.createdAt.toDate ? order.createdAt.toDate().getTime() : new Date(order.createdAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((now - orderTime) / (1000 * 60)));
  };

  // Handle Accepting Order & Printing KOT
  const handleAcceptOrder = async (order: ZomatoOrder) => {
    try {
      await updateZomatoOrderStatus(order.id, 'IN_PREPARATION', {
        kotPrinted: true,
        kotPrintedAt: new Date().toISOString()
      });
      // Sound feedback for chef acknowledgment
      soundManager.playReservationAlert();
      // Auto-trigger print ticket
      printKotTicket(order);
      // Auto-save KOT PDF to Google Drive 'kot' folder
      saveKotPdfToGoogleDrive(order).catch((err) => {
        console.warn("[Google Drive] KDS auto-save notice:", err);
      });
    } catch (err) {
      console.error('Error accepting order:', err);
    }
  };

  // Handle Mark Food Ready
  const handleMarkFoodReady = async (order: ZomatoOrder) => {
    try {
      await updateZomatoOrderStatus(order.id, 'FOOD_READY');
      soundManager.playReservationAlert();
    } catch (err) {
      console.error('Error marking food ready:', err);
    }
  };

  // Handle Handover to Rider
  const handleHandoverToRider = async (order: ZomatoOrder) => {
    try {
      await updateZomatoOrderStatus(order.id, 'DISPATCHED');
    } catch (err) {
      console.error('Error dispatching order:', err);
    }
  };

  // Toggle item completed state in kitchen
  const handleToggleItemCheck = async (order: ZomatoOrder, itemIdx: number) => {
    const updatedItems = [...order.items];
    updatedItems[itemIdx] = {
      ...updatedItems[itemIdx],
      isCompletedInKitchen: !updatedItems[itemIdx].isCompletedInKitchen
    };
    try {
      const orderRef = doc(db, 'zomatoOrders', order.id);
      await updateDoc(orderRef, { items: updatedItems });
    } catch (err) {
      console.error('Error updating item check:', err);
    }
  };

  // Trigger test sound
  const handleTestSound = () => {
    soundManager.playOrderAlert();
    setSoundTestSuccess(true);
    setTimeout(() => setSoundTestSuccess(false), 2000);
  };

  // Trigger Simulated Order
  const handleSimulateOrder = async (presetIdx: number) => {
    setIsSimulating(true);
    try {
      const sample = SAMPLE_ZOMATO_ORDERS[presetIdx];
      await createSimulatedZomatoOrder(sample);
      setShowSimulateModal(false);
    } catch (err) {
      console.error('Failed to simulate order:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter(o => {
    const matchesTab = activeTab === 'all' || o.status === activeTab;
    const matchesQuery = 
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.kotNumber && o.kotNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      o.items.some(it => it.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesQuery;
  });

  // Categorized for Kanban
  const placedOrders = filteredOrders.filter(o => o.status === 'PLACED');
  const prepOrders = filteredOrders.filter(o => o.status === 'IN_PREPARATION');
  const readyOrders = filteredOrders.filter(o => o.status === 'FOOD_READY');
  const dispatchedOrders = filteredOrders.filter(o => o.status === 'DISPATCHED');

  return (
    <div className="w-full space-y-6">
      {/* ----------------- TOP CONTROLS & SOUND DASHBOARD ----------------- */}
      <div className="bg-[#14110e] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#e8a33d]/15 border border-[#e8a33d]/30 flex items-center justify-center text-[#e8a33d]">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                  {cafeConfig.name} • Kitchen Display (KDS) & POS
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">
                  ● Live Kitchen Feed
                </span>
              </div>
              <p className="text-xs text-white/50">
                Direct Website Orders • Instant Kitchen Tickets (KOT) • Real-Time Chef Prep Tracking
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Sound Notification Controller */}
            <div className="flex items-center gap-1.5 bg-[#0a0908] border border-white/10 px-3 py-1.5 rounded-xl">
              <button
                onClick={() => {
                  const nextMute = !isMuted;
                  setIsMuted(nextMute);
                  soundManager.setMuted(nextMute);
                }}
                className={`p-1.5 rounded-lg transition-colors ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}
                title={isMuted ? "Sound Muted (Click to Unmute)" : "Sound Active (Click to Mute)"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={handleTestSound}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                title="Play test order chime through speakers"
              >
                <Play className="w-3 h-3 text-[#e8a33d]" />
                <span>{soundTestSuccess ? 'Chiming...' : 'Test Bell'}</span>
              </button>

              <button
                onClick={() => setShowSoundSettings(true)}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                title="Audio volume & settings"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Google Drive Status Pill */}
            <div className="flex items-center gap-1.5 bg-[#0a0908] border border-white/10 px-3 py-1.5 rounded-xl text-xs">
              <Cloud className={`w-3.5 h-3.5 ${hasDriveToken ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="text-white/70">
                Drive: <strong className="text-white">/kot</strong>
              </span>
              {!hasDriveToken ? (
                <button
                  type="button"
                  onClick={() => {
                    initiateDriveAuth(
                      () => setHasDriveToken(true),
                      () => {}
                    );
                  }}
                  className="ml-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[10px] font-bold transition-colors"
                >
                  Connect
                </button>
              ) : (
                <span className="ml-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  Sync Ready
                </span>
              )}
            </div>

            {/* Test Kitchen Order Button */}
            <button
              onClick={() => setShowSimulateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#e8a33d] hover:bg-[#f3b55c] text-black font-bold text-xs shadow-lg transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Test Order Ticket</span>
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/10">
          <div className="bg-[#0a0908] p-3 rounded-xl border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">New / Alerting</span>
              <p className="text-xl font-bold text-amber-400">{orders.filter(o => o.status === 'PLACED').length}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[#0a0908] p-3 rounded-xl border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">In Kitchen (KOT)</span>
              <p className="text-xl font-bold text-[#e8a33d]">{orders.filter(o => o.status === 'IN_PREPARATION').length}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#e8a33d]/10 flex items-center justify-center text-[#e8a33d]">
              <Flame className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[#0a0908] p-3 rounded-xl border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Food Ready</span>
              <p className="text-xl font-bold text-emerald-400">{orders.filter(o => o.status === 'FOOD_READY').length}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[#0a0908] p-3 rounded-xl border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Handed to Rider</span>
              <p className="text-xl font-bold text-blue-400">{orders.filter(o => o.status === 'DISPATCHED').length}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Bike className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* ----------------- SEARCH & TABS ----------------- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Orders', count: orders.length },
            { id: 'PLACED', label: 'New Alerting', count: orders.filter(o => o.status === 'PLACED').length },
            { id: 'IN_PREPARATION', label: 'Cooking (KOT)', count: orders.filter(o => o.status === 'IN_PREPARATION').length },
            { id: 'FOOD_READY', label: 'Ready for Pickup', count: orders.filter(o => o.status === 'FOOD_READY').length },
            { id: 'DISPATCHED', label: 'Dispatched', count: orders.filter(o => o.status === 'DISPATCHED').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-[#e8a33d] text-black font-bold'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === tab.id ? 'bg-black/20 text-black' : 'bg-white/10 text-white/50'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search order # or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#120f0d] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#e8a33d]"
          />
        </div>
      </div>

      {/* ----------------- KDS KANBAN COLUMNS ----------------- */}
      {loading ? (
        <div className="py-20 text-center text-white/40 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#e8a33d]" />
          <span>Synchronizing Kitchen Display System...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-[#14110e] border border-dashed border-white/10 rounded-2xl space-y-3">
          <ChefHat className="w-10 h-10 text-white/20 mx-auto" />
          <p className="text-white/60 text-sm">No active kitchen orders matching this view.</p>
          <button
            onClick={() => handleSimulateOrder(0)}
            className="px-4 py-2 rounded-xl bg-[#e8a33d]/20 text-[#e8a33d] border border-[#e8a33d]/40 text-xs font-semibold hover:bg-[#e8a33d]/30 transition-colors"
          >
            Create a Test Kitchen Ticket
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Order Cards */}
          {filteredOrders.map((order) => {
            const elapsed = getElapsedMinutes(order);
            const isAlerting = order.status === 'PLACED';
            const isCooking = order.status === 'IN_PREPARATION';
            const isReady = order.status === 'FOOD_READY';
            const isDispatched = order.status === 'DISPATCHED';

            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex flex-col bg-[#120f0d] rounded-2xl border transition-all shadow-xl overflow-hidden ${
                  isAlerting 
                    ? 'border-amber-500/60 ring-2 ring-amber-500/20 bg-[#171109]' 
                    : isCooking 
                    ? 'border-[#e8a33d]/40' 
                    : isReady
                    ? 'border-emerald-500/40'
                    : 'border-white/10 opacity-75'
                }`}
              >
                {/* Header Badge */}
                <div className={`px-4 py-2.5 flex items-center justify-between border-b ${
                  isAlerting 
                    ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' 
                    : isCooking 
                    ? 'bg-[#e8a33d]/15 border-[#e8a33d]/20 text-[#e8a33d]' 
                    : isReady
                    ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-white/60'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs">
                      {order.orderNumber}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 font-mono font-semibold">
                      {order.kotNumber || 'KOT-NEW'}
                    </span>
                  </div>

                  {/* Elapsed Timer */}
                  <div className="flex items-center gap-1 text-xs font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span className={elapsed > 20 ? 'text-red-400 font-bold' : elapsed > 10 ? 'text-amber-400' : 'text-emerald-400'}>
                      {elapsed}m ago
                    </span>
                  </div>
                </div>

                {/* Customer & Rider Info */}
                <div className="p-4 space-y-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-white font-bold text-sm tracking-wide">
                        {order.customerName}
                      </h4>
                      {order.customerPhone && (
                        <p className="text-[11px] text-white/50 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {order.customerPhone}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-[#e8a33d]">
                        ₹{order.totalAmount}
                      </span>
                      <p className="text-[10px] text-white/40 uppercase font-semibold">
                        {order.channel}
                      </p>
                    </div>
                  </div>

                  {/* Rider Info if available */}
                  {order.riderName && (
                    <div className="p-2 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between text-[11px] text-white/80">
                      <div className="flex items-center gap-1.5">
                        <Bike className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-medium">{order.riderName}</span>
                      </div>
                      <span className="text-white/50 text-[10px]">ETA ~{order.riderEtaMinutes || 12}m</span>
                    </div>
                  )}

                  {/* SPECIAL CHEF INSTRUCTIONS - Highlighted Alert */}
                  {order.cookingInstructions && (
                    <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400">
                        <AlertTriangle className="w-3 h-3" /> Special Cooking Notes:
                      </div>
                      <p className="font-medium text-[11px] leading-snug">
                        "{order.cookingInstructions}"
                      </p>
                    </div>
                  )}

                  {/* Item Checklist */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider flex items-center justify-between">
                      <span>Kitchen Items ({order.items.length})</span>
                      <span className="text-[9px] text-white/30">Tap to tick</span>
                    </div>

                    {order.items.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleToggleItemCheck(order, idx)}
                        className={`w-full text-left p-2 rounded-lg border transition-colors flex items-start gap-2.5 ${
                          item.isCompletedInKitchen
                            ? 'bg-emerald-950/20 border-emerald-500/20 text-white/40 line-through'
                            : 'bg-[#080706] border-white/5 hover:border-white/10 text-white'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center flex-shrink-0 text-[10px] border ${
                          item.isCompletedInKitchen
                            ? 'bg-emerald-500 text-black border-emerald-500'
                            : 'border-white/30 text-transparent'
                        }`}>
                          <Check className="w-3 h-3" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>{item.name}</span>
                            <span className="font-mono text-[#e8a33d] font-bold text-sm">[{item.quantity}x]</span>
                          </div>
                          {item.customization && (
                            <p className="text-[10px] text-amber-400/80 italic mt-0.5">
                              {item.customization}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-3 bg-[#0a0908] border-t border-white/10 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {/* View / Print KOT */}
                    <button
                      onClick={() => {
                        setSelectedOrderForKot(order);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-semibold transition-colors"
                      title="View or print 80mm Kitchen Order Ticket"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#e8a33d]" />
                      <span>{order.kotPrinted ? 'KOT Slip' : 'Print KOT'}</span>
                    </button>

                    {/* Step Action Button */}
                    {isAlerting && (
                      <button
                        onClick={() => handleAcceptOrder(order)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept & KOT</span>
                      </button>
                    )}

                    {isCooking && (
                      <button
                        onClick={() => handleMarkFoodReady(order)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg transition-all"
                      >
                        <ChefHat className="w-3.5 h-3.5" />
                        <span>Food Ready</span>
                      </button>
                    )}

                    {isReady && (
                      <button
                        onClick={() => handleHandoverToRider(order)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-black font-bold text-xs shadow-lg transition-all"
                      >
                        <Bike className="w-3.5 h-3.5" />
                        <span>To Rider</span>
                      </button>
                    )}

                    {isDispatched && (
                      <span className="flex-1 text-center py-2 text-xs font-semibold text-white/40">
                        Dispatched ✓
                      </span>
                    )}
                  </div>

                  {/* Google Drive KOT PDF Actions Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                    {order.kotDrivePdfUrl ? (
                      <a
                        href={order.kotDrivePdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                        title="View KOT PDF stored in Google Drive /kot folder"
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        <span>Drive PDF (/kot)</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSaveOrderToDrive(order)}
                        disabled={savingDriveOrderId === order.id}
                        className="flex items-center gap-1.5 text-[#e8a33d] hover:text-amber-300 transition-colors disabled:opacity-50"
                        title="Save 80mm KOT PDF directly to Google Drive 'kot' folder"
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        <span>{savingDriveOrderId === order.id ? "Saving PDF..." : "Save PDF to Drive (kot)"}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => downloadKotPdfLocally(order)}
                      className="flex items-center gap-1 text-white/40 hover:text-white transition-colors"
                      title="Download KOT PDF locally"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ----------------- KOT TICKET POPUP MODAL ----------------- */}
      <AnimatePresence>
        {selectedOrderForKot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#14110e] border border-[#e8a33d]/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 bg-[#1a1612] border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#e8a33d]/20 text-[#e8a33d] flex items-center justify-center">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-white font-mono font-bold text-sm">
                      Kitchen Order Ticket ({selectedOrderForKot.kotNumber || 'KOT'})
                    </h3>
                    <p className="text-[11px] text-white/50">80mm Thermal Receipt Layout</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedOrderForKot.kotDrivePdfUrl ? (
                    <a
                      href={selectedOrderForKot.kotDrivePdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all"
                      title="Open KOT PDF stored in Google Drive /kot folder"
                    >
                      <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Drive PDF (/kot)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <button
                      onClick={async () => {
                        await handleSaveOrderToDrive(selectedOrderForKot);
                      }}
                      disabled={savingDriveOrderId === selectedOrderForKot.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all disabled:opacity-50"
                      title="Save KOT PDF directly into Google Drive 'kot' folder"
                    >
                      <Cloud className="w-3.5 h-3.5 text-[#e8a33d]" />
                      <span>{savingDriveOrderId === selectedOrderForKot.id ? "Saving..." : "Save to Drive (/kot)"}</span>
                    </button>
                  )}

                  <button
                    onClick={() => downloadKotPdfLocally(selectedOrderForKot)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                    title="Download 80mm PDF ticket locally"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>

                  <button
                    onClick={() => printKotTicket(selectedOrderForKot)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e8a33d] hover:bg-[#f3b55c] text-black text-xs font-bold transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print 80mm</span>
                  </button>
                  <button
                    onClick={() => setSelectedOrderForKot(null)}
                    className="p-1.5 text-white/50 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Thermal Ticket Content */}
              <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-white/90 bg-[#080706]">
                <pre className="whitespace-pre-wrap select-text selection:bg-[#e8a33d] selection:text-black">
                  {formatKotTicketText(selectedOrderForKot)}
                </pre>
              </div>

              <div className="px-6 py-3 bg-[#1a1612] border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                <span>Direct thermal printer emulation ready</span>
                <button
                  onClick={() => setSelectedOrderForKot(null)}
                  className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------- SIMULATOR MODAL ----------------- */}
      <AnimatePresence>
        {showSimulateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-[#14110e] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base">Kitchen Ticket (KOT) Test Generator</h3>
                    <p className="text-xs text-white/50">Test kitchen alert chimes, KOT tickets & chef prep flow</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSimulateModal(false)}
                  className="p-1.5 text-white/50 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-white/70 leading-relaxed">
                Click any preset below to generate an incoming food order into {cafeConfig.shortName} kitchen. This instantly triggers the alert sound, registers the ticket on the KDS, and formats the printable 80mm KOT slip:
              </p>

              <div className="space-y-3">
                {SAMPLE_ZOMATO_ORDERS.map((sample, idx) => (
                  <button
                    key={idx}
                    disabled={isSimulating}
                    onClick={() => handleSimulateOrder(idx)}
                    className="w-full text-left p-4 rounded-2xl bg-[#0a0908] hover:bg-white/5 border border-white/10 hover:border-[#e8a33d]/50 transition-all flex items-center justify-between group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm group-hover:text-[#e8a33d] transition-colors">
                          {sample.customerName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/70 font-mono">
                          ₹{sample.totalAmount}
                        </span>
                      </div>
                      <p className="text-xs text-white/60">
                        {sample.items.map(i => `${i.quantity}x ${i.name}`).join(' • ')}
                      </p>
                      {sample.cookingInstructions && (
                        <p className="text-[11px] text-amber-400 italic">
                          "{sample.cookingInstructions}"
                        </p>
                      )}
                    </div>
                    <span className="px-3 py-1.5 rounded-xl bg-[#e8a33d]/20 text-[#e8a33d] text-xs font-bold group-hover:bg-[#e8a33d] group-hover:text-black transition-all">
                      Send Order
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------- SOUND SETTINGS MODAL ----------------- */}
      <AnimatePresence>
        {showSoundSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#14110e] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#e8a33d]/20 text-[#e8a33d] flex items-center justify-center">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">POS & Kitchen Sound Settings</h3>
                    <p className="text-[11px] text-white/50">Configure order chime & reservation alerts</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSoundSettings(false)}
                  className="p-1.5 text-white/50 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Volume Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70">Master Alert Volume</span>
                  <span className="font-mono text-[#e8a33d] font-bold">{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    soundManager.setVolume(val);
                  }}
                  className="w-full accent-[#e8a33d] cursor-pointer"
                />
              </div>

              {/* Custom Audio URL override */}
              <div className="space-y-2">
                <label className="text-xs text-white/70 block">
                  Custom Sound URL (Optional Audio Link)
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/custom-bell.mp3"
                  value={customSoundUrl}
                  onChange={(e) => {
                    setCustomSoundUrl(e.target.value);
                    soundManager.setCustomSoundUrl(e.target.value || null);
                  }}
                  className="w-full bg-[#0a0908] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#e8a33d]"
                />
                <p className="text-[10px] text-white/40">
                  Leave empty to use the built-in loud synthesized restaurant kitchen service bell.
                </p>
              </div>

              {/* Test Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  onClick={handleTestSound}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 text-[#e8a33d]" />
                  <span>Test Kitchen Bell</span>
                </button>
                <button
                  onClick={() => setShowSoundSettings(false)}
                  className="px-6 py-2.5 rounded-xl bg-[#e8a33d] text-black text-xs font-bold hover:bg-[#f3b55c] transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
