const fs = require('fs');

const fullCode = `import React, { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, X, MessageSquare, Volume2, VolumeX, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  role: "user" | "model";
  text: string;
}

const VoiceAgent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: "Hello! I am the Bagichi voice assistant. How can I help you today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Setup Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN'; // Indian English, works well for mixed terms

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleSendMessage(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMessages((prev) => [...prev, { role: "model", text: "Microphone access was denied. Please allow microphone permissions or open the app in a new tab." }]);
        }
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    // Setup Speech Synthesis
    synthesisRef.current = window.speechSynthesis;

    return () => {
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
      setIsSpeaking(false);
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const userMessage: Message = { role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history: messages.map(m => ({ role: m.role, text: m.text }))
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      const modelMessage: Message = { role: "model", text: data.text };
      setMessages((prev) => [...prev, modelMessage]);
      
      if (audioEnabled) {
        speakText(data.text);
      }
    } catch (error: any) {
      console.error("Error communicating with AI:", error);
      setMessages((prev) => [...prev, { role: "model", text: error.message || "Sorry, I am having trouble connecting right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const speakText = (text: string) => {
    if (!synthesisRef.current) return;
    
    synthesisRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthesisRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="bg-[#0e0c0a] border border-[#e8a33d]/30 rounded-[2.5rem] shadow-2xl mb-4 w-[320px] sm:w-[360px] overflow-hidden flex flex-col relative"
          >
            {/* Call UI */}
            <div className="flex flex-col items-center pt-12 pb-32 h-[480px] relative">
              
              {/* Background animations */}
              {isSpeaking && (
                <div className="absolute inset-0 flex items-center justify-center top-[-100px]">
                  <div className="absolute w-48 h-48 bg-[#e8a33d]/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="absolute w-64 h-64 bg-[#e8a33d]/10 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
                </div>
              )}
              {isRecording && (
                <div className="absolute inset-0 flex items-center justify-center top-[-100px]">
                  <div className="absolute w-40 h-40 bg-red-500/20 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
                </div>
              )}

              {/* Avatar */}
              <div className="relative z-10 w-28 h-28 bg-[#171412] rounded-full border border-white/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(232,163,61,0.1)]">
                 {isLoading ? (
                   <Loader2 className="w-12 h-12 text-[#e8a33d] animate-spin" />
                 ) : (
                   <MessageSquare className="w-12 h-12 text-[#e8a33d]" />
                 )}
              </div>

              {/* Status text */}
              <h3 className="text-2xl font-semibold text-white mb-2">Bagichi Assistant</h3>
              <p className="text-sm font-medium h-6 flex items-center gap-2">
                 {isRecording ? (
                    <span className="text-red-400">Listening...</span>
                 ) : isLoading ? (
                    <span className="text-[#e8a33d]">Thinking...</span>
                 ) : isSpeaking ? (
                    <span className="text-green-400">Speaking...</span>
                 ) : (
                    <span className="text-white/50">Ready</span>
                 )}
              </p>

              {/* Current Transcript/Subtitles */}
              <div className="absolute bottom-32 px-6 w-full text-center">
                 {messages.length > 0 && (
                   <p className="text-sm text-white/80 line-clamp-3 leading-relaxed">
                     {messages[messages.length - 1].role === 'user' ? (
                        <span className="text-white/50">You: {messages[messages.length - 1].text}</span>
                     ) : (
                        messages[messages.length - 1].text
                     )}
                   </p>
                 )}
              </div>

              {/* Call Controls */}
              <div className="absolute bottom-8 flex items-center gap-6 z-10">
                 <button
                   onClick={() => {
                     setAudioEnabled(!audioEnabled);
                     if (isSpeaking) stopSpeaking();
                   }}
                   className={\`w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-white transition-colors hover:bg-white/20 \${!audioEnabled && 'text-red-400'}\`}
                   aria-label={audioEnabled ? "Disable audio" : "Enable audio"}
                 >
                   {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                 </button>

                 <button
                   onClick={toggleRecording}
                   className={\`w-16 h-16 rounded-full flex items-center justify-center transition-all \${
                     isRecording 
                        ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-110" 
                        : "bg-white/10 text-white hover:bg-white/20"
                   }\`}
                 >
                   {isRecording ? <PhoneOff className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
                 </button>

                 <button
                   onClick={() => setIsOpen(false)}
                   className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500 text-white hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-colors"
                 >
                   <PhoneOff className="w-6 h-6" />
                 </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={\`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 \${
          isOpen ? "bg-white/10 text-white hover:bg-white/20 scale-90" : "bg-[#e8a33d] text-black hover:bg-[#f3b55c] hover:scale-105 shadow-[0_0_20px_rgba(232,163,61,0.4)]"
        }\`}
        aria-label="Toggle Voice Assistant"
      >
        {isOpen ? <X className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
      </button>
    </div>
  );
};

export default VoiceAgent;
`;

fs.writeFileSync('src/components/VoiceAgent.tsx', fullCode);
console.log("Restored");
