
import { VercelRequest, VercelResponse } from '@vercel/node';
import clientPromise from '../lib/mongodb.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    }

    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Missing required fields: name, email, message' });
        }

        const client = await clientPromise;
        const db = client.db("portfolio");
        const collection = db.collection("messages");

        const newMessage = {
            name,
            email,
            message,
            date: new Date().toISOString(),
            read: false
        };

        const result = await collection.insertOne(newMessage);

        return res.status(201).json({
            message: 'Message received',
            id: result.insertedId
        });

    } catch (error: any) {
        console.error("Error saving contact message:", error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
