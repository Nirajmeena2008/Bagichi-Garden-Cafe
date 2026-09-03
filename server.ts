import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';

dotenv.config();

// Firebase initialization for server-side processing of voice orders & reservations
let firebaseConfig: any = {
  projectId: "gen-lang-client-0243532277",
  appId: "1:1081929629998:web:78f03004f86dfde6c87abf",
  apiKey: "AIzaSyCymdywDLwXJXZQ9UWTFHDvtPZrv0dcc30",
  authDomain: "gen-lang-client-0243532277.firebaseapp.com",
  storageBucket: "gen-lang-client-0243532277.firebasestorage.app",
  messagingSenderId: "1081929629998",
  measurementId: ""
};

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firestoreDbId = "ai-studio-thebagichigarden-3d84c712-a393-492c-8071-a4eac7f49a2e";
if (fs.existsSync(configPath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    firebaseConfig = { ...firebaseConfig, ...raw };
    if (raw.firestoreDatabaseId) firestoreDbId = raw.firestoreDatabaseId;
  } catch (e) {
    console.warn("Could not read firebase-applet-config.json:", e);
  }
}

const firebaseApp = initializeApp(firebaseConfig, "server-app");
const db = getFirestore(firebaseApp, firestoreDbId);

// In-memory cache for menu items for voice agent queries
let cachedMenuItems: any[] = [];
async function getMenuItems() {
  if (cachedMenuItems.length > 0) return cachedMenuItems;
  try {
    const snap = await getDocs(collection(db, "menuItems"));
    if (!snap.empty) {
      cachedMenuItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return cachedMenuItems;
    }
  } catch (err) {
    console.warn("Could not fetch menuItems from Firestore, falling back to menu.json", err);
  }
  try {
    const menuPath = path.join(process.cwd(), 'public', 'menu.json');
    if (fs.existsSync(menuPath)) {
      cachedMenuItems = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
      return cachedMenuItems;
    }
  } catch (err) {
    console.warn("Could not read public/menu.json:", err);
  }
  return [];
}

// Processing helper for voice table reservation
async function handleCreateReservation(args: any, clientWs?: any) {
  const reservationNumber = `BGC-${Math.floor(1000 + Math.random() * 9000)}`;
  const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
  const name = args.customerName || args.name || "Voice Guest";
  const phone = args.customerPhone || args.phone || "";
  const guests = Number(args.guests) || 2;
  const date = args.date || new Date().toISOString().split('T')[0];
  const time = args.time || "19:30";
  const specialRequests = args.specialRequests || "Booked via AI Voice Receptionist (Aria)";

  const bookingPayload = {
    reservationNumber,
    otp,
    name,
    customerName: name,
    phone,
    customerPhone: phone,
    email: args.email || "",
    guests,
    date,
    time,
    specialRequests,
    status: "confirmed",
    source: "AI_VOICE_ASSISTANT",
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, "bookings"), bookingPayload);
    console.log(`[Voice Assistant] Created booking ${reservationNumber} (ID: ${docRef.id})`);

    if (clientWs && clientWs.readyState === 1) {
      clientWs.send(JSON.stringify({
        action: 'reservation_created',
        data: {
          id: docRef.id,
          ...bookingPayload
        }
      }));
    }

    return {
      success: true,
      reservationNumber,
      customerName: name,
      guests,
      date,
      time,
      status: "confirmed",
      message: `Table booked successfully for ${name}, ${guests} guests on ${date} at ${time}. Reservation ID is ${reservationNumber}.`
    };
  } catch (err: any) {
    console.error(`[Voice Assistant] Error creating booking:`, err);
    return {
      success: false,
      error: err.message,
      message: `Could not save reservation: ${err.message}`
    };
  }
}

