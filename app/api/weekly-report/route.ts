import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const FALLBACK_REPORT = {
  avgScore: 0,
  topMistake: "AI unavailable. Please try again.",
  bestDay: "N/A",
  weakness: "N/A",
  advice: "AI service is temporarily unavailable. Please retry in a moment.",
};

export async function POST(req: NextRequest) {
  console.log("=== WEEKLY REPORT API HIT ===");

  const apiKey = process.env.GEMINI_API_KEY;
  console.log("API KEY:", apiKey ? "FOUND ✅" : "MISSING ❌");

  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in environment variables");
    return NextResponse.json(FALLBACK_REPORT);
  }

  let ai: GoogleGenAI;
  try {
    ai = new GoogleGenAI({ apiKey });
    console.log("GoogleGenAI client initialized ✅");
  } catch (initErr) {
    console.error("FAILED to initialize GoogleGenAI client:", initErr);
    return NextResponse.json(FALLBACK_REPORT);
  }

  try {
    const body = await req.json();
    const { journals } = body;
    console.log("Incoming body keys:", Object.keys(body));
    console.log("Journal entries count:", journals?.length ?? 0);

    if (!journals || !Array.isArray(journals) || journals.length === 0) {
      console.warn("No journal data provided in request body");
      return NextResponse.json(
        { error: "No journal data provided." },
        { status: 400 }
      );
    }

    // Strip heavy fields to save tokens
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

    console.log("Clean journals payload:", JSON.stringify(cleanJournals));

    const prompt = `Analyze this weekly trading journal data and provide a performance report.

Data:
${JSON.stringify(cleanJournals)}

Return ONLY valid JSON (no markdown, no code blocks, no explanation):
{
  "avgScore": number between 0-100,
  "topMistake": "most common mistake string",
  "bestDay": "best performing day string",
  "weakness": "key weakness identified",
  "advice": "actionable trading advice"
}`;

    const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"];
    let response;
    let usedModel = "";

    for (const model of MODELS) {
      try {
        console.log(`Trying model: ${model}...`);
        response = await ai.models.generateContent({
          model,
          contents: prompt,
        });
        usedModel = model;
        console.log(`✅ Success with model: ${model}`);
        break;
      } catch (modelErr: any) {
        const status = modelErr?.status || modelErr?.error?.code;
        console.error(`❌ ${model} failed (status ${status}):`, modelErr?.message?.slice(0, 200) || modelErr);
        if (status === 429) {
          console.log(`Rate limited on ${model}, trying next model...`);
          continue;
        }
        // Non-rate-limit error — don't try other models
        console.error("FULL ERROR:", JSON.stringify(modelErr, null, 2));
        return NextResponse.json(FALLBACK_REPORT);
      }
    }

    if (!response) {
      console.error("All models rate limited");
      return NextResponse.json({
        ...FALLBACK_REPORT,
        topMistake: "Rate limit exceeded. Please try again in a few minutes.",
        advice: "Your free tier quota is temporarily exhausted. Wait a minute and retry.",
      });
    }

    console.log(`Used model: ${usedModel}`);

    const rawText = response?.text;
    console.log("RAW GEMINI RESPONSE:", rawText);

    if (!rawText) {
      console.error("Gemini returned empty/null response");
      return NextResponse.json(FALLBACK_REPORT);
    }

    // Clean markdown code blocks if present
    const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    console.log("CLEANED TEXT:", cleaned);

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
      console.log("PARSED JSON:", JSON.stringify(parsed));
    } catch (parseErr) {
      console.error("JSON PARSE ERROR. Raw cleaned text:", cleaned);
      console.error("Parse error:", parseErr);
      return NextResponse.json(FALLBACK_REPORT);
    }

    // Validate required fields exist
    const result = {
      avgScore: typeof parsed.avgScore === "number" ? parsed.avgScore : 0,
      topMistake: parsed.topMistake || "None identified",
      bestDay: parsed.bestDay || "N/A",
      weakness: parsed.weakness || "N/A",
      advice: parsed.advice || "Keep journaling consistently.",
    };

    console.log("✅ Weekly report generated successfully:", JSON.stringify(result));
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("FULL UNHANDLED ERROR:", error?.message || error);
    console.error("ERROR STACK:", error?.stack);
    return NextResponse.json(FALLBACK_REPORT);
  }
}
