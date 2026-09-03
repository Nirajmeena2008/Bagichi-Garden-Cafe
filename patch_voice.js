const fs = require('fs');

let content = fs.readFileSync('src/components/VoiceAgent.tsx', 'utf8');

// Move AudioContext creation to startCall directly
content = content.replace(
  `        // Initialize Audio Contexts
        const inputCtx = new AudioContext({ sampleRate: 16000 });
        const outputCtx = new AudioContext({ sampleRate: 24000 });
        inputAudioCtxRef.current = inputCtx;
        outputAudioCtxRef.current = outputCtx;
        nextPlaybackTimeRef.current = outputCtx.currentTime;`,
  ``
);

content = content.replace(
  `  const startCall = async () => {
    try {
      setStatus('connecting');
      setErrorMessage('');
      setIsTransferring(false);`,
  `  const startCall = async () => {
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
`
);

content = content.replace(
  `        try {
          const stream = await navigator.mediaDevices.getUserMedia(`,
  `        try {
          const inputCtx = inputAudioCtxRef.current!;
          const outputCtx = outputAudioCtxRef.current!;
          const stream = await navigator.mediaDevices.getUserMedia(`
);

fs.writeFileSync('src/components/VoiceAgent.tsx', content);
console.log("Patched VoiceAgent.tsx");
