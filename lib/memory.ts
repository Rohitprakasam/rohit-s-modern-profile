import clientPromise from './mongodb';
import { generateEmbedding } from './embeddings';

const DB_NAME = process.env.MONGODB_DB_NAME || "rohit_portfolio";

/**
 * Saves a message turn to the conversation_messages collection.
 */
export async function saveMessage(
  role: "user" | "assistant" | "system",
  content: string,
  source = "whatsapp"
) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const msg = await db.collection("conversation_messages").insertOne({
      role,
      content,
      source,
      createdAt: new Date(),
    });

    // Also embed messages for RAG search
    try {
      const textToEmbed = `[Conversation - ${role}] ${content}`;
      const vector = await generateEmbedding(textToEmbed);
      await db.collection("memory_embeddings").insertOne({
        content: textToEmbed,
        sourceType: "conversation",
        sourceId: msg.insertedId.toString(),
        embedding: vector,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("Failed to embed conversation message:", err);
    }

    return { id: msg.insertedId.toString(), role, content, source };
  } catch (error) {
    console.error("Error saving conversation message:", error);
    return null;
  }
}

/**
 * Retrieves the most recent conversation messages.
 */
export async function getRecentConversation(source = "whatsapp", limit = 10) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const messages = await db.collection("conversation_messages")
      .find({ source })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return messages.reverse(); // Return in chronological order
  } catch (error) {
    console.error("Error fetching conversation history:", error);
    return [];
  }
}

/**
 * Formats a tracker entry to human readable form, generates embedding, and stores it in memory.
 */
export async function embedAndStoreTrackerEntry(
  id: string,
  type: string,
  title: string,
  amount?: number | null,
  category?: string | null
) {
  try {
    let readableText = "";
    if (type === "expense") {
      readableText = `Logged expense of ₹${amount ?? 0} on "${title}" under category "${category || "General"}"`;
    } else if (type === "income") {
      readableText = `Logged income of ₹${amount ?? 0} from "${title}"`;
    } else if (type === "task") {
      readableText = `Created task: "${title}"`;
    } else if (type === "health_checkin" && category === "Water") {
      readableText = `Drank ${amount ?? 0}ml of water`;
    } else if (type === "exam_study") {
      readableText = `Studied "${category || "General"}" for ${amount ?? 0} hours`;
    } else if (type === "reminder") {
      readableText = `Scheduled reminder for: "${title}"`;
    } else {
      readableText = `Logged ${type} record: "${title}"${amount ? ` with value ${amount}` : ""}`;
    }

    const vector = await generateEmbedding(readableText);

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await db.collection("memory_embeddings").insertOne({
      content: readableText,
      sourceType: type,
      sourceId: id,
      embedding: vector,
      createdAt: new Date(),
    });
    console.log(`Successfully embedded tracker entry: ${id} (${type})`);
  } catch (err) {
    console.error("Failed to embed and store tracker entry:", err);
  }
}
