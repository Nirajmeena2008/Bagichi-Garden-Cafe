import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { Resend } from "resend";
import twilio from "twilio";

const prisma = new PrismaClient();

const OWNER_EMAIL = "animer10yt@gmail.com";

// Setup SDKs if keys are present
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const twilioClient = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) 
  : null;

async function sendBookingNotifications(booking: any, action: 'CONFIRMED' | 'EDITED' | 'CANCELLED') {
  const customerPhone = booking.phone;
  const customerEmail = booking.email;
  const resNumber = booking.reservationNumber;
  const otp = booking.otp;
  
  const actionText = action === 'CONFIRMED' ? 'confirmed' : action === 'EDITED' ? 'updated' : 'cancelled';
  
  // Message templates
  const smsMessage = `Your booking at The Bagichi is ${actionText}. Reservation #: ${resNumber}. OTP: ${otp}.`;
  
  const customerEmailHtml = `
    <h2>Your Booking is ${actionText}</h2>
    <p><strong>Reservation Number:</strong> ${resNumber}</p>
    <p><strong>Date:</strong> ${booking.date}</p>
    <p><strong>Time:</strong> ${booking.time}</p>
    <p><strong>Guests:</strong> ${booking.guests}</p>
    <p><strong>Verification OTP:</strong> ${otp}</p>
  `;

  const ownerEmailHtml = `
    <h2>Booking ${action}</h2>
    <p><strong>Reservation Number:</strong> ${resNumber}</p>
    <p><strong>Customer:</strong> ${booking.name} (${customerEmail}, ${customerPhone})</p>
    <p><strong>Date:</strong> ${booking.date}</p>
    <p><strong>Time:</strong> ${booking.time}</p>
    <p><strong>Guests:</strong> ${booking.guests}</p>
  `;

  // 1. Send SMS to Customer
  if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
    try {
      await twilioClient.messages.create({
        body: smsMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: customerPhone
      });
      console.log(`[Twilio] SMS sent to ${customerPhone}`);
    } catch (err: any) {
      if (err.code === 572006) {
        console.warn(`[Twilio Warning]: Cannot send SMS to ${customerPhone}. Twilio Trial accounts require predefined templates for this region. Message was: ${smsMessage}`);
      } else if (err.code === 21608) {
        console.warn(`[Twilio Warning]: Cannot send SMS to ${customerPhone}. Twilio Trial accounts can only send messages to verified phone numbers. Please verify ${customerPhone} in your Twilio console.`);
      } else {
        console.error("[Twilio] Failed to send SMS:", err.message || err);
      }
    }
  } else {
    console.log(`[Mock SMS to Customer - ${customerPhone}]: ${smsMessage}`);
  }

  // 2. Send Emails to Customer & Owner
  if (resend) {
    try {
      // To Customer
      const customerEmailResponse = await resend.emails.send({
        from: 'onboarding@resend.dev', // Default sender for Resend free/trial accounts
        to: customerEmail,
        subject: `Booking ${actionText.charAt(0).toUpperCase() + actionText.slice(1)} - ${resNumber}`,
        html: customerEmailHtml
      });

      if (customerEmailResponse.error) {
        if (customerEmailResponse.error.name === 'validation_error') {
          console.warn(`[Resend Warning]: Could not send to Customer (${customerEmail}). Resend free tier only allows sending emails to your verified account email.`);
        } else {
          console.error(`[Resend Error - Customer]:`, customerEmailResponse.error);
        }
      } else {
        console.log(`[Resend] Email sent to Customer ${customerEmail}`);
      }

      // To Owner
      const ownerEmailResponse = await resend.emails.send({
        from: 'onboarding@resend.dev', // Default sender for Resend free/trial accounts
        to: OWNER_EMAIL,
        subject: `Action Required: Booking ${action} - ${resNumber}`,
        html: ownerEmailHtml
      });

      if (ownerEmailResponse.error) {
        if (ownerEmailResponse.error.name === 'validation_error') {
          console.warn(`[Resend Warning]: Could not send to Owner (${OWNER_EMAIL}). If you are on the Resend free tier, you can ONLY send emails to the exact email address you used to register your Resend account. Please ensure ${OWNER_EMAIL} is verified in your Resend dashboard.`);
        } else {
          console.error(`[Resend Error - Owner]:`, ownerEmailResponse.error);
        }
      } else {
        console.log(`[Resend] Email sent to Owner ${OWNER_EMAIL}`);
      }
    } catch (err: any) {
      console.error("[Resend] Failed to execute email send:", err.message || err);
    }
  } else {
    console.log(`[Mock Email to Customer - ${customerEmail}]: ${customerEmailHtml}`);
    console.log(`[Mock Email to Owner - ${OWNER_EMAIL}]: ${ownerEmailHtml}`);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/menu", async (req, res) => {
    try {
      const items = await prisma.menuItem.findMany();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  app.get("/api/reviews", async (req, res) => {
    try {
      const reviews = await prisma.review.findMany();
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const bookingSchema = z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email"),
        phone: z.string().min(10, "Invalid phone number"),
        date: z.string(),
        time: z.string(),
        guests: z.string().transform((v) => parseInt(v, 10)),
        preOrders: z.array(
          z.object({
            menuItemId: z.string(),
            quantity: z.number().min(1),
          })
        ).optional(),
      });

      const parsedData = bookingSchema.parse(req.body);
      const reservationNumber = "BGC-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP

      const booking = await prisma.reservation.create({
        data: {
          reservationNumber,
          otp,
          name: parsedData.name,
          email: parsedData.email,
          phone: parsedData.phone,
          date: parsedData.date,
          time: parsedData.time,
          guests: parsedData.guests,
          preOrders: parsedData.preOrders ? {
            create: parsedData.preOrders
          } : undefined
        },
        include: { preOrders: { include: { menuItem: true } } }
      });

      // Send Notifications asynchronously
      sendBookingNotifications(booking, 'CONFIRMED').catch(console.error);

      res.json({ success: true, booking });
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Failed to create booking or invalid data" });
    }
  });

  app.get("/api/bookings/:number", async (req, res) => {
    try {
      const booking = await prisma.reservation.findUnique({
        where: { reservationNumber: req.params.number },
        include: { preOrders: { include: { menuItem: true } } }
      });
      if (!booking) return res.status(404).json({ error: "Booking not found" });
      res.json(booking);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch booking" });
    }
  });

  app.put("/api/bookings/:number", async (req, res) => {
    try {
      const { date, time, guests, status, preOrders } = req.body;
      
      const booking = await prisma.reservation.update({
        where: { reservationNumber: req.params.number },
        data: {
          date,
          time,
          guests: guests ? parseInt(guests, 10) : undefined,
          status,
          preOrders: preOrders ? { deleteMany: {}, create: preOrders } : undefined
        },
        include: { preOrders: { include: { menuItem: true } } }
      });
      
      const action = status === 'CANCELLED' ? 'CANCELLED' : 'EDITED';
      sendBookingNotifications(booking, action).catch(console.error);

      res.json({ success: true, booking });
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Failed to update booking" });
    }
  });

  app.post("/api/create-payment-intent", async (req, res) => {
    // Mock stripe intent for the preview environment
    res.json({ clientSecret: "pi_mock_12345_secret_67890" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