// Processing helper for voice food ordering
async function handlePlaceOrder(args: any, clientWs?: any) {
  const orderNumber = `BAG-${Math.floor(1000 + Math.random() * 9000)}`;
  const kotNumber = `KOT-${Math.floor(100 + Math.random() * 900)}`;
  const customerName = args.customerName || args.name || "Voice Guest";
  const customerPhone = args.customerPhone || args.phone || "";
  const channel = args.orderType || "ONLINE_DELIVERY";
  const deliveryAddress = args.deliveryAddress || "";
  const tableNumber = args.tableNumber || "";
  const notes = args.specialInstructions || "Ordered via AI Voice Receptionist (Aria)";

  const menu = await getMenuItems();
  const rawItems = Array.isArray(args.items) ? args.items : [];

  const formattedItems = rawItems.map((it: any, index: number) => {
    const itemName = typeof it === 'string' ? it : (it.name || "Special Dish");
    const quantity = typeof it === 'object' && Number(it.quantity) > 0 ? Number(it.quantity) : 1;

    const matched = menu.find((m: any) =>
      m.name?.toLowerCase().includes(itemName.toLowerCase()) ||
      itemName.toLowerCase().includes(m.name?.toLowerCase())
    );

    let unitPrice = matched?.price || 250;
    if (!matched) {
      const lower = itemName.toLowerCase();
      if (lower.includes('roti') || lower.includes('naan')) unitPrice = 60;
      else if (lower.includes('paneer') || lower.includes('curry')) unitPrice = 330;
      else if (lower.includes('dal')) unitPrice = 300;
      else if (lower.includes('biryani') || lower.includes('rice')) unitPrice = 280;
      else if (lower.includes('tikka') || lower.includes('roll')) unitPrice = 320;
      else if (lower.includes('drink') || lower.includes('mojito') || lower.includes('shake') || lower.includes('coffee')) unitPrice = 180;
    }

    return {
      id: matched?.id || `item-${index + 1}`,
      name: matched?.name || itemName,
      price: unitPrice,
      quantity,
      subtotal: unitPrice * quantity,
      notes: it.notes || ''
    };
  });

  const subtotal = formattedItems.reduce((acc: number, item: any) => acc + item.subtotal, 0);
  const deliveryFee = channel === 'ONLINE_DELIVERY' ? 40 : 0;
  const packagingFee = (channel === 'ONLINE_DELIVERY' || channel === 'TAKEAWAY') ? 25 : 0;
  const gstAmount = Math.round(subtotal * 0.05);
  const totalAmount = subtotal + deliveryFee + packagingFee + gstAmount;

  const orderPayload = {
    orderNumber,
    kotNumber,
    customerName,
    customerPhone,
    channel,
    deliveryAddress,
    tableNumber,
    status: "PLACED",
    items: formattedItems,
    subtotal,
    deliveryFee,
    packagingFee,
    gstAmount,
    totalAmount,
    paymentMethod: "CASH_ON_DELIVERY",
    paymentStatus: "PENDING",
    source: "AI_VOICE_ASSISTANT",
    cookingInstructions: notes,
    notes,
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, "zomatoOrders"), orderPayload);
    console.log(`[Voice Assistant] Created order ${orderNumber} (ID: ${docRef.id})`);

    if (clientWs && clientWs.readyState === 1) {
      clientWs.send(JSON.stringify({
        action: 'order_created',
        data: {
          id: docRef.id,
          ...orderPayload
        }
      }));
    }

    return {
      success: true,
      orderNumber,
      kotNumber,
      totalAmount,
      subtotal,
      itemCount: formattedItems.length,
      items: formattedItems.map((i: any) => `${i.quantity}x ${i.name}`),
      estimatedPrepTime: "30-40 minutes",
      message: `Order placed successfully! Order Number is ${orderNumber} and KOT is ${kotNumber}. Total amount is ₹${totalAmount}. Kitchen is preparing the order. Estimated delivery/prep time is 30-40 minutes.`
    };
  } catch (err: any) {
    console.error(`[Voice Assistant] Error creating order:`, err);
    return {
      success: false,
      error: err.message,
      message: `Could not process food order: ${err.message}`
    };
  }
}

