const { GoogleGenAI, Modality } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  const session = await ai.live.connect({
    model: "gemini-3.1-flash-live-preview",
    config: { responseModalities: [Modality.AUDIO] },
    callbacks: { onmessage: () => {} }
  });
  console.log('connected');
  try {
    session.sendClientContent({
      turns: [{ role: 'user', parts: [{ text: "Hello" }] }]
    });
    console.log('sendClientContent ok');
  } catch (e) {
    console.error('sendClientContent error', e.message);
  }
  
  try {
    session.sendRealtimeInput([{text: "Hello"}]);
    console.log('sendRealtimeInput array ok');
  } catch(e) {
    console.error('sendRealtimeInput error', e.message);
  }

  try {
    session.sendRealtimeInput({text: "Hello"});
    console.log('sendRealtimeInput object ok');
  } catch(e) {
    console.error('sendRealtimeInput error2', e.message);
  }

  session.close();
}
test();
