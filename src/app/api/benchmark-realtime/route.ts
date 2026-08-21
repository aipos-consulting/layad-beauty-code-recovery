import { NextResponse } from "next/server";
import { buildAxisProfiles, buildTypeFits, EvidenceForScoring } from "@/lib/product-intelligence/scoring";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const PRODUCT = "디어달리아 글로우 프라이머";
const MODEL = process.env.OPENAI_MODEL ?? process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-5-mini";

type AIResult = {
  reviews: Array<{
    sourceUrl: string;
    reviewText: string;
    features: Array<{
      axis: "OD" | "GM" | "PC" | "VE";
      code: "O" | "D" | "G" | "M" | "P" | "C" | "V" | "E";
      sentiment: "positive" | "negative" | "neutral" | "mixed";
      intensity: number;
      confidence: number;
      keyword: string;
    }>;
  }>;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

function outputText(payload: OpenAIResponse) {
  if (payload.output_text) return payload.output_text;
  return payload.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("") ?? "";
}

function toEvidence(result: AIResult): EvidenceForScoring[] {
  const rows: EvidenceForScoring[] = [];
  result.reviews.forEach((review, reviewIndex) => {
    review.features.forEach((feature) => {
      rows.push({
        reviewKey: `bench-${reviewIndex}`,
        axis: feature.axis,
        code: feature.code,
        sentiment: feature.sentiment,
        intensity: Math.max(0, Math.min(1, feature.intensity)),
        confidence: Math.max(0, Math.min(1, feature.confidence)),
        verified: /^https?:\/\/(?:www\.)?oliveyoung\.co\.kr\//i.test(review.sourceUrl),
      });
    });
  });
  return rows;
}

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, code: "AI_NOT_CONFIGURED" }, { status: 503 });

  const totalStart = performance.now();
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      reviews: {
        type: "array",
        minItems: 0,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            sourceUrl: { type: "string" },
            reviewText: { type: "string" },
            features: {
              type: "array",
              maxItems: 4,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  axis: { type: "string", enum: ["OD", "GM", "PC", "VE"] },
                  code: { type: "string", enum: ["O", "D", "G", "M", "P", "C", "V", "E"] },
                  sentiment: { type: "string", enum: ["positive", "negative", "neutral", "mixed"] },
                  intensity: { type: "number", minimum: 0, maximum: 1 },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                  keyword: { type: "string" }
                },
                required: ["axis", "code", "sentiment", "intensity", "confidence", "keyword"]
              }
            }
          },
          required: ["sourceUrl", "reviewText", "features"]
        }
      }
    },
    required: ["reviews"]
  };

  const prompt = `Realtime benchmark for LAYAD. Exact product: ${PRODUCT}. Search ONLY Olive Young Korea. Find the first 3 to 5 PUBLIC consumer-review evidence items for this exact cosmetic product and stop immediately once enough evidence is found. Do not search other domains. Do not collect long quotes. Each review should be a short paraphrase with its real Olive Young source URL. Extract at most 4 strong product-use features and map only to OD, GM, PC, VE with code, sentiment, intensity and confidence. Return fewer reviews rather than searching broadly or fabricating evidence. Latency target is under 10 seconds, so prioritize fast, high-confidence evidence over exhaustive coverage.`;

  const openaiStart = performance.now();
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        store: false,
        tools: [{
          type: "web_search",
          filters: { allowed_domains: ["oliveyoung.co.kr"] },
          search_context_size: "low"
        }],
        input: prompt,
        text: { format: { type: "json_schema", name: "layad_realtime_benchmark", strict: true, schema } }
      }),
      signal: AbortSignal.timeout(9000)
    });
    const openaiMs = Math.round(performance.now() - openaiStart);
    if (!response.ok) {
      return NextResponse.json({ ok: false, product: PRODUCT, model: MODEL, mode: "oliveyoung-first", openaiMs, totalMs: Math.round(performance.now() - totalStart), status: response.status, error: (await response.text()).slice(0, 1000) }, { status: 502 });
    }
    const payload = await response.json() as OpenAIResponse;
    const text = outputText(payload);
    if (!text) return NextResponse.json({ ok: false, product: PRODUCT, model: MODEL, mode: "oliveyoung-first", openaiMs, totalMs: Math.round(performance.now() - totalStart), error: "empty_output" }, { status: 502 });

    const parseStart = performance.now();
    const parsed = JSON.parse(text) as AIResult;
    const evidences = toEvidence(parsed);
    const profiles = buildAxisProfiles(evidences);
    const fits = buildTypeFits(evidences, profiles);
    const scoringMs = Math.round(performance.now() - parseStart);
    const totalMs = Math.round(performance.now() - totalStart);

    return NextResponse.json({
      ok: true,
      product: PRODUCT,
      model: MODEL,
      mode: "oliveyoung-first",
      reviewCount: parsed.reviews.length,
      featureCount: evidences.length,
      openaiMs,
      scoringMs,
      totalMs,
      within10s: totalMs <= 10000,
      bestFit: [...fits].sort((a, b) => b.fitScore - a.fitScore)[0] ?? null,
      usage: payload.usage ?? null
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const openaiMs = Math.round(performance.now() - openaiStart);
    return NextResponse.json({
      ok: false,
      product: PRODUCT,
      model: MODEL,
      mode: "oliveyoung-first",
      openaiMs,
      totalMs: Math.round(performance.now() - totalStart),
      within10s: false,
      error: error instanceof Error ? error.message : "benchmark_failed"
    }, { status: 504, headers: { "Cache-Control": "no-store" } });
  }
}
