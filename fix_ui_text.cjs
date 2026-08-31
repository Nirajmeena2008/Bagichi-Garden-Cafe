const fs = require('fs');

let code = fs.readFileSync('src/components/VoiceAgent.tsx', 'utf8');

// We will add a state for text input
const stateImports = `  const [inputText, setInputText] = useState("");
  const [showKeyboard, setShowKeyboard] = useState(false);`;

code = code.replace('const [audioEnabled, setAudioEnabled] = useState(true);', 'const [audioEnabled, setAudioEnabled] = useState(true);\n' + stateImports);

// We will add a Keyboard icon to lucide-react imports
code = code.replace('VolumeX, Loader2', 'VolumeX, Loader2, Keyboard, Send');

// We will update the toggleRecording function to handle unsupported
const newToggle = `  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setShowKeyboard(true);
      setMessages((prev) => [...prev, { role: "model", text: "Microphone not supported. Please use the text input." }]);
      return;
    }

    if (isRecording) {
      try { recognitionRef.current.stop(); } catch(e) {}
    } else {
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
      setIsSpeaking(false);
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        setIsRecording(false);
      }
    }
  };`;
code = code.replace(/  const toggleRecording = \(\) => \{[\s\S]*?  \};/, newToggle);

const formUI = `              {/* Current Transcript/Subtitles */}
              <div className="absolute bottom-32 px-6 w-full text-center flex flex-col items-center">
                 {messages.length > 0 && !showKeyboard && (
                   <p className="text-sm text-white/80 line-clamp-3 leading-relaxed mb-4">
                     {messages[messages.length - 1].role === 'user' ? (
                        <span className="text-white/50">You: {messages[messages.length - 1].text}</span>
                     ) : (
                        messages[messages.length - 1].text
                     )}
                   </p>
                 )}
                 
                 {/* Keyboard Input */}
                 <AnimatePresence>
                   {showKeyboard && (
                     <motion.form 
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: 10 }}
                       onSubmit={(e) => {
                         e.preventDefault();
                         handleSendMessage(inputText);
                         setInputText("");
                       }}
                       className="w-full flex items-center gap-2 bg-white/10 p-1 pl-4 rounded-full border border-white/20"
                     >
                       <input 
                         type="text" 
                         value={inputText}
                         onChange={(e) => setInputText(e.target.value)}
                         placeholder="Type a message..."
                         className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
                       />
                       <button 
                         type="submit"
                         disabled={!inputText.trim() || isLoading}
                         className="w-8 h-8 rounded-full bg-[#e8a33d] flex items-center justify-center text-black disabled:opacity-50"
                       >
                         <Send className="w-4 h-4" />
                       </button>
                     </motion.form>
                   )}
                 </AnimatePresence>
              </div>`;

code = code.replace(/              \{\/\* Current Transcript\/Subtitles \*\/\}[\s\S]*?              <\/div>/, formUI);

// Add the keyboard toggle button
const controlUI = `              {/* Call Controls */}
              <div className="absolute bottom-8 flex items-center gap-4 z-10">
                 <button
                   onClick={() => setShowKeyboard(!showKeyboard)}
                   className={\`w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white transition-colors hover:bg-white/20 \${showKeyboard && 'bg-white/20'}\`}
                   aria-label="Toggle Keyboard"
                 >
                   <Keyboard className="w-4 h-4" />
                 </button>
                 
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
                   className="w-12 h-12 rounded-full flex items-center justify-center bg-red-500 text-white hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-colors"
                 >
                   <PhoneOff className="w-5 h-5" />
                 </button>
              </div>`;

code = code.replace(/              \{\/\* Call Controls \*\/\}[\s\S]*?              <\/div>/, controlUI);

fs.writeFileSync('src/components/VoiceAgent.tsx', code);
console.log("Updated VoiceAgent.tsx with fallback text input");
