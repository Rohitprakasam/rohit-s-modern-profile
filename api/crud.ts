
import { VercelRequest, VercelResponse } from '@vercel/node';
import clientPromise from '../lib/mongodb.js';
import { ObjectId } from 'mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { collection: collectionName, id } = req.query;

    if (!collectionName || typeof collectionName !== 'string') {
        return res.status(400).json({ message: "Missing or invalid 'collection' parameter" });
    }

    // Allowed collections to prevent arbitrary DB access
    const ALLOWED_COLLECTIONS = [
        "projects", "skills", "experience", "education",
        "certifications", "posts", "messages"
    ];

    if (!ALLOWED_COLLECTIONS.includes(collectionName)) {
        return res.status(400).json({ message: `Collection '${collectionName}' not supported` });
    }

    try {
        const client = await clientPromise;
        const db = client.db("portfolio");
        const collection = db.collection(collectionName);

        switch (req.method) {
            case 'GET':
                // Special handling for single message fetch if needed, but usually we fetch all
                if (id) {
                    return res.status(200).json(await collection.findOne({ _id: new ObjectId(id as string) }));
                }
                const items = await collection.find({}).toArray();
                return res.status(200).json(items);

            case 'POST':
                const body = req.body;
                if (Array.isArray(body)) {
                    // Bulk Replace Strategy (Used by Admin for ordered lists)
                    // messages collection usually shouldn't be bulk replaced but Admin doesn't do that for messages currently
                    if (collectionName === 'messages') {
                        return res.status(400).json({ message: "Bulk replace not allowed for messages" });
                    }

                    await collection.deleteMany({});
                    if (body.length > 0) {
                        await collection.insertMany(body);
                    }
                    return res.status(200).json({ message: `${collectionName} replaced successfully` });
                } else {
                    // Single Create (e.g. New Message or New Post)
                    // If it's a message, add date if missing
                    if (collectionName === 'messages' && !body.date) {
                        body.date = new Date().toISOString();
                    }
                    const insertResult = await collection.insertOne(body);
                    return res.status(201).json({ ...body, _id: insertResult.insertedId });
                }

            case 'PUT':
                const { _id, ...updateData } = req.body;
                const targetId = _id || updateData.id; // Support 'id' if '_id' is missing

                if (!targetId) return res.status(400).json({ message: 'Missing _id or id in body' });

                try {
                    // Try by ObjectId first if looks like one
                    if (typeof targetId === 'string' && targetId.length === 24) {
                        const result = await collection.updateOne({ _id: new ObjectId(targetId) }, { $set: updateData });
                        if (result.matchedCount > 0) return res.status(200).json({ message: 'Item updated' });
                    }
                    // Fallback to simple id match (or if ObjectId match found zero docs)
                    await collection.updateOne({ id: targetId }, { $set: updateData });
                } catch (e) {
                    // If ObjectId throws, try exact match on id field
                    await collection.updateOne({ id: targetId }, { $set: updateData });
                }
                return res.status(200).json({ message: 'Item updated' });

            case 'DELETE':
                if (!id) return res.status(400).json({ message: 'Missing id query param' });
                // Try both standard ID string (if used) and ObjectId
                try {
                    await collection.deleteOne({ _id: new ObjectId(id as string) });
                } catch {
                    // specific string id fallback if utilizing custom ids
                    await collection.deleteOne({ id: id as string });
                }
                return res.status(200).json({ message: 'Item deleted' });

            default:
                res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
                return res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (e: any) {
        console.error(e);
        return res.status(500).json({ message: e.message });
    }
}
