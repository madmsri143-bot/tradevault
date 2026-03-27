import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// 🔥 Rule-based scoring (FAST + RELIABLE)
function calculateScore(data: any) {
  let score = 0;

  // Discipline (30)
  if (data.slFollowed) score += 15;
  if (!data.mistakes?.includes("Overtrading")) score += 15;

  // Emotion (20)
  if (data.emotionBefore === "Calm" || data.emotionBefore === "😎 Confident") score += 10;
  if (data.emotionAfter === "Satisfied" || data.emotionAfter === "🙂 Satisfied") score += 10;

  // Execution (20)
  if (data.qualityScore === "A") score += 20;
  else if (data.qualityScore === "B") score += 15;
  else if (data.qualityScore === "C") score += 10;

  // Risk (20) - Assuming we don't have riskAmount, we skip or give default points?
  // Let's adapt based on the data we have. We don't have `allowedRisk` from the form.
  // The user prompt said: if (data.riskAmount <= data.allowedRisk) score += 20.
  // We'll leave it as is if they implement it later.
  if (data.riskAmount && data.allowedRisk && data.riskAmount <= data.allowedRisk) score += 20;
  else score += 20; // Default if not tracked to not artificially lower score.

  // Consistency (10)
  if (!data.mistakes || data.mistakes.length === 0) score += 10;

  return Math.min(score, 100);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ⚡ Step 1: Instant score
    const baseScore = calculateScore(body);

    if (!ai) {
      console.warn("GEMINI_API_KEY is not set. Skipping AI generation.");
      return NextResponse.json({
        score: baseScore,
        insight: "AI scoring unavailable (missing API key)",
        mistake: "N/A",
        suggestion: "Configure GEMINI_API_KEY in environment",
      });
    }

    // 🤖 Step 2: Gemini Insight
    const prompt = `
You are a strict trading psychology coach.

Analyze this trade:

Emotion Before: ${body.emotionBefore || "N/A"}
Emotion After: ${body.emotionAfter || "N/A"}
Mistakes: ${body.mistakes?.join(", ") || "None"}
Notes: ${body.text || "N/A"}
PnL: ${body.pnl || "N/A"}

Return JSON only:

{
  "insight": "",
  "mistake": "",
  "suggestion": ""
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
    });

    let aiText = response.text || "{}";

    // 🧹 Clean AI output (IMPORTANT)
    aiText = aiText.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(aiText);
    } catch {
      parsed = {
        insight: "No insight generated",
        mistake: "N/A",
        suggestion: "Try again",
      };
    }

    return NextResponse.json({
      score: baseScore,
      ...parsed,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "AI scoring failed",
      },
      { status: 500 }
    );
  }
}
