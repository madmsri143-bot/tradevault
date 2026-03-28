import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/ai-providers";

// 🔥 Rule-based scoring (FAST + RELIABLE — always runs first)
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

  // Risk (20)
  if (data.riskAmount && data.allowedRisk && data.riskAmount <= data.allowedRisk) score += 20;
  else score += 20; // Default if not tracked to not artificially lower score.

  // Consistency (10)
  if (!data.mistakes || data.mistakes.length === 0) score += 10;

  return Math.min(score, 100);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ⚡ Step 1: Instant rule-based score
    const baseScore = calculateScore(body);

    // 🤖 Step 2: AI-powered insight via failover engine
    const prompt = `Analyze this trade:

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
}`;

    let aiResult;
    try {
      aiResult = await generateAIResponse(prompt, {
        task: "simple", // Fast routing: Groq first
        timeoutMs: 8000,
        systemPrompt: "You are a strict trading psychology coach. Return ONLY valid JSON. No markdown, no code blocks.",
      });
      console.log(`✅ AI Score insight via ${aiResult.provider}/${aiResult.model} (${aiResult.latencyMs}ms)`);
    } catch (err: any) {
      console.error("All AI providers failed for scoring:", err.message);
      return NextResponse.json({
        score: baseScore,
        insight: "AI insight unavailable",
        mistake: "N/A",
        suggestion: "All AI providers are currently unavailable. Try again later.",
      });
    }

    // 🧹 Clean AI output
    let aiText = aiResult.text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(aiText);
    } catch {
      console.error("Failed to parse AI response:", aiText);
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
    console.error("AI score route error:", error);

    return NextResponse.json(
      {
        error: "AI scoring failed",
      },
      { status: 500 }
    );
  }
}
