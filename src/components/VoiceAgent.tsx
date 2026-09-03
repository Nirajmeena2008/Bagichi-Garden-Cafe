import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Loader2, CalendarCheck, Utensils, CheckCircle2, Sparkles, ExternalLink, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { pcmToBase64, base64ToPcm } from '../lib/audioUtils';
import { soundManager } from '../lib/soundAlert';

interface ConfirmedReservation {
  id: string;
  reservationNumber: string;
  name: string;
  guests: number;
  date: string;
  time: string;
  phone?: string;
}

interface ConfirmedOrder {
  id: string;
  orderNumber: string;
  kotNumber: string;
  totalAmount: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  channel: string;
  customerName: string;
}

export default function VoiceAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [confirmedReservation, setConfirmedReservation] = useState<ConfirmedReservation | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const nextPlaybackTimeRef = useRef<number>(0);

  const startCall = async () => {
    try {
      setStatus('connecting');
      setErrorMessage('');
      setIsTransferring(false);

      // Initialize Audio Contexts synchronously during user gesture
      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      
      // Some browsers need explicit resume
      if (inputCtx.state === 'suspended') inputCtx.resume();
      if (outputCtx.state === 'suspended') outputCtx.resume();

      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      nextPlaybackTimeRef.current = outputCtx.currentTime;

      // Determine websocket URL (secure or not depending on protocol)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const backendUrl = import.meta.env.VITE_WS_BACKEND_URL;
      const wsUrl = backendUrl ? `${backendUrl}/live` : `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setStatus('connected');

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              noiseSuppression: { ideal: true },
              echoCancellation: { ideal: true },
              autoGainControl: { ideal: true },
              channelCount: 1,
              sampleRate: 16000
            },
          });
          streamRef.current = stream;

          const source = inputCtx.createMediaStreamSource(stream);
          sourceRef.current = source;

          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
              const base64 = pcmToBase64(e.inputBuffer.getChannelData(0));
              ws.send(JSON.stringify({ audio: base64 }));
            }
            // Explicitly zero out the output buffer to prevent local echo (double voice)
            const outputBuffer = e.outputBuffer.getChannelData(0);
            for (let i = 0; i < outputBuffer.length; i++) {
              outputBuffer[i] = 0;
            }
          };

          source.connect(processor);
          processor.connect(inputCtx.destination);
          
        } catch (mediaErr) {
          console.error("Microphone error:", mediaErr);
          setErrorMessage('Microphone access denied or not available.');
          endCall();
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.action === 'reservation_created') {
            setConfirmedReservation(msg.data);
            try {
              soundManager.playReservationAlert();
            } catch (e) {
              console.warn("Audio alert error", e);
            }
            return;
          }

          if (msg.action === 'order_created') {
            setConfirmedOrder(msg.data);
            try {
              soundManager.playOrderAlert();
              localStorage.setItem('thebagichi_last_order_id', msg.data.id);
              localStorage.setItem('thebagichi_last_order_num', msg.data.orderNumber);
            } catch (e) {
              console.warn("Storage/alert error", e);
            }
            return;
          }

          if (msg.action === 'transfer_to_manager') {
            setIsTransferring(true);
            endCall();
            return;
          }
          
          if (msg.interrupted) {
            // Stop playback, clear queue
            nextPlaybackTimeRef.current = outputAudioCtxRef.current?.currentTime || 0;
            return;
          }

          if (msg.audio) {
            playAudioChunk(msg.audio);
          }
        } catch (e) {
          console.error("Error processing message", e);
        }
      };

      ws.onclose = () => {
        if (status !== 'idle') {
          endCall();
        }
      };

      ws.onerror = (e) => {
        console.error("WebSocket error:", e);
        setErrorMessage('Connection error occurred.');
        endCall();
      };
      
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to start the call.');
      setStatus('error');
    }
  };

  const sendQuickPrompt = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ text }));
    }
  };

  const playAudioChunk = (base64Audio: string) => {
    const ctx = outputAudioCtxRef.current;
    if (!ctx) return;

    const pcmData = base64ToPcm(base64Audio);
    const audioBuffer = ctx.createBuffer(1, pcmData.length, 24000);
    audioBuffer.getChannelData(0).set(pcmData);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    // Keep a small buffer ahead of current time to avoid underrun issues
    const startTime = Math.max(nextPlaybackTimeRef.current, currentTime + 0.05); 
    
    source.start(startTime);
    nextPlaybackTimeRef.current = startTime + audioBuffer.duration;
  };

  const endCall = () => {
    setStatus('idle');
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end" id="voice-agent-container">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="voice-agent-modal"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center w-full max-w-sm bg-[#0e0c0a] rounded-[2.5rem] shadow-2xl p-6 border border-[#e8a33d]/20 overflow-hidden mb-4 relative max-h-[88vh] overflow-y-auto"
          >
            <button
              id="voice-agent-close-btn"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-50 text-[#f4f2ee]/50 hover:text-[#f4f2ee]/80 p-2 rounded-full transition-colors"
            >
              <PhoneOff className="w-5 h-5" />
            </button>

            {/* Background Decor */}
            <div className="absolute top-0 w-full h-80 bg-gradient-to-b from-[#e8a33d]/10 to-transparent pointer-events-none" />
            
            <div className="z-10 flex flex-col items-center max-w-md w-full">
              {/* Branding */}
              <div className="text-center mb-6 flex flex-col items-center">
                <div className="w-14 h-14 bg-[#e8a33d] rounded-2xl flex items-center justify-center mb-3 shadow-md border border-[#e8a33d]/30 overflow-hidden">
                  <img 
                    src="/instagram-logo.png" 
                    alt="The Bagichi Logo" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <span className="text-white font-bold text-2xl hidden">B</span>
                </div>
                <h1 className="text-2xl font-bold text-[#f4f2ee] tracking-tight mb-0.5">The Bagichi Garden</h1>
                <p className="text-[#e8a33d] font-semibold tracking-wider text-[11px] uppercase">AI Receptionist Aria</p>
                
                <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 bg-[#171412] rounded-full border border-[#e8a33d]/20 text-xs font-medium text-[#f4f2ee]/80">
                  <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-400 animate-pulse' : status === 'connecting' ? 'bg-amber-400 animate-ping' : 'bg-[#e8a33d]'}`} />
                  {status === 'connected' ? 'Live Connected & Listening' : status === 'connecting' ? 'Connecting...' : 'Ready to Assist'}
                </div>
              </div>

              {/* Central Orb / Call Button */}
              <div className="relative flex items-center justify-center w-48 h-48 mb-4">
                <AnimatePresence>
                  {status === 'connected' && (
                    <>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.4, scale: 1.25 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ repeat: Infinity, duration: 2, repeatType: "mirror" }}
                        className="absolute inset-0 rounded-full bg-[#e8a33d]/20 blur-xl"
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.25, scale: 1.5 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ repeat: Infinity, duration: 2.8, repeatType: "mirror", delay: 0.3 }}
                        className="absolute inset-0 rounded-full bg-[#e8a33d]/30 blur-2xl"
                      />
                    </>
                  )}
                </AnimatePresence>

                <button
                  id="voice-call-trigger-btn"
                  onClick={status === 'idle' || status === 'error' ? startCall : endCall}
                  disabled={status === 'connecting'}
                  className={`relative z-10 w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl ${
                    status === 'idle' || status === 'error'
                      ? 'bg-[#171412] hover:bg-[#1f1b17] border-4 border-[#e8a33d]/30 text-white shadow-[0_0_20px_rgba(0,0,0,0.5)]'
                      : status === 'connecting'
                      ? 'bg-[#171412] border-4 border-[#e8a33d]/20 text-[#f4f2ee]/50 cursor-not-allowed'
                      : 'bg-[#0e0c0a] border-4 border-[#e8a33d] text-[#e8a33d] shadow-[0_0_25px_rgba(232,163,61,0.35)] hover:bg-[#e8a33d]/10'
                  }`}
                >
                  {status === 'idle' || status === 'error' ? (
                    <>
                      <Phone className="w-8 h-8 mb-1.5 fill-current text-[#e8a33d]" />
                      <span className="font-bold tracking-wide text-xs uppercase text-[#f4f2ee]">Call Aria</span>
                    </>
                  ) : status === 'connecting' ? (
                    <Loader2 className="w-8 h-8 animate-spin text-[#e8a33d]" />
                  ) : (
                    <>
                      <PhoneOff className="w-8 h-8 mb-1.5 text-rose-500" />
                      <span className="font-bold tracking-wide text-xs uppercase text-rose-400">End Call</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status Text */}
              <div className="text-center min-h-[2.5rem] mb-3">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={status}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="font-medium text-xs text-[#f4f2ee]/70"
                  >
                    {status === 'idle' && <span>Tap Call Aria to order food or reserve a garden table</span>}
                    {status === 'connecting' && <span className="text-[#e8a33d]">Connecting voice stream...</span>}
                    {status === 'connected' && <span className="text-emerald-400 font-semibold">Speaking & Listening (Hindi / English)</span>}
                    {status === 'error' && <span className="text-rose-400">{errorMessage || 'An error occurred'}</span>}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Real-Time Reservation Card (Dispatched via Voice) */}
              {confirmedReservation && (
                <motion.div
                  id="voice-confirmed-reservation-card"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="w-full bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3.5 mb-3 text-left"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                      <CalendarCheck className="w-3.5 h-3.5" />
                      Table Reserved with Aria!
                    </span>
                    <span className="text-[11px] font-mono bg-emerald-900/60 text-emerald-200 px-2 py-0.5 rounded border border-emerald-500/30">
                      {confirmedReservation.reservationNumber}
                    </span>
                  </div>
                  <p className="text-xs text-[#f4f2ee]/90 font-medium">
                    {confirmedReservation.name} • {confirmedReservation.guests} Guests
                  </p>
                  <p className="text-[11px] text-[#f4f2ee]/60">
                    {confirmedReservation.date} at {confirmedReservation.time}
                  </p>
                  <a
                    href="/manage-booking"
                    className="mt-2.5 inline-flex items-center gap-1 text-[11px] text-[#e8a33d] hover:text-[#f3b55a] font-semibold"
                  >
                    View / Manage Booking <ArrowRight className="w-3 h-3" />
                  </a>
                </motion.div>
              )}

              {/* Real-Time Order Card (Dispatched via Voice) */}
              {confirmedOrder && (
                <motion.div
                  id="voice-confirmed-order-card"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="w-full bg-amber-950/40 border border-[#e8a33d]/40 rounded-2xl p-3.5 mb-3 text-left"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-[#e8a33d] font-bold text-xs">
                      <Utensils className="w-3.5 h-3.5" />
                      Order Sent to Kitchen KDS!
                    </span>
                    <span className="text-[11px] font-mono bg-[#e8a33d]/20 text-[#f3b55a] px-2 py-0.5 rounded border border-[#e8a33d]/30">
                      {confirmedOrder.orderNumber}
                    </span>
                  </div>
                  <div className="text-xs text-[#f4f2ee]/90 space-y-0.5 mb-1.5">
                    {confirmedOrder.items.map((it, idx) => (
                      <p key={idx} className="truncate">
                        {it.quantity}x {it.name}
                      </p>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#e8a33d]/20 text-[11px]">
                    <span className="text-[#f4f2ee]/60">KOT: {confirmedOrder.kotNumber}</span>
                    <span className="font-bold text-[#e8a33d]">Total: ₹{confirmedOrder.totalAmount}</span>
                  </div>
                  <a
                    href={`/track?orderId=${confirmedOrder.id}`}
                    className="mt-2.5 inline-flex items-center justify-center w-full gap-1.5 py-1.5 bg-[#e8a33d] text-stone-900 rounded-lg text-xs font-bold hover:bg-[#f3b55a] transition-colors shadow-sm"
                  >
                    Track Live Kitchen Preparation <ExternalLink className="w-3 h-3" />
                  </a>
                </motion.div>
              )}

              {/* Quick Spoken Action Suggestions */}
              {status === 'connected' && (
                <div className="w-full mb-3 space-y-1.5">
                  <p className="text-[10px] uppercase font-bold text-[#e8a33d] tracking-wider text-left pl-1">
                    Try Saying or Tapping:
                  </p>
                  <button
                    onClick={() => sendQuickPrompt("I want to book a garden table for 4 people tonight at 8 PM under the name Rahul Sharma")}
                    className="w-full text-left text-[11px] p-2 bg-[#171412] hover:bg-[#201c18] border border-stone-800 hover:border-[#e8a33d]/40 rounded-xl text-[#f4f2ee]/80 transition-all flex items-center justify-between"
                  >
                    <span>"Book a table for 4 tonight at 8 PM"</span>
                    <Sparkles className="w-3 h-3 text-[#e8a33d] shrink-0" />
                  </button>
                  <button
                    onClick={() => sendQuickPrompt("Please place an order for 2 Dal Makhani and 4 Butter Naan for delivery")}
                    className="w-full text-left text-[11px] p-2 bg-[#171412] hover:bg-[#201c18] border border-stone-800 hover:border-[#e8a33d]/40 rounded-xl text-[#f4f2ee]/80 transition-all flex items-center justify-between"
                  >
                    <span>"Order 2 Dal Makhani & 4 Butter Naan"</span>
                    <Sparkles className="w-3 h-3 text-[#e8a33d] shrink-0" />
                  </button>
                </div>
              )}

              {/* Instructions / Transfer notice */}
              {isTransferring && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 mb-3 text-center">
                  Connecting you to our restaurant manager on phone...
                </div>
              )}

              <div className="mt-1 text-center w-full">
                <div className="bg-[#14110e] p-3 rounded-xl border border-[#e8a33d]/15 shadow-sm">
                  <p className="text-[10px] font-bold text-[#e8a33d] uppercase tracking-wider mb-1">Live AI Receptionist</p>
                  <p className="text-xs text-[#f4f2ee]/70 leading-relaxed">
                    Aria speaks both Hindi and English. She directly checks menu items, dispatches orders to our KDS, and secures table reservations.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        id="voice-agent-toggle-floating-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          isOpen ? "bg-[#e8a33d]/20 text-[#e8a33d] hover:bg-[#e8a33d]/30 scale-90" : "bg-[#e8a33d] text-stone-900 hover:bg-[#f3b55a] hover:scale-105 shadow-[0_0_20px_rgba(232,163,61,0.4)]"
        }`}
        aria-label="Toggle Voice Assistant"
      >
        <Phone className="w-6 h-6 fill-current" />
      </button>
    </div>
  );
}

