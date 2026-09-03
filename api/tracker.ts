import { VercelRequest, VercelResponse } from '@vercel/node';
import clientPromise from '../lib/mongodb';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || "rohit_portfolio";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const trackerCol = db.collection("tracker_entries");
    const savingsCol = db.collection("savings_goals");

    switch (req.method) {
      case 'GET': {
        const { type, status, period } = req.query;
        const filter: any = {};
        
        if (type && typeof type === 'string') filter.type = type;
        if (status && typeof status === 'string') filter.status = status;
        
        if (period === 'today') {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          filter.createdAt = { $gte: startOfToday };
        } else if (period === 'month') {
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);
          filter.createdAt = { $gte: startOfMonth };
        }

        const entries = await trackerCol.find(filter).sort({ createdAt: -1 }).limit(200).toArray();
        
        // Also fetch savings goals
        const goals = await savingsCol.find({}).toArray();

        return res.status(200).json({ entries, savingsGoals: goals });
      }

      case 'POST': {
        const body = req.body;
        if (!body.type || !body.title) {
          return res.status(400).json({ error: "type and title are required" });
        }

        const entry = {
          type: body.type,
          title: body.title,
          amount: body.amount || null,
          category: body.category || null,
          status: body.status || "open",
          source: body.source || "app",
          metadata: body.metadata || null,
          createdAt: new Date(),
        };

        const result = await trackerCol.insertOne(entry);
        return res.status(201).json({ ...entry, _id: result.insertedId });
      }

      case 'PUT': {
        const { _id, id, ...updateData } = req.body;
        const targetId = _id || id;
        if (!targetId) return res.status(400).json({ error: "Missing _id or id" });

        try {
          await trackerCol.updateOne(
            { _id: new ObjectId(targetId) },
            { $set: updateData }
          );
        } catch {
          await trackerCol.updateOne({ id: targetId }, { $set: updateData });
        }
        return res.status(200).json({ message: "Entry updated" });
      }

      case 'DELETE': {
        const deleteId = req.query.id;
        if (!deleteId || typeof deleteId !== 'string') {
          return res.status(400).json({ error: "Missing id query param" });
        }
        try {
          await trackerCol.deleteOne({ _id: new ObjectId(deleteId) });
        } catch {
          await trackerCol.deleteOne({ id: deleteId });
        }
        return res.status(200).json({ message: "Entry deleted" });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (e: any) {
    console.error("Tracker API error:", e);
    return res.status(500).json({ error: e.message });
  }
}
