import { GoogleGenAI } from '@google/genai';

let cachedDefaultClient: GoogleGenAI | null = null;
let cachedDefaultKey: string | null = null;

export function getGeminiClient(apiKeyOverride?: string): GoogleGenAI | null {
  const cleanOverride = apiKeyOverride?.trim();
  if (cleanOverride) {
    return new GoogleGenAI({
      apiKey: cleanOverride,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    null;

  if (!apiKey) {
    return null;
  }

  if (!cachedDefaultClient || cachedDefaultKey !== apiKey) {
    cachedDefaultKey = apiKey;
    cachedDefaultClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedDefaultClient;
}

export function getGeminiModel(modelOverride?: string): string {
  const cleanOverride = modelOverride?.trim();
  if (cleanOverride) return cleanOverride;
  return process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-3.5-flash';
}

export const GEMINI_MODEL = getGeminiModel();
