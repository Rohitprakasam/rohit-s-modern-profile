
import { VercelRequest, VercelResponse } from '@vercel/node';
import clientPromise from '../lib/mongodb.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const client = await clientPromise;
        const db = client.db("portfolio");
        const collection = db.collection("profile");

        switch (req.method) {
            case 'GET':
                const profile = await collection.findOne({});
                return res.status(200).json(profile || {});

            case 'POST': // Create or Update
                const data = req.body;
                const existing = await collection.findOne({});
                if (existing) {
                    await collection.updateOne({ _id: existing._id }, { $set: data });
                    return res.status(200).json({ message: 'Profile updated' });
                } else {
                    await collection.insertOne(data);
                    return res.status(201).json({ message: 'Profile created' });
                }

            case 'PUT':
                const updateData = req.body;
                const existingDoc = await collection.findOne({});
                if (existingDoc) {
                    const { _id, ...cleanData } = updateData;
                    await collection.updateOne({ _id: existingDoc._id }, { $set: cleanData });
                    return res.status(200).json({ message: 'Profile updated' });
                } else {
                    await collection.insertOne(updateData);
                    return res.status(201).json({ message: 'Profile created' });
                }

            default:
                res.setHeader('Allow', ['GET', 'POST', 'PUT']);
                return res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (e: any) {
        console.error(e);
        return res.status(500).json({ message: e.message });
    }
}
