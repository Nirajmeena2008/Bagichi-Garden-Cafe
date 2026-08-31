const fs = require('fs');
let code = fs.readFileSync('src/components/VoiceAgent.tsx', 'utf8');

const oldCode = `      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();`;

const newCode = `      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }`;

const oldCode2 = `    } catch (error) {
      console.error("Error communicating with AI:", error);
      setMessages((prev) => [...prev, { role: "model", text: "Sorry, I am having trouble connecting right now." }]);
    }`;

const newCode2 = `    } catch (error: any) {
      console.error("Error communicating with AI:", error);
      setMessages((prev) => [...prev, { role: "model", text: error.message || "Sorry, I am having trouble connecting right now." }]);
    }`;

code = code.replace(oldCode, newCode);
code = code.replace(oldCode2, newCode2);
fs.writeFileSync('src/components/VoiceAgent.tsx', code);
console.log("Replaced UI");
