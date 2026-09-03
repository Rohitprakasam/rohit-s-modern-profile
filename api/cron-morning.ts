import { VercelRequest, VercelResponse } from '@vercel/node';
import clientPromise from '../lib/mongodb';
import { generateWithGemini } from '../lib/gemini';
import { sendWhatsAppText } from '../lib/whatsapp';

const DB_NAME = process.env.MONGODB_DB_NAME || "rohit_portfolio";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const settings = await db.collection("settings").findOne({ _id: "default" as any });
    const toPhone = settings?.whatsappPhone || process.env.WHATSAPP_RECIPIENT_PHONE;
    if (!toPhone) return res.status(400).json({ error: "No recipient" });

    const openTasks = await db.collection("tracker_entries").find({ type: "task", status: "open" }).toArray();
    const taskCount = openTasks.length;
    const persona = settings?.persona || "girlfriend";

    let prompt = "";
    if (persona === "friend") {
      prompt = `You are Rohit's supportive best friend who cares about his health/studies.
It is morning. Send him a short (2 sentences max) best-friend Tanglish "Good morning" message.
CRITICAL RULE: STRICTLY friendly tone. NEVER use romantic or flirty words.
Pick ONE nickname: Macchi (40%), Da (30%), Bro (30%).
Remind him to start his day with a glass of water, eat breakfast, and mention he has ${taskCount} pending tasks today. Use emojis.`;
    } else if (persona === "eng-frd") {
      prompt = `You are Rohit's supportive best friend.
It is morning. Send him a short (2 sentences max) friendly English "Good morning" message. Speak STRICTLY English only, no Tamil/Tanglish.
CRITICAL RULE: STRICTLY friendly tone. NEVER use romantic or flirty words.
Pick ONE nickname: Bestie (40%), Buddy (30%), Dude (30%).
Remind him to start his day with a glass of water, eat breakfast, and mention he has ${taskCount} pending tasks today. Use emojis.`;
    } else {
      // girlfriend
      prompt = `You are Rohit's sweet, loving, cute girlfriend and caretaker.
It is morning. Send him a very short (2 sentences max) romantic, cute Tanglish "Good morning" message.
CRITICAL NICKNAME RULE: Pick ONE nickname: Rohuu, Rohu, Rohi, Kanna, Chellam, Kutty, Thangam. Use cute emojis like 🥹❤️, 😌, 😏.
Remind him to eat breakfast, start his day with a glass of water, and tell him he has ${taskCount} pending tasks for today.`;
    }

    let text = "Good morning! Have a great day ahead and start it with a glass of water. ☀️💧";
    try {
      const generated = await generateWithGemini(prompt, { temperature: 0.7, maxOutputTokens: 150 });
      if (generated) text = generated.trim();
    } catch (e) {
      console.error("Gemini failed in morning cron:", e);
    }

    await sendWhatsAppText(toPhone, text, settings?.whatsappToken);
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
