
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { password } = req.body;
        const serverPassword = process.env.ADMIN_PASSWORD;

        if (!serverPassword) {
            console.error("ADMIN_PASSWORD env var is missing");
            return res.status(500).json({ message: "Server configuration error" });
        }

        if (password === serverPassword) {
            return res.status(200).json({ success: true, message: "Authenticated" });
        } else {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
}
