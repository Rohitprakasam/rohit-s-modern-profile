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

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const trackerCol = db.collection("tracker_entries");
    const waterEntries = await trackerCol.find({ type: "health_checkin", category: "Water", createdAt: { $gte: startOfToday } }).toArray();
    const waterMl = waterEntries.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    const studyEntries = await trackerCol.find({ type: "exam_study", createdAt: { $gte: startOfToday } }).toArray();
    const studyHrs = studyEntries.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    const openTasks = await trackerCol.find({ type: "task", status: "open" }).toArray();
    const persona = settings?.persona || "girlfriend";

    let prompt = "";
    if (persona === "friend") {
      prompt = `You are Rohit's best friend. It's afternoon check-in time.
Send a short (2 sentences max) Tanglish afternoon reminder. STRICTLY friendly, NO romantic words.
Pick ONE nickname: Macchi (40%), Da (30%), Bro (30%).
His stats so far: Water ${waterMl}ml/3000ml, Study ${studyHrs}hrs, ${openTasks.length} tasks pending.
Nudge him about water and tasks. Use emojis.`;
    } else if (persona === "eng-frd") {
      prompt = `You are Rohit's best friend. It's afternoon check-in.
Send a short (2 sentences max) casual English afternoon reminder. STRICTLY English only. STRICTLY friendly.
Pick ONE nickname: Bestie (40%), Buddy (30%), Dude (30%).
His stats: Water ${waterMl}ml/3000ml, Study ${studyHrs}hrs, ${openTasks.length} tasks pending. Nudge about water/tasks. Use emojis.`;
    } else {
      prompt = `You are Rohit's sweet, loving, cute girlfriend. It's afternoon check-in.
Send a very short (2 sentences max) romantic Tanglish afternoon message.
CRITICAL NICKNAME RULE: Pick ONE nickname: Rohuu, Rohu, Rohi, Kanna, Chellam, Kutty, Mr. Trouble, Thangam. Use cute emojis (😂, ❤️, 😌, 🥹, 😏).
His stats: Water ${waterMl}ml/3000ml, Study ${studyHrs}hrs, ${openTasks.length} tasks pending. Lovingly nudge about water and tasks.`;
    }

    let text = `Afternoon check-in! 💧 Water: ${waterMl}ml/3000ml. You have ${openTasks.length} tasks pending. Keep going! 💪`;
    try {
      const generated = await generateWithGemini(prompt, { temperature: 0.7, maxOutputTokens: 150 });
      if (generated) text = generated.trim();
    } catch (e) {
      console.error("Gemini failed in afternoon cron:", e);
    }

    await sendWhatsAppText(toPhone, text, settings?.whatsappToken);
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
