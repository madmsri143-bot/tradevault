import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export async function POST(req: NextRequest) {
  try {
    if (!ai) {
      console.warn("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "✅ Connected" : "❌ undefined");
      return NextResponse.json({ error: "Gemini API key not configured." }, { status: 500 });
    }

    console.log("GEMINI_API_KEY: ✅ Connected (weekly-report)");

    const { journals } = await req.json();

    if (!journals || !Array.isArray(journals) || journals.length === 0) {
      return NextResponse.json({ error: "No journal data provided." }, { status: 400 });
    }

    // Strip out heavy text and base64 images to save tokens
    const cleanJournals = journals.map(j => ({
      date: new Date(j.date).toISOString().split('T')[0],
      pnl: j.pnl,
      moodBefore: j.moodBefore,
      moodAfter: j.moodAfter,
      mistakes: j.mistakes,
      mistakeTextLen: j.text?.length,
      aiScore: j.aiScore
    }));

    const prompt = `
Analyze this weekly trading journal data:

${JSON.stringify(cleanJournals)}

Return JSON:

{
  "avgScore": number,
  "topMistake": "string",
  "bestDay": "string",
  "weakness": "string",
  "advice": "string"
}

Ensure the response is STRICTLY valid parseable JSON. No markdown blocks.
`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
    });

    const rawText = response.text?.replace(/```json|```/g, "").trim() || "";

    // ⚠️ Fallback if Gemini returns nothing
    if (!rawText) {
      console.error("Weekly report: Gemini returned empty response");
      return NextResponse.json({
        avgScore: 0,
        topMistake: "AI not responding",
        bestDay: "N/A",
        weakness: "N/A",
        advice: "Try again later",
      });
    }
    
    try {
      const parsed = JSON.parse(rawText);
      return NextResponse.json(parsed);
    } catch (e) {
      console.error("Failed to parse Gemini JSON for weekly report:", rawText);
      return NextResponse.json({ error: "Failed to generate report format." }, { status: 500 });
    }
  } catch (error) {
    console.error("Weekly Report route error:", error);
    return NextResponse.json({ error: "Failed to generate weekly report" }, { status: 500 });
  }
}
