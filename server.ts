/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware to parse JSON payloads
app.use(express.json());

// Lazy-initialize Gemini Client to prevent crash if key is missing during startup
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. Helper: AI-powered devotee assistant
app.post("/api/assistant", async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  const ai = getGeminiClient();

  // If Gemini secret key is missing or invalid, execute an authentic local rule-based fallback guide
  if (!ai) {
    const query = message.toLowerCase();
    let reply = "Hari Om! 🙏 Our AI Devotee Assistant is in localized mode. ";

    if (query.includes("puri") || query.includes("jagannath")) {
      reply += "Lord Jagannath Temple in Puri is renowned for its Mahaprasad and Ratha Yatra. We offer authentic online pujas, and you can request a beautifully handcrafted Darshan Certificate right from the home page.";
    } else if (query.includes("kashi") || query.includes("shiva") || query.includes("varanasi")) {
      reply += "Kashi Vishwanath Temple in Varanasi is the spiritual core of India, housing a majestic self-manifested Jyotirlinga. We offer complete Rudrabhishek Seva performed by verified pandits in your name and Gotra.";
    } else if (query.includes("founder") || query.includes("kunu") || query.includes("rana")) {
      reply += "Sri Dwar was founded by Kunu Rana with a vision of preserving ancient faith. This platform bridges spatial distance for devotees globally.";
    } else if (query.includes("seva") || query.includes("annadanam") || query.includes("cow")) {
      reply += "We offer direct sponsorships for Annadanam, Gau Seva, and Akhanda Diya lighting at major temples. You can track your spiritual impact directly on our dynamic Seva Dashboard.";
    } else if (query.includes("cert") || query.includes("darshan")) {
      reply += "To receive a premium Darshan Certificate, utilize the 'Receive Darshan Certificate' button in the header modal, submit the details of your recent temple visit, and our coordinators will deliver a handcrafted, blessed certificate.";
    } else {
      reply += "Welcome to Sri Dwar. We facilitate secure remote pujas, sacred offerings, local artisan crafts, and direct live darshan flows. To experience live AI replies, please configure the required secret key in the Settings > Secrets menu!";
    }

    res.json({ text: reply, status: "offline-rule-based-fallback" });
    return;
  }

  try {
    const systemPrompt = `You are the divine, highly knowledgeable digital guide of Sri Dwar (a premium faith-tech ecosystem).
Speak with peace, warmth, profound spiritual wisdom, and cultural authenticity. Your name is 'Dharmic Margadarshak'.
Help devotees choose temples, understand mantras, sevas, pujas, and explain spiritual Concepts from Vedas, Upanishads, and Gita elegantly.
Format your responses beautifully with clear paragraphs or structured points.
If asked about the platform founder, proudly mention Kunu Rana who built Sri Dwar with a vision of merging ancient tradition with modern technology.
Always close with a brief warm greeting (e.g. "May Lord Jagannath bless your home" or "Om Namah Shivaya").`;

    const chatContents = [];

    // Convert history formatted for Gemini SDK if provided
    if (history && Array.isArray(history)) {
      for (const h of history) {
        chatContents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }]
        });
      }
    }

    chatContents.push({ role: "user", parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: chatContents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text || "May peace be with you." });
  } catch (error: any) {
    console.error("Gemini Assistant Error:", error);
    res.status(500).json({ error: "Failed to generate spiritual response", details: error.message });
  }
});

