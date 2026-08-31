import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { pcmToBase64, base64ToPcm } from '../lib/audioUtils';

export default function VoiceAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  
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

      // Determine websocket URL (secure or not depending on protocol)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const backendUrl = import.meta.env.VITE_WS_BACKEND_URL;
      const wsUrl = backendUrl ? `${backendUrl}/live` : `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setStatus('connected');
        
        // Initialize Audio Contexts
        const inputCtx = new AudioContext({ sampleRate: 16000 });
        const outputCtx = new AudioContext({ sampleRate: 24000 });
        inputAudioCtxRef.current = inputCtx;
        outputAudioCtxRef.current = outputCtx;
        nextPlaybackTimeRef.current = outputCtx.currentTime;

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              noiseSuppression: true,
              echoCancellation: true,
              autoGainControl: true,
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
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center w-full max-w-sm bg-[#0e0c0a] rounded-[2.5rem] shadow-2xl p-6 border border-[#e8a33d]/20 overflow-hidden mb-4 relative"
          >
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 z-50 text-[#f4f2ee]/50 hover:text-[#f4f2ee]/80"><PhoneOff className="w-5 h-5" /></button>
      {/* Background Decor */}
      <div className="absolute top-0 w-full h-96 bg-gradient-to-b from-[#e8a33d]/10 to-transparent pointer-events-none" />
      
      <div className="z-10 flex flex-col items-center max-w-md w-full">
        {/* Branding */}
        <div className="text-center mb-12 flex flex-col items-center">
          <div className="w-16 h-16 bg-[#e8a33d] rounded-2xl flex items-center justify-center mb-6 shadow-md border border-[#e8a33d]/30">
            <span className="text-white font-bold text-3xl">B</span>
          </div>
          <h1 className="text-3xl font-bold text-[#f4f2ee] tracking-tight mb-1">Bagichi Garden</h1>
          <p className="text-[#f4f2ee]/60 font-semibold tracking-wider text-xs uppercase">Cafe & Restaurant</p>
          <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 bg-[#0e0c0a] rounded-full border border-[#e8a33d]/20 shadow-sm text-xs font-semibold text-[#f4f2ee]/80">
            <span className="w-2 h-2 rounded-full bg-[#e8a33d] animate-pulse" />
            AI System Online
          </div>
        </div>

        {/* Central Orb / Call Button */}
        <div className="relative flex items-center justify-center w-64 h-64 mb-10">
          <AnimatePresence>
            {status === 'connected' && (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 0.4, scale: 1.2 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ repeat: Infinity, duration: 2, repeatType: "mirror" }}
                  className="absolute inset-0 rounded-full bg-[#e8a33d]/20 blur-xl"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 0.2, scale: 1.5 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ repeat: Infinity, duration: 3, repeatType: "mirror", delay: 0.2 }}
                  className="absolute inset-0 rounded-full bg-[#e8a33d]/30 blur-2xl"
                />
              </>
            )}
          </AnimatePresence>

          <button
            onClick={status === 'idle' || status === 'error' ? startCall : endCall}
            disabled={status === 'connecting'}
            className={`relative z-10 w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl ${
              status === 'idle' || status === 'error'
                ? 'bg-[#171412] hover:bg-[#1a1714] border-4 border-[#e8a33d]/20 text-white shadow-[0_0_20px_rgba(0,0,0,0.5)]'
                : status === 'connecting'
                ? 'bg-[#171412] border-4 border-[#e8a33d]/20 text-[#f4f2ee]/50 cursor-not-allowed'
                : 'bg-[#0e0c0a] border-8 border-[#e8a33d] text-[#e8a33d] shadow-[0_0_20px_rgba(232,163,61,0.3)] hover:bg-[#e8a33d]/10'
            }`}
          >
            {status === 'idle' || status === 'error' ? (
              <>
                <Phone className="w-10 h-10 mb-2 fill-current" />
                <span className="font-bold tracking-wide text-sm uppercase">Call Agent</span>
              </>
            ) : status === 'connecting' ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : (
              <>
                <PhoneOff className="w-10 h-10 mb-2 text-rose-500" />
                <span className="font-bold tracking-wide text-sm uppercase text-rose-600">End Call</span>
              </>
            )}
          </button>
        </div>

        {/* Status Text */}
        <div className="text-center h-16">
          <AnimatePresence mode="wait">
            <motion.p
              key={status}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="font-semibold text-sm"
            >
              {status === 'idle' && <span className="text-[#f4f2ee]/60">Tap to speak with our receptionist</span>}
              {status === 'connecting' && <span className="text-[#f4f2ee]/50">Connecting to The Bagichi...</span>}
              {status === 'connected' && <span className="text-[#e8a33d]">Processing Voice...</span>}
              {status === 'error' && <span className="text-rose-500">{errorMessage || 'An error occurred'}</span>}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Instructions/Help */}
        <div className="mt-auto pt-10 text-center w-full">
          <div className="bg-[#0e0c0a] p-4 rounded-xl border border-[#e8a33d]/20 shadow-sm mx-auto max-w-sm">
            <p className="text-xs font-bold text-[#e8a33d] mb-1 uppercase">AI Persona 'Aria'</p>
            <p className="text-sm text-[#f4f2ee]/80 font-medium leading-relaxed">
              Ask about our menu, timings, table availability, or directions to our location on the Delhi-Jaipur highway.
            </p>
          </div>
        </div>
      </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          isOpen ? "bg-[#e8a33d]/20 text-[#e8a33d] hover:bg-[#e8a33d]/30 scale-90" : "bg-[#e8a33d] text-white hover:bg-[#e8a33d] hover:scale-105 shadow-[0_0_20px_rgba(232,163,61,0.4)]"
        }`}
        aria-label="Toggle Voice Assistant"
      >
        <Phone className="w-7 h-7" />
      </button>
    </div>
  );
}
