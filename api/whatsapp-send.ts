import { VercelRequest, VercelResponse } from '@vercel/node';
import clientPromise from '../lib/mongodb.js';

const DB_NAME = process.env.MONGODB_DB_NAME || "rohit_portfolio";
const templatePattern = /^[a-z0-9_]+$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const body = req.body || {};

  let dbPhone = "";
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const settings = await db.collection("settings").findOne({ _id: "default" as any });
    if (settings?.whatsappPhone) dbPhone = settings.whatsappPhone;
  } catch (err) {
    console.error("Failed to query db for whatsapp phone number:", err);
  }

  const to = typeof body.to === "string" && body.to
    ? body.to
    : (dbPhone || process.env.WHATSAPP_RECIPIENT_PHONE);
  const template = typeof body.template === "string" && body.template ? body.template : process.env.WHATSAPP_TEMPLATE_NAME;
  
  if (!to || !template || !templatePattern.test(template)) {
    return res.status(400).json({ error: "Recipient and valid template are required" });
  }
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    return res.status(503).json({ error: "WhatsApp is not configured" });
  }

  const version = process.env.GRAPH_API_VERSION || "v25.0";
  const response = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: { name: template, language: { code: "en_US" } }
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 || result?.error?.code === 190 || result?.error?.message?.toLowerCase().includes("auth")) {
      return res.status(response.status).json({ error: "Meta Access Token is expired or invalid. Please update the WHATSAPP_ACCESS_TOKEN." });
    }
  }
  return res.status(response.status).json(result);
}
