import clientPromise from './mongodb.js';

const DB_NAME = process.env.MONGODB_DB_NAME || "rohit_portfolio";

/**
 * Generates vector embedding (768 dimensions) using Gemini's embedding model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = "gemini-embedding-2";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: {
          parts: [{ text }],
        },
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || `HTTP error ${response.status}`;
      throw new Error(`Embedding model failed: ${errMsg}`);
    }

    const result = await response.json();
    const values = result?.embedding?.values;
    if (Array.isArray(values) && values.length > 0) {
      return values as number[];
    }
    throw new Error("Empty or invalid embedding structure returned");
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Calculates cosine similarity between two vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface MemorySearchResult {
  id: string;
  content: string;
  sourceType: string;
  sourceId: string | null;
  similarity: number;
  createdAt: Date;
}

/**
 * Performs in-memory cosine similarity search across all stored memory embeddings.
 */
export async function searchMemory(query: string, limit = 5): Promise<MemorySearchResult[]> {
  try {
    const queryVector = await generateEmbedding(query);
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const allEmbeddings = await db.collection("memory_embeddings").find({}).toArray();

    const scored = allEmbeddings.map((emb: any) => {
      let vector: number[] = [];
      try {
        if (typeof emb.embedding === "string") {
          vector = JSON.parse(emb.embedding);
        } else if (Array.isArray(emb.embedding)) {
          vector = emb.embedding as number[];
        }
      } catch (err) {
        console.error("Failed to parse vector for memory ID:", emb._id);
      }

      if (vector.length !== queryVector.length) {
        return null;
      }

      const similarity = cosineSimilarity(queryVector, vector);
      return {
        id: emb._id.toString(),
        content: emb.content,
        sourceType: emb.sourceType,
        sourceId: emb.sourceId,
        similarity,
        createdAt: emb.createdAt,
      };
    }).filter((x): x is MemorySearchResult => x !== null);

    // Sort descending by similarity
    scored.sort((a, b) => b.similarity - a.similarity);

    return scored.slice(0, limit);
  } catch (error) {
    console.error("Error searching memory:", error);
    return [];
  }
}
