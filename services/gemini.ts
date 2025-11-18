import { GoogleGenAI } from "@google/genai";
import { GameStats } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_NAME = "gemini-2.5-flash";

export const generateDeathEpitaph = async (stats: GameStats): Promise<string> => {
  if (!process.env.API_KEY) return "The void consumes all... (No API Key provided)";

  try {
    const prompt = `
      You are an ancient, cryptic Vampire Lord observing a fallen hero.
      The hero has died in the 'Endless Void'.
      
      Stats:
      - Time Survived: ${Math.floor(stats.timeSurvived)} seconds
      - Enemies Banished: ${stats.enemiesKilled}
      - Power Level Reached: ${stats.levelReached}

      Write a short, dark, slightly mocking but poetic epitaph (max 2 sentences) for this hero.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return response.text || "Your soul fades into silence...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The darkness is too thick to hear the Lord's voice.";
  }
};

export const generateLevelUpFlavor = async (level: number): Promise<string> => {
  if (!process.env.API_KEY) return "Power surges through you.";

  try {
    const prompt = `
      The hero has reached level ${level} in a dark fantasy survivor game.
      Write a very short (max 10 words), intense phrase about growing power or dark ascendance.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return response.text || "Power surges through you.";
  } catch (error) {
    return "Power surges through you.";
  }
};
