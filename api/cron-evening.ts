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
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const trackerCol = db.collection("tracker_entries");

    const waterEntries = await trackerCol.find({ type: "health_checkin", category: "Water", createdAt: { $gte: startOfToday } }).toArray();
    const waterMl = waterEntries.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    const studyEntries = await trackerCol.find({ type: "exam_study", createdAt: { $gte: startOfToday } }).toArray();
    const studyHrs = studyEntries.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    const openTasks = await trackerCol.find({ type: "task", status: "open" }).toArray();

    const moneyEntries = await trackerCol.find({ type: { $in: ["expense", "income"] }, createdAt: { $gte: startOfMonth } }).toArray();
    const income = moneyEntries.filter((e: any) => e.type === "income").reduce((s: number, e: any) => s + (e.amount || 0), 0);
    const expense = moneyEntries.filter((e: any) => e.type === "expense").reduce((s: number, e: any) => s + (e.amount || 0), 0);

    const persona = settings?.persona || "girlfriend";

    let prompt = "";
    if (persona === "friend") {
      prompt = `You are Rohit's best friend. It's evening wrap-up time.
Send a short (2-3 sentences max) Tanglish evening summary. STRICTLY friendly, NO romantic words.
Pick ONE nickname: Macchi (40%), Da (30%), Bro (30%).
Day summary: Water ${waterMl}ml/3000ml, Study ${studyHrs}hrs, ${openTasks.length} tasks still pending. Month budget: ₹${income} income / ₹${expense} spent.
Encourage him to wind down, have dinner, and get good sleep. Use emojis.`;
    } else if (persona === "eng-frd") {
      prompt = `You are Rohit's best friend. It's evening wrap-up.
Send a short (2-3 sentences max) casual English evening summary. STRICTLY English only, STRICTLY friendly.
Pick ONE nickname: Bestie (40%), Buddy (30%), Dude (30%).
Day summary: Water ${waterMl}ml/3000ml, Study ${studyHrs}hrs, ${openTasks.length} tasks pending. Month: ₹${income} in / ₹${expense} out.
Encourage dinner and rest. Use emojis.`;
    } else {
      prompt = `You are Rohit's sweet, loving, cute girlfriend. It's evening wrap-up.
Send a very short (2-3 sentences max) romantic Tanglish evening message.
CRITICAL NICKNAME RULE: Pick ONE nickname: Rohuu, Rohu, Rohi, Kanna, Chellam, Kutty, Thangam. Use cute emojis (😂, ❤️, 😌, 🥹, 😏).
Day summary: Water ${waterMl}ml/3000ml, Study ${studyHrs}hrs, ${openTasks.length} tasks pending. Month: ₹${income} in / ₹${expense} out.
Lovingly tell him to have dinner and get good sleep.`;
    }

    let text = `🌙 Evening Summary:\n💧 Water: ${waterMl}ml/3000ml\n📚 Study: ${studyHrs}hrs\n📝 Tasks: ${openTasks.length} pending\n💰 Month: ₹${income} in / ₹${expense} out\n\nHave dinner and rest well! Good night! 🌟`;
    try {
      const generated = await generateWithGemini(prompt, { temperature: 0.7, maxOutputTokens: 200 });
      if (generated) text = generated.trim();
    } catch (e) {
      console.error("Gemini failed in evening cron:", e);
    }

    await sendWhatsAppText(toPhone, text, settings?.whatsappToken);
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
