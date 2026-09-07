import React, { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { soundManager } from '../lib/soundAlert';
import { Bell, Volume2, VolumeX, ChefHat, X, ExternalLink, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AlertOrder {
  id: string;
  orderNumber?: string;
  kotNumber?: string;
  customerName?: string;
  totalAmount?: number;
  channel?: string;
  itemsCount?: number;
  time: string;
}

export default function AdminOrderAlertWatcher() {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [activeAlert, setActiveAlert] = useState<AlertOrder | null>(null);
  const [isMuted, setIsMuted] = useState(() => soundManager.getMuted());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });

  const isInitialLoad = useRef(true);
  const knownOrderIds = useRef<Set<string>>(new Set());
  const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Only run for authenticated admin user
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setAdminUser(user);
    });
    return () => unsubAuth();
  }, []);

  // 2. Real-time listener for incoming orders ONLY when admin is logged in
  useEffect(() => {
    if (!adminUser) {
      setActiveAlert(null);
      return;
    }

    const qOrders = query(collection(db, 'zomatoOrders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(
      qOrders,
      (snapshot) => {
        let incomingOrder: AlertOrder | null = null;

        snapshot.docs.forEach((docSnap) => {
          const docId = docSnap.id;
          const data = docSnap.data();

          if (!isInitialLoad.current && !knownOrderIds.current.has(docId)) {
            // This is a brand new order received since admin logged in
            if (!incomingOrder) {
              const items = Array.isArray(data.items) ? data.items : [];
              incomingOrder = {
                id: docId,
                orderNumber: data.orderNumber || data.kotNumber || 'NEW',
                kotNumber: data.kotNumber || data.orderNumber || '101',
                customerName: data.customerName || 'Customer',
                totalAmount: Number(data.totalAmount) || 0,
                channel: data.channel || 'WEBSITE',
                itemsCount: items.reduce((sum: number, i: any) => sum + (Number(i.quantity) || 1), 0) || items.length || 1,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
              };
            }
          }
          knownOrderIds.current.add(docId);
        });

        // Mark initial snapshot as consumed
        if (isInitialLoad.current) {
          isInitialLoad.current = false;
          return;
        }

        // If a new order was detected, trigger the KOT bell on the admin device!
        if (incomingOrder) {
          // Play loud dual-tone kitchen alert bell on this admin device
          soundManager.playOrderAlert();
          setActiveAlert(incomingOrder);

          // Clear previous timeout and auto-dismiss banner after 12 seconds
          if (dismissTimeoutRef.current) {
            clearTimeout(dismissTimeoutRef.current);
          }
          dismissTimeoutRef.current = setTimeout(() => {
            setActiveAlert(null);
          }, 12000);

          // Trigger native system notification if supported & granted
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`🔔 New Kitchen Order #${incomingOrder.orderNumber}`, {
                body: `${incomingOrder.customerName} placed an order for ₹${incomingOrder.totalAmount} (${incomingOrder.itemsCount} items).`,
                icon: '/the-bagichi-logo.png',
                tag: incomingOrder.id
              });
            } catch (err) {
              console.warn('[AdminOrderAlertWatcher] Native notification error:', err);
            }
          }
        }
      },
      (err) => {
        console.warn('[AdminOrderAlertWatcher] Snapshot error:', err);
      }
    );

    return () => {
      unsubOrders();
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, [adminUser]);

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
      } catch (err) {
        console.warn('Notification permission error:', err);
      }
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    soundManager.setMuted(next);
    setIsMuted(next);
  };

  const testBell = () => {
    soundManager.testOrderAlert();
  };

  // If no admin user is logged in, do not render any watcher UI or alerts
  if (!adminUser) {
    return null;
  }

  return (
    <>
      {/* Floating Alert Banner when a new order arrives */}
      {activeAlert && (
        <aside 
          aria-label="Incoming Kitchen Order Notification"
          className="fixed top-4 right-4 z-[9999] max-w-md w-[calc(100vw-2rem)] bg-[#0e0c0a] border-2 border-[#e8a33d] shadow-[0_10px_40px_rgba(232,163,61,0.35)] rounded-2xl p-4 text-white animate-in slide-in-from-top-4 duration-300 pointer-events-auto"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e8a33d] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#e8a33d]"></span>
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#e8a33d]/20 text-[#e8a33d] text-[11px] font-bold uppercase tracking-wider">
                <Bell className="w-3.5 h-3.5 animate-bounce" />
                <span>KOT Bell Ringing</span>
              </div>
              <span className="text-white/40 text-xs">{activeAlert.time}</span>
            </div>

            <button
              onClick={() => setActiveAlert(null)}
              className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-3">
            <div className="flex items-baseline justify-between mb-1">
              <h4 className="font-serif font-bold text-base text-white">
                Order #{activeAlert.orderNumber}
              </h4>
              <span className="text-sm font-bold text-[#e8a33d]">
                ₹{activeAlert.totalAmount}
              </span>
            </div>
            <p className="text-xs text-white/80">
              Customer: <span className="font-semibold text-white">{activeAlert.customerName}</span>
            </p>
            <p className="text-[11px] text-white/50 mt-0.5">
              {activeAlert.itemsCount} Item(s) • Channel: {activeAlert.channel}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              onClick={() => setActiveAlert(null)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-[#e8a33d] to-[#d68f29] hover:from-[#f0af4b] hover:to-[#e8a33d] text-stone-950 font-bold text-xs shadow-md transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Open Admin Dashboard</span>
            </Link>

            <Link
              to="/kds"
              target="_blank"
              onClick={() => setActiveAlert(null)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition-colors"
            >
              <ChefHat className="w-3.5 h-3.5 text-[#e8a33d]" />
              <span>KDS</span>
            </Link>

            <button
              onClick={testBell}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
              title="Test Kitchen Bell"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* Floating persistent Admin Audio Status Pill (Discreet, bottom-right) */}
      <div 
        role="region"
        aria-label="Admin KOT Audio Status"
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 bg-[#12100e]/90 backdrop-blur-md border border-white/10 shadow-xl rounded-full px-3 py-1.5 text-xs text-white/70"
      >
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="font-medium text-white/90 hidden sm:inline">Admin KOT Bell:</span>
          <span className={isMuted ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
            {isMuted ? 'Muted' : 'Active'}
          </span>
        </div>

        <button
          onClick={testBell}
          className="p-1 rounded-full hover:bg-white/10 text-[#e8a33d] transition-colors"
          title="Test KOT Bell on this device"
        >
          <Bell className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={toggleMute}
          className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          title={isMuted ? 'Unmute KOT Bell' : 'Mute KOT Bell'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
        </button>

        {notificationPermission === 'default' && (
          <button
            onClick={requestNotificationPermission}
            className="ml-1 text-[10px] text-[#e8a33d] underline hover:text-white transition-colors hidden md:inline"
            title="Enable native desktop/mobile notifications"
          >
            Enable Background Alerts
          </button>
        )}
      </div>
    </>
  );
}
