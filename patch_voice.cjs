const fs = require('fs');

let content = fs.readFileSync('src/components/VoiceAgent.tsx', 'utf8');

// Move AudioContext creation to startCall directly
content = content.replace(
  `        // Initialize Audio Contexts\n        const inputCtx = new AudioContext({ sampleRate: 16000 });\n        const outputCtx = new AudioContext({ sampleRate: 24000 });\n        inputAudioCtxRef.current = inputCtx;\n        outputAudioCtxRef.current = outputCtx;\n        nextPlaybackTimeRef.current = outputCtx.currentTime;`,
  ``
);

content = content.replace(
  `  const startCall = async () => {\n    try {\n      setStatus('connecting');\n      setErrorMessage('');\n      setIsTransferring(false);`,
  `  const startCall = async () => {\n    try {\n      setStatus('connecting');\n      setErrorMessage('');\n      setIsTransferring(false);\n\n      // Initialize Audio Contexts synchronously during user gesture\n      const inputCtx = new AudioContext({ sampleRate: 16000 });\n      const outputCtx = new AudioContext({ sampleRate: 24000 });\n      \n      // Some browsers need explicit resume\n      if (inputCtx.state === 'suspended') inputCtx.resume();\n      if (outputCtx.state === 'suspended') outputCtx.resume();\n\n      inputAudioCtxRef.current = inputCtx;\n      outputAudioCtxRef.current = outputCtx;\n      nextPlaybackTimeRef.current = outputCtx.currentTime;`
);

content = content.replace(
  `        try {\n          const stream = await navigator.mediaDevices.getUserMedia(`,
  `        try {\n          const inputCtx = inputAudioCtxRef.current!;\n          const outputCtx = outputAudioCtxRef.current!;\n          const stream = await navigator.mediaDevices.getUserMedia(`
);

fs.writeFileSync('src/components/VoiceAgent.tsx', content);
console.log("Patched VoiceAgent.tsx");
