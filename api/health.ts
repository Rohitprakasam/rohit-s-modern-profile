
import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
    res.status(200).json({ status: 'ok', message: 'API is working', env: process.env.MONGODB_URI ? 'Set' : 'Missing' });
}
