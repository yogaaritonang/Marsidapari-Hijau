import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;
let cachedKey: string | null = null;

export function getGeminiClient(apiKeyOverride?: string): GoogleGenAI | null {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || cachedKey || null;
  if (!apiKey) {
    return null;
  }
  cachedKey = apiKey;
  
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

export function getGeminiModel(modelOverride?: string): string {
  return modelOverride || process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
}

export const GEMINI_MODEL = getGeminiModel();
