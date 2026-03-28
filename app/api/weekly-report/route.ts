import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { generateAIResponse, checkProviderHealth } from "@/lib/ai-providers";

const FALLBACK_REPORT = {
  avgScore: 0,
  topMistake: "AI unavailable. Please try again.",
  bestDay: "N/A",
  weakness: "N/A",
  advice: "AI service is temporarily unavailable. Please retry in a moment.",
};

// Get ISO week key like "2026-W13"
function getWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  console.log("=== WEEKLY REPORT API HIT ===");

  try {
    const body = await req.json();
    const { journals, userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (!journals || !Array.isArray(journals) || journals.length === 0) {
      return NextResponse.json({ error: "No journal data provided." }, { status: 400 });
    }

    // ━━━ CHECK CACHED REPORT ━━━
    const weekKey = getWeekKey();
    console.log(`Checking cache for user ${userId}, week ${weekKey}`);

    try {
      const cachedDoc = await adminDb
        .collection("users")
        .doc(userId)
        .collection("weeklyReports")
        .doc(weekKey)
        .get();

      if (cachedDoc.exists) {
        console.log("✅ Returning cached weekly report");
        return NextResponse.json({ ...cachedDoc.data(), cached: true });
      }
    } catch (cacheErr) {
      console.error("Cache lookup failed (continuing to generate):", cacheErr);
    }

    // ━━━ CLEAN JOURNAL DATA ━━━
    const cleanJournals = journals.map((j: any) => {
      let dateStr = "unknown";
      try {
        dateStr = new Date(j.date).toISOString().split("T")[0];
      } catch {
        dateStr = String(j.date);
      }
      return {
        date: dateStr,
        pnl: j.pnl,
        moodBefore: j.moodBefore,
        moodAfter: j.moodAfter,
        mistakes: j.mistakes,
        qualityScore: j.qualityScore,
        slFollowed: j.slFollowed,
        aiScore: j.aiScore,
      };
    });

    // ━━━ GENERATE NEW REPORT VIA AI ENGINE ━━━
    const prompt = `Analyze this weekly trading journal data:\n\n${JSON.stringify(cleanJournals)}\n\nReturn ONLY this JSON structure:\n{\n  "avgScore": number 0-100,\n  "topMistake": "most common mistake",\n  "bestDay": "best trading day",\n  "weakness": "key weakness",\n  "advice": "actionable advice"\n}`;

    let aiResponse;
    try {
      aiResponse = await generateAIResponse(prompt, {
        task: "complex",
        timeoutMs: 8000,
        systemPrompt:
          "You are a professional trading psychology coach. Analyze trading journal data and return ONLY valid JSON. No markdown, no explanation, no code blocks.",
      });
      console.log(`✅ Weekly report generated via ${aiResponse.provider}/${aiResponse.model} (${aiResponse.latencyMs}ms)`);
    } catch (aiErr: any) {
      console.error("ALL AI PROVIDERS FAILED:", aiErr.message);
      return NextResponse.json({
        ...FALLBACK_REPORT,
        error: "All AI providers are currently unavailable. Please try again in a moment.",
      });
    }

    // ━━━ PARSE AI RESPONSE ━━━
    const rawText = aiResponse.text;
    const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("JSON PARSE ERROR:", cleaned);
      return NextResponse.json(FALLBACK_REPORT);
    }

    const result = {
      avgScore: typeof parsed.avgScore === "number" ? parsed.avgScore : 0,
      topMistake: parsed.topMistake || "None identified",
      bestDay: parsed.bestDay || "N/A",
      weakness: parsed.weakness || "N/A",
      advice: parsed.advice || "Keep journaling consistently.",
      generatedAt: new Date().toISOString(),
      weekKey,
      provider: `${aiResponse.provider}/${aiResponse.model}`,
    };

    // ━━━ STORE IN FIRESTORE ━━━
    try {
      await adminDb
        .collection("users")
        .doc(userId)
        .collection("weeklyReports")
        .doc(weekKey)
        .set(result);
      console.log(`✅ Report cached for week ${weekKey}`);
    } catch (storeErr) {
      console.error("Failed to cache report (still returning result):", storeErr);
    }

    console.log("✅ Weekly report generated and stored");
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("FULL UNHANDLED ERROR:", error?.message || error);
    return NextResponse.json(FALLBACK_REPORT);
  }
}

// Debug endpoint — visit /api/weekly-report in browser to check config
export async function GET() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const mistralKey = process.env.MISTRAL_API_KEY;
  const hfKey = process.env.HF_API_KEY;

  let firebaseStatus = "unknown";
  try {
    await adminDb.collection("_health").doc("ping").set({ ts: Date.now() });
    firebaseStatus = "connected";
  } catch (e: any) {
    firebaseStatus = `error: ${e?.message}`;
  }

  // Check all provider health
  let providerHealth: any[] = [];
  try {
    providerHealth = await checkProviderHealth();
  } catch (e: any) {
    providerHealth = [{ error: e?.message }];
  }

  return NextResponse.json({
    providers: {
      gemini: geminiKey ? `set (${geminiKey.slice(0, 8)}...)` : "MISSING",
      groq: groqKey ? `set (${groqKey.slice(0, 8)}...)` : "MISSING",
      mistral: mistralKey ? `set (${mistralKey.slice(0, 8)}...)` : "MISSING",
      huggingface: hfKey ? `set (${hfKey.slice(0, 8)}...)` : "MISSING",
    },
    providerHealth,
    firebaseAdmin: firebaseStatus,
    timestamp: new Date().toISOString(),
  });
}