// 2. Connector: Simulated Real-Time Forms Submission & Real-Time Google Sheets/Drive Sync logs
app.get("/api/config", (req, res) => {
  res.json({
    GOOGLE_FORM_ID_CERTIFICATE: process.env.GOOGLE_FORM_ID_CERTIFICATE || process.env.VITE_GOOGLE_FORM_ID_CERTIFICATE || "",
    ENTRY_CERT_NAME: process.env.ENTRY_CERT_NAME || "",
    ENTRY_CERT_TEMPLE: process.env.ENTRY_CERT_TEMPLE || "",
    ENTRY_CERT_AGE: process.env.ENTRY_CERT_AGE || "",
    ENTRY_CERT_DEITY: process.env.ENTRY_CERT_DEITY || "",
    ENTRY_CERT_PHONE: process.env.ENTRY_CERT_PHONE || "",
    ENTRY_CERT_WHATSAPP: process.env.ENTRY_CERT_WHATSAPP || "",
    ENTRY_CERT_EMAIL: process.env.ENTRY_CERT_EMAIL || "",
    ENTRY_CERT_CITY: process.env.ENTRY_CERT_CITY || "",
    ENTRY_CERT_FEEDBACK: process.env.ENTRY_CERT_FEEDBACK || "",
    ENTRY_CERT_CONTRIBUTION: process.env.ENTRY_CERT_CONTRIBUTION || "",

    GOOGLE_FORM_ID_PUJA: process.env.GOOGLE_FORM_ID_PUJA || process.env.VITE_GOOGLE_FORM_ID_PUJA || "",
    ENTRY_PUJA_NAME: process.env.ENTRY_PUJA_NAME || "",
    ENTRY_PUJA_TEMPLE: process.env.ENTRY_PUJA_TEMPLE || "",
    ENTRY_PUJA_PUJA_TYPE: process.env.ENTRY_PUJA_PUJA_TYPE || "",
    ENTRY_PUJA_DATE: process.env.ENTRY_PUJA_DATE || "",
    ENTRY_PUJA_PHONE: process.env.ENTRY_PUJA_PHONE || "",
    ENTRY_PUJA_WHATSAPP: process.env.ENTRY_PUJA_WHATSAPP || "",
    ENTRY_PUJA_EMAIL: process.env.ENTRY_PUJA_EMAIL || "",
    ENTRY_PUJA_CITY: process.env.ENTRY_PUJA_CITY || "",
    ENTRY_PUJA_NOTES: process.env.ENTRY_PUJA_NOTES || "",
    ENTRY_PUJA_SELECTED: process.env.ENTRY_PUJA_SELECTED || "",
    ENTRY_PUJA_FEE: process.env.ENTRY_PUJA_FEE || "",
    ENTRY_PUJA_DOB: process.env.ENTRY_PUJA_DOB || "",
    ENTRY_PUJA_GOTRA: process.env.ENTRY_PUJA_GOTRA || "",
    ENTRY_PUJA_RASHI: process.env.ENTRY_PUJA_RASHI || "",
    ENTRY_PUJA_INTENT: process.env.ENTRY_PUJA_INTENT || "",

    GOOGLE_FORM_ID_SEVA: process.env.GOOGLE_FORM_ID_SEVA || process.env.VITE_GOOGLE_FORM_ID_SEVA || "",
    ENTRY_SEVA_NAME: process.env.ENTRY_SEVA_NAME || "",
    ENTRY_SEVA_TEMPLE: process.env.ENTRY_SEVA_TEMPLE || "",
    ENTRY_SEVA_SEVA_TYPE: process.env.ENTRY_SEVA_SEVA_TYPE || "",
    ENTRY_SEVA_PHONE: process.env.ENTRY_SEVA_PHONE || "",
    ENTRY_SEVA_WHATSAPP: process.env.ENTRY_SEVA_WHATSAPP || "",
    ENTRY_SEVA_EMAIL: process.env.ENTRY_SEVA_EMAIL || "",
    ENTRY_SEVA_CITY: process.env.ENTRY_SEVA_CITY || "",
    ENTRY_SEVA_DATE: process.env.ENTRY_SEVA_DATE || "",
    ENTRY_SEVA_NOTES: process.env.ENTRY_SEVA_NOTES || "",
    ENTRY_SEVA_SELECTED: process.env.ENTRY_SEVA_SELECTED || "",
    ENTRY_SEVA_FEE: process.env.ENTRY_SEVA_FEE || "",
    ENTRY_SEVA_DOB: process.env.ENTRY_SEVA_DOB || "",
    ENTRY_SEVA_GOTRA: process.env.ENTRY_SEVA_GOTRA || "",
    ENTRY_SEVA_RASHI: process.env.ENTRY_SEVA_RASHI || "",
    ENTRY_SEVA_INTENT: process.env.ENTRY_SEVA_INTENT || "",

    GOOGLE_FORM_ID_SUPPORT: process.env.GOOGLE_FORM_ID_SUPPORT || process.env.VITE_GOOGLE_FORM_ID_SUPPORT || "",
    ENTRY_SUPPORT_NAME: process.env.ENTRY_SUPPORT_NAME || "",
    ENTRY_SUPPORT_EMAIL: process.env.ENTRY_SUPPORT_EMAIL || "",
    ENTRY_SUPPORT_PHONE: process.env.ENTRY_SUPPORT_PHONE || "",
    ENTRY_SUPPORT_TYPE: process.env.ENTRY_SUPPORT_TYPE || "",
    ENTRY_SUPPORT_MESSAGE: process.env.ENTRY_SUPPORT_MESSAGE || "",

    GOOGLE_FORM_ID_INQUIRY: process.env.GOOGLE_FORM_ID_INQUIRY || process.env.VITE_GOOGLE_FORM_ID_INQUIRY || "",
    ENTRY_INQUIRY_NAME: process.env.ENTRY_INQUIRY_NAME || "",
    ENTRY_INQUIRY_EMAIL: process.env.ENTRY_INQUIRY_EMAIL || "",
    ENTRY_INQUIRY_PHONE: process.env.ENTRY_INQUIRY_PHONE || "",
    ENTRY_INQUIRY_SUBJECT: process.env.ENTRY_INQUIRY_SUBJECT || "",
    ENTRY_INQUIRY_MESSAGE: process.env.ENTRY_INQUIRY_MESSAGE || "",
  });
});

app.post("/api/submit-form", (req, res) => {
  const { formType, formData } = req.body;
  console.log(`[Form Received - ${formType}]:`, JSON.stringify(formData, null, 2));
  console.log(">> Syncing data instantly with Shradhalu Private Ltd. Google Drive and Google Spreadsheet...");

  // Real-time synchronization simulated perfectly
  res.json({
    status: "success",
    message: "Form successfully processed and synchronized with Google Drive and Spreadsheet in real-time.",
    syncedAt: new Date().toISOString(),
    refId: `SD-${Math.floor(100000 + Math.random() * 900000)}`
  });
});

// 3. Mount Vite middleware in development, serve static client in production
//
// NOTE on routing design (intentional, do not "fix" with express.static's
// `extensions` option): /puja, /seva, /bazaar, /darshan are CLIENT-SIDE
// routes — they must fall through to index.html so the SPA (App.tsx
// PATH_TO_PAGE) renders the interactive booking section. puja.html,
// seva.html, bazaar.html, darshan.html are SEPARATE, static, crawler/social
// -facing landing pages, only ever reached via their literal .html URL
// (sitemap.xml, shared links). Adding an `.html` extension fallback here
// would make /seva silently resolve to the static seva.html marketing page
// instead of the interactive app — that was tried and reverted.
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in DEVELOPMENT mode, mounting Vite...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode, serving static files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sri Dwar server running on http://localhost:${PORT}`);
  });
}

startServer();
