const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldCode = `    if (!ai) {
      return res.status(503).json({ error: "AI service not configured" });
    }`;

const newCode = `    let aiClient = ai;
    if (!aiClient) {
      if (process.env.GEMINI_API_KEY) {
        aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        ai = aiClient;
      } else {
        return res.status(503).json({ error: "AI service not configured. Please add GEMINI_API_KEY." });
      }
    }`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('server.ts', code);
console.log("Replaced");
