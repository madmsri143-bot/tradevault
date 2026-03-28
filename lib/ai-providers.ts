/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  AI PROVIDER ENGINE — Production-Grade Failover
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  Chain: Gemini → Groq → Mistral → HuggingFace
 *  Features: Timeout control, task routing, structured logging
 */

import { GoogleGenAI } from "@google/genai";

// ━━━ TYPES ━━━

export interface AIResponse {
  text: string;
  provider: string;
  model: string;
  latencyMs: number;
}

export interface AIOptions {
  /** Route to optimal starting provider */
  task?: "simple" | "complex" | "vision";
  /** Per-provider timeout in ms (default: 8000) */
  timeoutMs?: number;
  /** System prompt prepended to the request */
  systemPrompt?: string;
}

interface ProviderConfig {
  name: string;
  fn: (prompt: string, systemPrompt: string | undefined, timeoutMs: number) => Promise<AIResponse>;
}

// ━━━ TIMEOUT UTILITY ━━━

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// ━━━ PROVIDER: GEMINI ━━━

async function callGemini(
  prompt: string,
  systemPrompt: string | undefined,
  timeoutMs: number
): Promise<AIResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const ai = new GoogleGenAI({ apiKey });
  const start = Date.now();

  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({ model, contents: fullPrompt }),
        timeoutMs,
        `Gemini/${model}`
      );

      const text = response?.text || "";
      if (!text) throw new Error("Empty response from Gemini");

      return {
        text,
        provider: "gemini",
        model,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      lastError = err;
      // Extract status from various error shapes the SDK can throw
      const status = err?.status || err?.httpStatusCode || err?.error?.code ||
        (err?.message?.includes("429") ? 429 : undefined);
      console.warn(`⚠️ Gemini/${model} failed: ${err.message} (status: ${status || "unknown"})`);
      // Always try next model — rate limits, timeouts, and transient errors are all retryable
      continue;
    }
  }

  throw lastError || new Error("All Gemini models failed");
}

// ━━━ PROVIDER: GROQ ━━━

async function callGroq(
  prompt: string,
  systemPrompt: string | undefined,
  timeoutMs: number
): Promise<AIResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const start = Date.now();

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const model = "llama-3.3-70b-versatile";

  const response = await withTimeout(
    fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    }),
    timeoutMs,
    "Groq"
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => "unknown");
    throw new Error(`Groq API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Empty response from Groq");

  return {
    text,
    provider: "groq",
    model,
    latencyMs: Date.now() - start,
  };
}

// ━━━ PROVIDER: MISTRAL ━━━

async function callMistral(
  prompt: string,
  systemPrompt: string | undefined,
  timeoutMs: number
): Promise<AIResponse> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("MISTRAL_API_KEY not configured");

  const start = Date.now();

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const response = await withTimeout(
    fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    }),
    timeoutMs,
    "Mistral"
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => "unknown");
    throw new Error(`Mistral API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Empty response from Mistral");

  return {
    text,
    provider: "mistral",
    model: "mistral-small-latest",
    latencyMs: Date.now() - start,
  };
}

// ━━━ PROVIDER: HUGGING FACE (via new router.huggingface.co endpoint) ━━━

async function callHuggingFace(
  prompt: string,
  systemPrompt: string | undefined,
  timeoutMs: number
): Promise<AIResponse> {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) throw new Error("HF_API_KEY not configured");

  const start = Date.now();
  const model = "meta-llama/Llama-3.1-8B-Instruct";

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const response = await withTimeout(
    fetch(
      `https://router.huggingface.co/hf-inference/models/${model}/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 1024,
          temperature: 0.7,
        }),
      }
    ),
    timeoutMs,
    "HuggingFace"
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => "unknown");
    throw new Error(`HuggingFace API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Empty response from HuggingFace");

  return {
    text,
    provider: "huggingface",
    model,
    latencyMs: Date.now() - start,
  };
}

// ━━━ PROVIDER CHAIN ━━━

const PROVIDER_CHAIN: ProviderConfig[] = [
  { name: "Gemini", fn: callGemini },
  { name: "Groq", fn: callGroq },
  { name: "Mistral", fn: callMistral },
  { name: "HuggingFace", fn: callHuggingFace },
];

// Smart routing: re-order chain based on task type
function getChainForTask(task: AIOptions["task"]): ProviderConfig[] {
  switch (task) {
    case "simple":
      // Groq first for speed, then Gemini
      return [
        PROVIDER_CHAIN[1], // Groq
        PROVIDER_CHAIN[0], // Gemini
        PROVIDER_CHAIN[2], // Mistral
        PROVIDER_CHAIN[3], // HuggingFace
      ];
    case "complex":
      // Gemini first for reasoning
      return PROVIDER_CHAIN;
    case "vision":
      // Vision is Gemini-only (handled separately)
      return [PROVIDER_CHAIN[0]];
    default:
      return PROVIDER_CHAIN;
  }
}

// ━━━ MAIN EXPORT ━━━

/**
 * Generate an AI response with automatic failover across providers.
 *
 * @param prompt - The user prompt
 * @param options - Task type, timeout, system prompt
 * @returns AIResponse with text, provider info, and latency
 * @throws Error only if ALL providers in the chain fail
 */
export async function generateAIResponse(
  prompt: string,
  options: AIOptions = {}
): Promise<AIResponse> {
  const { task, timeoutMs = 8000, systemPrompt } = options;
  const chain = getChainForTask(task);

  const errors: Array<{ provider: string; error: string }> = [];

  for (const provider of chain) {
    try {
      console.log(`🤖 Trying ${provider.name}...`);
      const result = await provider.fn(prompt, systemPrompt, timeoutMs);
      console.log(
        `✅ ${provider.name} succeeded (${result.model}) in ${result.latencyMs}ms`
      );
      return result;
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      console.error(`❌ ${provider.name} failed: ${errorMsg}`);
      errors.push({ provider: provider.name, error: errorMsg });
    }
  }

  // All providers failed — log full error chain
  console.error("💀 ALL AI PROVIDERS FAILED:", JSON.stringify(errors, null, 2));
  throw new Error(
    `All AI providers failed: ${errors.map((e) => `${e.provider}: ${e.error}`).join(" | ")}`
  );
}

// ━━━ HEALTH CHECK (for debug endpoints) ━━━

export async function checkProviderHealth(): Promise<
  Array<{ provider: string; status: string; latencyMs?: number }>
> {
  const results: Array<{ provider: string; status: string; latencyMs?: number }> = [];

  for (const provider of PROVIDER_CHAIN) {
    try {
      const start = Date.now();
      await provider.fn("Say OK", undefined, 5000);
      results.push({
        provider: provider.name,
        status: "healthy",
        latencyMs: Date.now() - start,
      });
    } catch (err: any) {
      results.push({
        provider: provider.name,
        status: `error: ${err?.message || "unknown"}`,
      });
    }
  }

  return results;
}
