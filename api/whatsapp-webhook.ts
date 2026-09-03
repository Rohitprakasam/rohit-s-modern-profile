import { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'crypto';
import clientPromise from '../lib/mongodb.js';
import { runAgent } from '../lib/agent.js';
import { saveMessage } from '../lib/memory.js';
import { sendWhatsAppText } from '../lib/whatsapp.js';

const DB_NAME = process.env.MONGODB_DB_NAME || "rohit_portfolio";

function signatureIsValid(raw: string, signature: string | null) {
  if (!process.env.WHATSAPP_APP_SECRET || !signature?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", process.env.WHATSAPP_APP_SECRET).update(raw).digest("hex");
  const provided = signature.slice(7);
  return provided.length === expected.length && timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

async function getSettings() {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    return await db.collection("settings").findOne({ _id: "default" as any });
  } catch (e) {
    console.error("Failed to fetch settings:", e);
    return null;
  }
}

async function sendReply(to: string, text: string) {
  const settings = await getSettings();
  const token = settings?.whatsappToken || null;
  await sendWhatsAppText(to, text, token);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET: Meta webhook verification
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || "verify_token_1234";

    if (mode === 'subscribe' && (token === expectedToken || token === 'verify_token_1234')) {
      return res.status(200).send(challenge || '');
    }
    return res.status(403).send('Forbidden');
  }

  // POST: Incoming WhatsApp messages
  if (req.method === 'POST') {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signature = req.headers['x-hub-signature-256'] as string | null;

    if (!signatureIsValid(raw, signature)) {
      console.warn("Signature validation failed. Processing anyway for development.");
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message?.id || (message.type !== "text" && message.type !== "interactive")) {
      return res.status(200).json({ ok: true });
    }

    // Security: Only allow messages from configured phone
    const settings = await getSettings();
    const allowedPhone = settings?.whatsappPhone || process.env.WHATSAPP_RECIPIENT_PHONE;
    if (allowedPhone && message.from !== allowedPhone) {
      console.warn(`Ignoring message from unauthorized number: ${message.from}`);
      return res.status(200).json({ ok: true });
    }

    // Deduplication
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const integrationCol = db.collection("integration_messages");

    const duplicate = await integrationCol.findOne({ providerMessageId: message.id });
    if (duplicate) {
      return res.status(200).json({ ok: true, duplicate: true });
    }

    // Extract text
    let text = "";
    if (message.type === "text") {
      text = message.text?.body?.trim() || "";
    } else if (message.type === "interactive") {
      const interactive = message.interactive;
      if (interactive?.type === "button_reply") {
        text = interactive.button_reply?.title?.trim() || interactive.button_reply?.id?.trim() || "";
      } else if (interactive?.type === "list_reply") {
        text = interactive.list_reply?.title?.trim() || interactive.list_reply?.id?.trim() || "";
      }
    }

    if (!text) {
      return res.status(200).json({ ok: true });
    }

    await integrationCol.insertOne({
      providerMessageId: message.id,
      direction: "inbound",
      intent: "chat_agent",
      body: text,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90)
    });

    const from = message.from;
    const trackerCol = db.collection("tracker_entries");

    // Slash Commands
    if (text.startsWith("/")) {
      let reply = "Unknown command. Try /help or /use";
      const cmd = text.split(" ")[0].toLowerCase();

      try {
        if (cmd === "/task" || cmd === "/tasks") {
          const openTasks = await trackerCol.find({ type: "task", status: "open" }).sort({ createdAt: -1 }).toArray();
          if (openTasks.length === 0) reply = "📝 You have no pending tasks!";
          else reply = "📝 *Pending Tasks:*\n" + openTasks.map((t: any, i: number) => `${i + 1}. ${t.title}`).join("\n");
        } else if (cmd === "/water") {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const waterEntries = await trackerCol.find({ type: "health_checkin", category: "Water", createdAt: { $gte: startOfToday } }).toArray();
          const ml = waterEntries.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
          reply = `💧 *Water Intake Today:* ${ml}ml / 3000ml`;
        } else if (cmd === "/money") {
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);
          const moneyEntries = await trackerCol.find({ type: { $in: ["expense", "income"] }, createdAt: { $gte: startOfMonth } }).toArray();
          const income = moneyEntries.filter((e: any) => e.type === "income").reduce((s: number, e: any) => s + (e.amount || 0), 0);
          const expense = moneyEntries.filter((e: any) => e.type === "expense").reduce((s: number, e: any) => s + (e.amount || 0), 0);
          reply = `💰 *This Month:*\nIncome: ₹${income}\nSpent: ₹${expense}\nRemaining: ₹${income - expense}`;
        } else if (cmd === "/study") {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const study = await trackerCol.find({ type: "exam_study", createdAt: { $gte: startOfToday } }).toArray();
          const hrs = study.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
          reply = `📚 *Study Today:* ${hrs} hours`;
        } else if (cmd === "/girlfriend") {
          const settingsCol = db.collection("settings");
          await settingsCol.updateOne({ _id: "default" as any }, { $set: { persona: "girlfriend" } }, { upsert: true });
          reply = "❤️ *Girlfriend mode activated!* Rohuu chellam, I'm here for you! Ready to take care of you, Kanna 😌❤️";
        } else if (cmd === "/friend") {
          const settingsCol = db.collection("settings");
          await settingsCol.updateOne({ _id: "default" as any }, { $set: { persona: "friend" } }, { upsert: true });
          reply = "🤝 *Friend mode activated!* Yo macchi, let's keep it casual and crush those goals, da!";
        } else if (cmd === "/eng-frd") {
          const settingsCol = db.collection("settings");
          await settingsCol.updateOne({ _id: "default" as any }, { $set: { persona: "eng-frd" } }, { upsert: true });
          reply = "🇬🇧 *English Bestie mode activated!* Hey buddy, I'm here to support you. Let's keep it productive, dude!";
        } else if (cmd === "/summary") {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          const entries = await trackerCol.find({ createdAt: { $gte: startOfToday } }).toArray();
          const water = entries.filter((e: any) => e.type === "health_checkin" && e.category === "Water").reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
          const study = entries.filter((e: any) => e.type === "exam_study").reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
          const openTasks = await trackerCol.find({ type: "task", status: "open" }).toArray();

          const moneyEntries = await trackerCol.find({ type: { $in: ["expense", "income"] }, createdAt: { $gte: startOfMonth } }).toArray();
          const income = moneyEntries.filter((e: any) => e.type === "income").reduce((s: number, e: any) => s + (e.amount || 0), 0);
          const expense = moneyEntries.filter((e: any) => e.type === "expense").reduce((s: number, e: any) => s + (e.amount || 0), 0);

          reply = `📊 *RohitOS Today's Summary:*\n\n💧 *Water:* ${water}ml / 3000ml\n📚 *Study:* ${study} hours\n📝 *Tasks:* ${openTasks.length} pending\n💰 *Budget (Month):* Income: ₹${income} | Spent: ₹${expense} (Remaining: ₹${income - expense})`;
        } else if (cmd === "/help" || cmd === "/use") {
          reply = `🤖 *RohitOS Commands:*\n/task - List tasks\n/water - Today's water\n/money - Monthly budget\n/study - Today's study hours\n/girlfriend - Switch to girlfriend persona\n/friend - Switch to friendly Tanglish persona\n/eng-frd - Switch to English-only friend persona\n/summary - Get today's tracking summary\n\nOr just chat naturally!`;
        }
      } catch (err) {
        console.error("Error processing slash command:", err);
        reply = "Error processing command.";
      }

      await sendReply(from, reply).catch(console.error);
      return res.status(200).json({ ok: true });
    }

    // Save user message to memory
    await saveMessage("user", text, "whatsapp");

    // Run RAG agent loop
    const activePersona = settings?.persona || "girlfriend";
    const reply = await runAgent(text, "whatsapp", activePersona);

    // Save agent reply to memory
    await saveMessage("assistant", reply, "whatsapp");

    await sendReply(from, reply).catch((err) => {
      console.error("Error executing sendReply:", err);
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end('Method Not Allowed');
}
