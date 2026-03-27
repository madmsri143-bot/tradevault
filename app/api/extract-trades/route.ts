import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60; // Allow enough time for AI processing on Vercel
export const dynamic = "force-dynamic";

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

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "";
    // Clean potential markdown blocks
    const cleanedJsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let trades = [];
    try {
        trades = JSON.parse(cleanedJsonStr);
    } catch(e) {
        console.error("Failed to parse JSON string:", text);
        return NextResponse.json({ error: "AI failed to return valid structured JSON configuration." }, { status: 500 });
    }

    return NextResponse.json({ trades });

  } catch (error: any) {
    console.error("Extraction API Route Internal Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process the screenshot data stream." }, { status: 500 });
  }
}
