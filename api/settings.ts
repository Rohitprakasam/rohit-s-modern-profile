import { VercelRequest, VercelResponse } from '@vercel/node';
import clientPromise from '../lib/mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || "rohit_portfolio";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const settingsCol = db.collection("settings");

    if (req.method === 'GET') {
      let settings = await settingsCol.findOne({ _id: "default" as any });
      if (!settings) {
        // Create default settings
        settings = {
          _id: "default" as any,
          whatsappPhone: "",
          whatsappToken: "",
          persona: "girlfriend",
          examName: "",
          examDate: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await settingsCol.insertOne(settings);
      }
      return res.status(200).json(settings);
    }

    if (req.method === 'PUT') {
      const body = req.body;
      const updateData: any = { updatedAt: new Date() };
      
      if (body.whatsappPhone !== undefined) updateData.whatsappPhone = body.whatsappPhone;
      if (body.whatsappToken !== undefined) updateData.whatsappToken = body.whatsappToken;
      if (body.persona !== undefined) updateData.persona = body.persona;
      if (body.examName !== undefined) updateData.examName = body.examName;
      if (body.examDate !== undefined) updateData.examDate = body.examDate;

      await settingsCol.updateOne(
        { _id: "default" as any },
        { $set: updateData },
        { upsert: true }
      );

      const updated = await settingsCol.findOne({ _id: "default" as any });
      return res.status(200).json(updated);
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (e: any) {
    console.error("Settings API error:", e);
    return res.status(500).json({ error: e.message });
  }
}
