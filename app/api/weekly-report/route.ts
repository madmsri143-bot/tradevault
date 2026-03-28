import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { adminDb } from "@/lib/firebase-admin";

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

  const apiKey = process.env.OPENAI_API_KEY;
  console.log("OPENAI_API_KEY:", apiKey ? "FOUND ✅" : "MISSING ❌");

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

    // ━━━ GENERATE NEW REPORT ━━━
    if (!apiKey) {
      console.error("OPENAI_API_KEY not configured");
      return NextResponse.json(FALLBACK_REPORT);
    }

    const openai = new OpenAI({ apiKey });

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

    console.log("Calling OpenAI GPT-4o-mini...");

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "You are a professional trading psychology coach. Analyze trading journal data and return ONLY valid JSON. No markdown, no explanation, no code blocks.",
          },
          {
            role: "user",
            content: `Analyze this weekly trading journal data:\n\n${JSON.stringify(cleanJournals)}\n\nReturn ONLY this JSON structure:\n{\n  "avgScore": number 0-100,\n  "topMistake": "most common mistake",\n  "bestDay": "best trading day",\n  "weakness": "key weakness",\n  "advice": "actionable advice"\n}`,
          },
        ],
      });
    } catch (openaiErr: any) {
      console.error("OPENAI API CALL FAILED:", openaiErr?.message || openaiErr);
      return NextResponse.json(FALLBACK_REPORT);
    }

    const rawText = completion.choices?.[0]?.message?.content || "";
    console.log("RAW OPENAI RESPONSE:", rawText);

    if (!rawText) {
      console.error("OpenAI returned empty response");
      return NextResponse.json(FALLBACK_REPORT);
    }

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
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  
  let firebaseStatus = "unknown";
  try {
    await adminDb.collection("_health").doc("ping").set({ ts: Date.now() });
    firebaseStatus = "connected";
  } catch (e: any) {
    firebaseStatus = `error: ${e?.message}`;
  }

  let openaiStatus = "not tested";
  if (openaiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey });
      const test = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 10,
        messages: [{ role: "user", content: "Say OK" }],
      });
      openaiStatus = test.choices?.[0]?.message?.content || "empty response";
    } catch (e: any) {
      openaiStatus = `error: ${e?.message}`;
    }
  }

  return NextResponse.json({
    openaiKey: openaiKey ? `set (${openaiKey.slice(0, 8)}...${openaiKey.slice(-4)})` : "MISSING",
    geminiKey: geminiKey ? `set (${geminiKey.slice(0, 8)}...${geminiKey.slice(-4)})` : "MISSING",
    firebaseAdmin: firebaseStatus,
    openaiTest: openaiStatus,
    timestamp: new Date().toISOString(),
  });
}
