interface GeminiGenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  responseSchema?: any;
  models?: string[];
}

// Models in optimal order of daily limit quota, capabilities, and reliability.
const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3-flash",
];

export async function generateWithGemini(
  prompt: string | any[],
  config: GeminiGenerationConfig = {}
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const parts = typeof prompt === "string" ? [{ text: prompt }] : prompt;
  let lastError: Error | null = null;
  const modelsToTry = config.models || GEMINI_MODELS;

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: config.temperature ?? 0.55,
            maxOutputTokens: config.maxOutputTokens ?? 700,
            responseMimeType: config.responseMimeType,
            responseSchema: config.responseSchema,
          },
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP error ${response.status}`;
        console.warn(`Gemini model ${model} failed: ${errMsg}`);
        lastError = new Error(`Model ${model} failed: ${errMsg}`);
        continue;
      }

      const result = await response.json();
      const output = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof output === "string") {
        console.log(`Successfully generated content using Gemini model: ${model}`);
        return output;
      } else {
        lastError = new Error(`Model ${model} returned empty or invalid content structure`);
      }
    } catch (error) {
      console.warn(`Exception calling Gemini model ${model}:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error("All Gemini fallback models exhausted");
}

export interface GeminiToolResponse {
  text?: string;
  functionCalls?: Array<{
    name: string;
    args: any;
  }>;
}

/**
 * Advanced generation supporting multi-turn content history and tool calling declarations.
 */
export async function generateWithTools(
  contents: any[],
  tools?: any[],
  config: GeminiGenerationConfig = {}
): Promise<GeminiToolResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  let lastError: Error | null = null;
  const modelsToTry = config.models || GEMINI_MODELS;

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const requestBody: any = {
        contents,
        generationConfig: {
          temperature: config.temperature ?? 0.45,
          maxOutputTokens: config.maxOutputTokens ?? 800,
          responseMimeType: config.responseMimeType,
          responseSchema: config.responseSchema,
        },
      };

      if (tools && tools.length > 0) {
        requestBody.tools = tools;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP error ${response.status}`;
        console.warn(`Gemini model ${model} tools call failed: ${errMsg}`);
        lastError = new Error(`Model ${model} tools call failed: ${errMsg}`);
        continue;
      }

      const result = await response.json();
      const parts = result?.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts) && parts.length > 0) {
        const functionCalls: any[] = [];
        let text = "";

        for (const part of parts) {
          if (part.functionCall) {
            functionCalls.push({
              name: part.functionCall.name,
              args: part.functionCall.args,
            });
          }
          if (part.text) {
            text += part.text;
          }
        }

        console.log(`Successfully completed tool/text generation using model: ${model}`);
        return {
          text: text || undefined,
          functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
        };
      }

      lastError = new Error(`Model ${model} returned empty content parts for tools call`);
    } catch (error) {
      console.warn(`Exception in generateWithTools for model ${model}:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error("All Gemini fallback models for tools exhausted");
}
