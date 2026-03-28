import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60; // Allow enough time for AI processing on Vercel
export const dynamic = "force-dynamic";

// Timeout utility for vision tasks
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Server missing AI Configuration (GEMINI_API_KEY)" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Extract base64 and mime payload
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return NextResponse.json({ error: "Invalid image format mapping" }, { status: 400 });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    const prompt = `You are a strict financial data extraction tool.
Analyze this MT5/Trading screenshot and extract all visible trading data rows.
You MUST output ONLY a pure JSON array containing the structured data.
Adhere EXACTLY to this JSON format and do not include any markdown, backticks, or conversational text:
[
  {
    "symbol": "XAUUSD",
    "type": "BUY",
    "lot": 0.1,
    "entry": 1920.5,
    "exit": 1930.2,
    "pnl": 100,
    "commission": -2,
    "date": "2026-03-27"
  }
]
Rules:
- If a field is missing, attempt to infer it based on context or leave it as an empty string. Make sure numbers are strictly numbers.
- "type" must be exactly "BUY" or "SELL".
- "symbol" must be the pair string without trailing micro dots like ecd or pro.
- Output ONLY the raw JSON array. Start with [ and end with ].`;

    const contents = [
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
    ];

    // ━━━ Vision model fallback chain (Gemini-only, 30s timeout) ━━━
    const VISION_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let responseText = "";
    let usedModel = "";

    for (const model of VISION_MODELS) {
      try {
        console.log(`🖼️ Trying vision model: ${model}`);
        const response = await withTimeout(
          ai.models.generateContent({
            model,
            contents,
            config: {
              responseMimeType: "application/json",
            },
          }),
          30000,
          `Gemini/${model}`
        );

        responseText = response.text || "";
        usedModel = model;

        if (responseText) {
          console.log(`✅ Vision extraction succeeded with ${model}`);
          break;
        }
      } catch (err: any) {
        const status = err?.status || err?.error?.code;
        console.error(`❌ Vision ${model} failed: ${err.message} (status: ${status})`);
        // Continue to next model on rate limit or timeout
        if (status !== 429 && !err.message?.includes("timed out")) {
          // Non-recoverable error for this model, still try others
          continue;
        }
      }
    }

    if (!responseText) {
      return NextResponse.json(
        { error: "All vision models failed. Please try again." },
        { status: 500 }
      );
    }

    // Clean potential markdown blocks
    const cleanedJsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

    let trades = [];
    try {
      trades = JSON.parse(cleanedJsonStr);
    } catch (e) {
      console.error("Failed to parse JSON string:", responseText);
      return NextResponse.json(
        { error: "AI failed to return valid structured JSON configuration." },
        { status: 500 }
      );
    }

    return NextResponse.json({ trades, model: usedModel });
  } catch (error: any) {
    console.error("Extraction API Route Internal Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process the screenshot data stream." },
      { status: 500 }
    );
  }
}