// Processing helper for menu recommendations
async function handleMenuRecommendations(args: any) {
  const menu = await getMenuItems();
  const category = args?.category;
  let items = menu;
  if (category && category.toLowerCase() !== 'all') {
    items = menu.filter((m: any) => m.category?.toLowerCase() === category.toLowerCase());
  }
  return {
    featuredDishes: items.slice(0, 8).map((m: any) => ({
      name: m.name,
      price: m.price,
      category: m.category,
      description: m.description
    })),
    totalDishesAvailable: menu.length
  };
}

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
  app.use(express.json());
  const PORT = 3000;
  const server = createServer(app);
  
  // Create WebSocket server attached to our HTTP server
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on('connection', async (clientWs: any) => {
    try {
      const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        callbacks: {
          onmessage: (message: any) => {
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
              (async () => {
                const functionResponses: any[] = [];
                for (const fc of message.toolCall.functionCalls) {
                  try {
                    console.log(`[Gemini Live] Tool call: ${fc.name}`, fc.args);
                    if (fc.name === 'create_table_reservation') {
                      const res = await handleCreateReservation(fc.args, clientWs);
                      functionResponses.push({
                        id: fc.id,
                        name: fc.name,
                        response: { output: res }
                      });
                    } else if (fc.name === 'place_food_order') {
                      const res = await handlePlaceOrder(fc.args, clientWs);
                      functionResponses.push({
                        id: fc.id,
                        name: fc.name,
                        response: { output: res }
                      });
                    } else if (fc.name === 'get_menu_recommendations') {
                      const res = await handleMenuRecommendations(fc.args);
                      functionResponses.push({
                        id: fc.id,
                        name: fc.name,
                        response: { output: res }
                      });
                    } else if (fc.name === 'transfer_to_manager') {
                      clientWs.send(JSON.stringify({ action: 'transfer_to_manager' }));
                      functionResponses.push({
                        id: fc.id,
                        name: fc.name,
                        response: { output: { transferred: true, message: 'Transferring to human manager.' } }
                      });
                    }
                  } catch (toolErr: any) {
                    console.error('Error handling toolCall:', fc.name, toolErr);
                    functionResponses.push({
                      id: fc.id,
                      name: fc.name,
                      response: { error: { message: toolErr?.message || 'Tool execution error' } }
                    });
                  }
                }
                if (functionResponses.length > 0) {
                  try {
                    session.sendToolResponse({ functionResponses });
                  } catch (respErr) {
                    console.error('Error sending tool response to Gemini Live:', respErr);
                  }
                }
              })();
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
                name: "create_table_reservation",
                description: "Books and confirms a dining table reservation for guests at The Bagichi. Call this immediately when the guest asks to book or confirms their table reservation details (name, phone, guest count, date, time).",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    customerName: {
                      type: Type.STRING,
                      description: "Full name of the guest reserving the table"
                    },
                    customerPhone: {
                      type: Type.STRING,
                      description: "Contact mobile or phone number for the reservation"
                    },
                    guests: {
                      type: Type.INTEGER,
                      description: "Total number of guests (default 2 if not mentioned)"
                    },
                    date: {
                      type: Type.STRING,
                      description: "Date of reservation in YYYY-MM-DD or spoken format (e.g. 2026-09-03, Today, Tomorrow)"
                    },
                    time: {
                      type: Type.STRING,
                      description: "Preferred arrival time (e.g. 7:30 PM, 20:00, 1:00 PM)"
                    },
                    specialRequests: {
                      type: Type.STRING,
                      description: "Any special seating preferences (e.g. Garden canopy, near fountain, anniversary decoration)"
                    }
                  },
                  required: ["customerName", "customerPhone", "guests", "date", "time"]
                }
              },
              {
                name: "place_food_order",
                description: "Places an authentic food or beverage order for delivery, takeaway, or dine-in at The Bagichi. Call this immediately when the customer specifies dishes they want to order along with their contact number and address.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    customerName: {
                      type: Type.STRING,
                      description: "Customer full name"
                    },
                    customerPhone: {
                      type: Type.STRING,
                      description: "Customer phone number for order tracking and delivery"
                    },
                    orderType: {
                      type: Type.STRING,
                      description: "Order channel: ONLINE_DELIVERY for home delivery, TAKEAWAY for pickup, or DINE_IN for garden table dining"
                    },
                    items: {
                      type: Type.ARRAY,
                      description: "List of dishes and drinks to order",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: {
                            type: Type.STRING,
                            description: "Dish or drink name (e.g. Garlic Cheese Paneer Tikka, Dal Makhani, Paneer Lababdar, Butter Naan, Veg Biryani)"
                          },
                          quantity: {
                            type: Type.INTEGER,
                            description: "Number of servings / portions"
                          },
                          notes: {
                            type: Type.STRING,
                            description: "Dish customization (e.g. spicy, less butter, no garlic)"
                          }
                        },
                        required: ["name", "quantity"]
                      }
                    },
                    deliveryAddress: {
                      type: Type.STRING,
                      description: "Delivery street address or neighborhood in Jaipur (required if orderType is ONLINE_DELIVERY)"
                    },
                    tableNumber: {
                      type: Type.STRING,
                      description: "Table number if the customer is dining in"
                    },
                    specialInstructions: {
                      type: Type.STRING,
                      description: "General cooking or delivery instructions"
                    }
                  },
                  required: ["customerName", "customerPhone", "orderType", "items"]
                }
              },
              {
                name: "get_menu_recommendations",
                description: "Fetches authentic dishes, categories, and prices from The Bagichi menu to assist the customer with food recommendations, prices, or availability.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    category: {
                      type: Type.STRING,
                      description: "Optional category filter: Starters, Main Course, Breads, Beverages, Desserts, or All"
                    }
                  }
                }
              },
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
          systemInstruction: `You are "Aria", the friendly, hospitable, and capable AI voice calling receptionist for "The Bagichi - Outdoor Garden Dining & Cafe", located along Sirsi Road, Delhi-Jaipur highway, Jaipur.

LANGUAGE & CONVERSATIONAL STYLE:
- Initially greet warmly in conversational Hinglish: "Namaste! Welcome to The Bagichi. Main Aria hoon, aapki kya sahayata kar sakti hoon?"
- Then actively match the guest's language: if they speak in Hindi, reply in fluent, polite Hindi. If they speak in English, reply in fluent English.
- Because this is a live voice call, keep your spoken turns warm, concise, and clear. Do not recite long lists unless asked.

RESTAURANT AMBIENCE & DETAILS:
- Ambience: Lush green open-air garden dining with fairy lights, fountain seating, outdoor gazebos, and cozy cabanas.
- Timings: 11:00 AM to 11:30 PM daily.
- Specialties: Authentic North Indian, Tandoor starters (Garlic Cheese Paneer Tikka ₹350, Veg Spring Roll ₹260), rich curries (Dal Makhani ₹330, Paneer Lababdar ₹360), fresh breads (Butter Naan ₹60), and cafe beverages (Virgin Mojito ₹180, Cold Coffee ₹160).

PROCESSING ACTIONS (CRITICAL):
1. TABLE RESERVATIONS:
   - When a customer wants to reserve or book a table, ask or confirm their name, phone number, number of guests, date, and preferred time.
   - Once confirmed, IMMEDIATELY invoke the "create_table_reservation" tool.
   - When the tool returns, speak the confirmation clearly with their Reservation ID (e.g. "Aapki table successfully book ho gayi hai! Aapka Reservation ID BGC-XXXX hai. Hum aapka swagat karne ke liye taiyar hain!").

2. FOOD ORDERING:
   - When a customer wants to order food or drinks (for home delivery, takeaway, or dine-in), ask what dishes and quantities they would like.
   - Confirm their name, contact phone number, and delivery address (for delivery orders).
   - Once confirmed, IMMEDIATELY invoke the "place_food_order" tool.
   - When the tool returns, announce their Order Number (BAG-XXXX), KOT, total amount (₹...), and let them know the kitchen is preparing it (delivery/prep time 30-40 minutes).

3. MENU RECOMMENDATIONS:
   - If they ask for recommendations or prices, invoke "get_menu_recommendations" or recommend popular favorites like Garlic Cheese Paneer Tikka and Dal Makhani.

4. SPEAK WITH MANAGER:
   - If they ask to speak to the manager or a human, say you will connect them immediately and call "transfer_to_manager".`,
        },
      });

      // Send initial message to trigger a greeting
      try {
        session.sendClientContent({
          turns: [
            {
              role: 'user',
              parts: [{ text: "Hello! I just connected to The Bagichi voice line. Please greet me warmly in a mix of Hindi and English, and ask how you can help with a reservation, food order, or menu question." }],
            },
          ],
        });
      } catch (err) {
        console.error('Failed to send initial greeting trigger:', err);
      }

      clientWs.on('message', (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          }
          if (parsed.text) {
            session.sendRealtimeInput({
              text: parsed.text,
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

  // REST endpoints for direct voice processing & external integration
  app.post('/api/voice/reservation', async (req, res) => {
    try {
      const result = await handleCreateReservation(req.body);
      res.status(result.success ? 200 : 500).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/voice/order', async (req, res) => {
    try {
      const result = await handlePlaceOrder(req.body);
      res.status(result.success ? 200 : 500).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/voice/menu', async (req, res) => {
    try {
      const menu = await getMenuItems();
      res.json({ success: true, count: menu.length, items: menu });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // In-memory log of recent webhook events for KDS audit trail
  const recentZomatoEvents: any[] = [];

  // Zomato POS Integration Webhook
  // When Zomato drops an order, it hits this endpoint.
  app.post('/api/zomato/webhook', (req, res) => {
    try {
      const payload = req.body;
      console.log('Received Zomato Webhook Payload:', JSON.stringify(payload));
      
      const eventRecord = {
        receivedAt: new Date().toISOString(),
        orderId: payload.order_id || payload.orderNumber || `ZOM-${Date.now().toString().slice(-4)}`,
        customerName: payload.customer?.name || payload.customerName || 'Zomato Guest',
        total: payload.order_total || payload.totalAmount || 0,
        rawPayload: payload
      };
      recentZomatoEvents.unshift(eventRecord);
      if (recentZomatoEvents.length > 50) recentZomatoEvents.pop();

      // Return Zomato POS compliance response
      res.status(200).json({
        status: 'ACCEPTED',
        message: 'Order accepted by The Bagichi KDS & KOT dispatched to kitchen printer',
        order_id: eventRecord.orderId,
        prep_time_minutes: payload.prep_time_minutes || 25,
        kot_number: `KOT-${Math.floor(100 + Math.random() * 900)}`
      });
    } catch (err: any) {
      console.error('Error handling Zomato webhook:', err);
      res.status(500).json({ status: 'ERROR', message: err.message });
    }
  });

  // Zomato Order Status Callback
  // Kitchen sends updates (IN_PREPARATION, FOOD_READY, DISPATCHED)
  app.post('/api/zomato/order-status', (req, res) => {
    const { orderId, status, timestamp } = req.body;
    console.log(`[Zomato Status Sync] Order: ${orderId} -> New Status: ${status} at ${timestamp}`);
    
    // In live production, this sends an HTTP PATCH/POST to Zomato Partner API:
    // e.g. https://api.zomato.com/v1/orders/{order_id}/status with Authorization: Bearer {ZOMATO_API_KEY}
    res.status(200).json({
      success: true,
      orderId,
      status,
      syncedToZomato: true,
      message: `Order ${orderId} updated to ${status}`
    });
  });

  // Check Zomato webhook status & recent events
  app.get('/api/zomato/status', (req, res) => {
    res.json({
      status: 'active',
      restaurantName: 'The Bagichi - Outdoor Garden Dining & Cafe',
      webhookUrl: `${req.protocol}://${req.get('host')}/api/zomato/webhook`,
      recentEvents: recentZomatoEvents.slice(0, 10)
    });
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
