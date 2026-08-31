import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { pcmToBase64, base64ToPcm } from './lib/audioUtils';

export default function App() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
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

      // Determine websocket URL (secure or not depending on protocol)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 w-full h-96 bg-gradient-to-b from-slate-200/50 to-transparent pointer-events-none" />
      
      <div className="z-10 flex flex-col items-center max-w-md w-full">
        {/* Branding */}
        <div className="text-center mb-12 flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-700 rounded-2xl flex items-center justify-center mb-6 shadow-md border border-emerald-600">
            <span className="text-white font-bold text-3xl">B</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Bagichi Garden</h1>
          <p className="text-slate-500 font-semibold tracking-wider text-xs uppercase">Cafe & Restaurant</p>
          <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm text-xs font-semibold text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
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
                  className="absolute inset-0 rounded-full bg-emerald-100 blur-xl"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 0.2, scale: 1.5 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ repeat: Infinity, duration: 3, repeatType: "mirror", delay: 0.2 }}
                  className="absolute inset-0 rounded-full bg-emerald-200 blur-2xl"
                />
              </>
            )}
          </AnimatePresence>

          <button
            onClick={status === 'idle' || status === 'error' ? startCall : endCall}
            disabled={status === 'connecting'}
            className={`relative z-10 w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl ${
              status === 'idle' || status === 'error'
                ? 'bg-slate-900 hover:bg-slate-800 border-4 border-slate-800 text-white shadow-slate-900/20'
                : status === 'connecting'
                ? 'bg-slate-100 border-4 border-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-white border-8 border-emerald-500 text-emerald-700 shadow-emerald-500/30 hover:bg-emerald-50'
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
              {status === 'idle' && <span className="text-slate-500">Tap to speak with our receptionist</span>}
              {status === 'connecting' && <span className="text-slate-400">Connecting to The Bagichi...</span>}
              {status === 'connected' && <span className="text-emerald-600">Processing Voice...</span>}
              {status === 'error' && <span className="text-rose-500">{errorMessage || 'An error occurred'}</span>}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Instructions/Help */}
        <div className="mt-auto pt-10 text-center w-full">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mx-auto max-w-sm">
            <p className="text-xs font-bold text-emerald-800 mb-1 uppercase">AI Persona 'Aria'</p>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              Ask about our menu, timings, table availability, or directions to our location on the Delhi-Jaipur highway.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
