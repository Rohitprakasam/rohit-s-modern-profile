export async function sendWhatsAppText(to: string, text: string, token?: string | null) {
  const activeToken = token || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  if (!activeToken || !phoneId) {
    console.warn("WhatsApp credentials not set (missing token or phone number ID)");
    return { success: false, error: "Credentials missing" };
  }

  const version = process.env.GRAPH_API_VERSION || "v25.0";
  const url = `https://graph.facebook.com/${version}/${phoneId}/messages`;
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${activeToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    });

    if (!res.ok) {
      const errPayload = await res.json().catch(() => ({}));
      console.error("Failed to send WhatsApp message via Graph API:", JSON.stringify(errPayload));
      return { success: false, error: errPayload };
    }

    console.log("Successfully sent WhatsApp message to:", to);
    return { success: true };
  } catch (error) {
    console.error("Exception during WhatsApp sendWhatsAppText fetch:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
