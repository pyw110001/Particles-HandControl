import { GoogleGenAI, Type } from "@google/genai";
import { ColorTheme } from "../types";

const createClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is not set. Gemini features will not work.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateThemeFromPrompt = async (prompt: string): Promise<ColorTheme | null> => {
  const ai = createClient();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a 3-color gradient palette for a particle system based on this mood/description: "${prompt}". 
      The colors should be distinct and vibrant.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "A creative name for the theme" },
            start: { type: Type.STRING, description: "Start hex color (deep/dark)" },
            mid: { type: Type.STRING, description: "Middle hex color (vibrant)" },
            end: { type: Type.STRING, description: "End hex color (bright/highlight)" },
          },
          required: ["name", "start", "mid", "end"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as ColorTheme;
    }
    return null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};