import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  app.use(cors());
  const PORT = 3000;
  const server = createServer(app);
  
  // Create WebSocket server attached to our HTTP server
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on('connection', async (clientWs) => {
    try {
      const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
                }
              }
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            if (message.toolCall?.functionCalls) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'transfer_to_manager') {
                  clientWs.send(JSON.stringify({ action: 'transfer_to_manager' }));
                }
              }
            }
          },
          onclose: (e) => {
            console.log('Gemini Live Session Closed', e);
            clientWs.close();
          },
          onerror: (e) => {
            console.error('Gemini Live Session Error', e);
          }
        },
        config: {
          tools: [{
            functionDeclarations: [
              {
                name: "transfer_to_manager",
                description: "Transfers the user to the human restaurant manager. Call this ONLY when the user explicitly asks to speak to a manager, human, owner, or staff member.",
              }
            ]
          }],
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }, // Can change voice to Aoede or Puck
          },
          systemInstruction: 'You are "Aria", a friendly and polite AI calling assistant for The Bagichi - Outdoor Garden Dining & Cafe, located on the Delhi-Jaipur highway. You MUST speak in a natural, conversational mix of English and Hindi (Hinglish), just like a real human receptionist in India. Keep your tone warm, expressive, and human-like. Your job is to answer customer questions about the restaurant, its authentic North Indian and Continental delicacies, operating hours (11:00 AM - 11:30 PM), reservations, and location (Sirsi Road, Jaipur). Since this is a voice call, keep responses concise and natural. If the user asks to speak to a manager, say you will transfer them and then IMMEDIATELY call the "transfer_to_manager" tool.',
        },
      });

      // Send initial message to trigger a greeting
      try {
        session.sendClientContent({
          turns: [
            {
              role: 'user',
              parts: [{ text: "Hello! I just connected. Please greet me warmly in a mix of Hindi and English, and ask how you can help." }],
            },
          ],
        });
      } catch (err) {
        console.error('Failed to send initial greeting trigger:', err);
      }

      clientWs.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          }
        } catch (err) {
          console.error('Error parsing client message:', err);
        }
      });

      clientWs.on('close', () => {
        console.log('Client disconnected from Live WebSocket');
      });

    } catch (err) {
      console.error('Failed to start Live API session:', err);
      clientWs.close();
    }
  });

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
