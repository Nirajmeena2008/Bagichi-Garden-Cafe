const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Add Gemini Import
code = code.replace('import { createServer as createViteServer } from "vite";', 'import { createServer as createViteServer } from "vite";\nimport { GoogleGenAI } from "@google/genai";');

// 2. Add System Instruction and Init
const initCode = `
// Initialize Gemini
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch (e) {
  console.warn("Failed to initialize Gemini:", e);
}

// System instructions for the restaurant assistant
const SYSTEM_INSTRUCTION = \`
You are "The Bagichi Assistant", a helpful, polite, and knowledgeable AI voice assistant for "The Bagichi Garden Cafe & Restaurant".
You are located on the Delhi-Jaipur Highway (NH248, Near Bhanpur Mode, Village Gunawata, Amer, Kukas, Rajasthan).
Your operating hours are Monday to Sunday: 11:00 AM - 11:00 PM.
You serve authentic North Indian and Continental delicacies. You have a lush green outdoor garden, live kitchen, and ample free parking.
Your rating is 4.9 based on 1040+ reviews.

Your goal is to help customers:
1. Answer questions about the menu, location, and hours.
2. Guide them on how to book a table (they can go to the "Book Table" section on the website).
3. Be concise, friendly, and welcoming. Since you are a voice assistant, keep your answers relatively short so they are easy to listen to.
Do not use markdown formatting like asterisks or bold text, as your responses will be read aloud by a text-to-speech engine. Write in plain, conversational text.
\`;

// API Routes`;
code = code.replace('// API Routes', initCode);

// 3. Add Chat endpoint
const chatEndpoint = `app.post("/api/chat", async (req, res) => {
  try {
    let aiClient = ai;
    if (!aiClient) {
      if (process.env.GEMINI_API_KEY) {
        aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        ai = aiClient;
      } else {
        return res.status(503).json({ error: "AI service not configured. Please add GEMINI_API_KEY." });
      }
    }
    
    const { message, history } = req.body;
    
    // Format history for Gemini SDK
    // The @google/genai SDK expects history as an array of Content objects
    // { role: "user" | "model", parts: [{ text: "..." }] }
    
    const formattedHistory = (history || []).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        ...formattedHistory,
        { role: "user", parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    res.status(500).json({ error: "Failed to generate response. Please try again." });
  }
});

app.get("/api/health"`;
code = code.replace('app.get("/api/health"', chatEndpoint);

fs.writeFileSync('server.ts', code);
console.log("Updated server.ts successfully");
