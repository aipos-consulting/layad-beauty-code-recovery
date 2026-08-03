import { NextRequest, NextResponse } from "next/server";
import {
  generateProductTypeFits,
  type AxisKey,
  type BeautyCodeLetter,
  type Product,
  type ReviewFeatureEvidence,
} from "@/lib/review-product-fit";

type ProductRequestInput = {
  sessionId: string;
  inputType: "name" | "url";
  inputValue: string;
};

type AiFeature = {
  source_url: string;
  source_label: string;
  excerpt: string;
  axis: AxisKey;
  code: BeautyCodeLetter;
  sentiment: "positive" | "negative" | "neutral";
  intensity: number;
  confidence: number;
  context: string;
};

type AiResult = {
  product_name: string;
  brand: string;
  category: string;
  verified: boolean;
  summary: string;
  features: AiFeature[];
};

function config() {
  return {
    supabaseUrl: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    openaiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-5-mini",
  };
}

async function supabase(path: string, init: RequestInit, url: string, key: string) {
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

function outputText(payload: { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }) {
  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text")?.text;
}

async function analyzeWithOpenAI(inputType: "name" | "url", inputValue: string, key: string, model: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      store: false,
      tools: [{ type: "web_search", search_context_size: "medium" }],
      instructions:
        "You are a cosmetics review analyst. Search only public product pages and public review/usage pages. Do not collect reviewer names, handles, emails, account IDs, or other personal data. Distinguish product facts from review context. Map evidence to LAYAD axes: O oily-skin suitability/sebum control, D dry-skin suitability/moisture; G glow preference, M matte preference; P precision/finish optimization, C convenience/ease; V variable results by condition/season, E consistent results. Return evidence only when supported by a public source. If evidence is weak, use lower confidence.",
      input: `Analyze this cosmetics product for LAYAD 16-type fit. Input type: ${inputType}. Product: ${inputValue}. Find the exact product, public descriptions, and public review context. Return 6 to 24 evidence features when possible.`,
      text: {
        format: {
          type: "json_schema",
          name: "layad_product_review_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["product_name", "brand", "category", "verified", "summary", "features"],
            properties: {
              product_name: { type: "string" },
              brand: { type: "string" },
              category: { type: "string" },
              verified: { type: "boolean" },
              summary: { type: "string" },
              features: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["source_url", "source_label", "excerpt", "axis", "code", "sentiment", "intensity", "confidence", "context"],
                  properties: {
                    source_url: { type: "string" },
                    source_label: { type: "string" },
                    excerpt: { type: "string" },
                    axis: { type: "string", enum: ["OD", "GM", "PC", "VE"] },
                    code: { type: "string", enum: ["O", "D", "G", "M", "P", "C", "V", "E"] },
                    sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
                    intensity: { type: "number", minimum: 0, maximum: 1 },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                    context: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    }),
  });

  const payload = (await response.json()) as {
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    usage?: { input_tokens?: number; output_tokens?: number };
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(payload.error?.message ?? "OpenAI analysis failed");
  const text = outputText(payload);
  if (!text) throw new Error("AI analysis returned no structured result");
  return { result: JSON.parse(text) as AiResult, usage: payload.usage };
}

export async function POST(request: NextRequest) {
  const { supabaseUrl, serviceKey, openaiKey, model } = config();
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  }

  let body: ProductRequestInput;
  try { body = (await request.json()) as ProductRequestInput; }
  catch { return NextResponse.json({ ok: false, message: "잘못된 요청입니다." }, { status: 400 }); }

  const inputValue = body.inputValue?.trim();
  if (!/^[0-9a-f-]{36}$/i.test(body.sessionId) || !inputValue || inputValue.length > 2000) {
    return NextResponse.json({ ok: false, message: "요청값을 확인해 주세요." }, { status: 400 });
  }
  if (body.inputType === "url") {
    try { const u = new URL(inputValue); if (!['http:', 'https:'].includes(u.protocol)) throw new Error(); }
    catch { return NextResponse.json({ ok: false, message: "공개 상품 링크를 입력해 주세요." }, { status: 400 }); }
  }

  const requestInsert = await supabase("product_analysis_requests", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ session_id: body.sessionId, input_type: body.inputType, input_value: inputValue, status: openaiKey ? "collecting_reviews" : "submitted" }),
  }, supabaseUrl, serviceKey);
  if (!requestInsert.ok) return NextResponse.json({ ok: false, code: "DATABASE_WRITE_FAILED" }, { status: 500 });
  const requestId = ((await requestInsert.json()) as Array<{ id: string }>)[0]?.id;

  if (!openaiKey) {
    return NextResponse.json({ ok: false, code: "OPENAI_NOT_CONFIGURED", requestId }, { status: 503 });
  }

  let productId: string | undefined;
  let runId: string | undefined;
  try {
    const productInsert = await supabase("products", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ canonical_name: body.inputType === "name" ? inputValue : null, product_url: body.inputType === "url" ? inputValue : null, verification_status: "unverified" }),
    }, supabaseUrl, serviceKey);
    if (!productInsert.ok) throw new Error("product insert failed");
    productId = ((await productInsert.json()) as Array<{ id: string }>)[0]?.id;

    const runInsert = await supabase("review_analysis_runs", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ product_id: productId, status: "running", provider: "openai", model_name: model, prompt_version: "layad-review-web-v1", analysis_version: "layad-fit-v1", started_at: new Date().toISOString() }),
    }, supabaseUrl, serviceKey);
    if (!runInsert.ok) throw new Error("analysis run insert failed");
    runId = ((await runInsert.json()) as Array<{ id: string }>)[0]?.id;

    await supabase(`product_analysis_requests?id=eq.${requestId}`, { method: "PATCH", body: JSON.stringify({ product_id: productId, analysis_run_id: runId, status: "analyzing" }) }, supabaseUrl, serviceKey);

    const { result, usage } = await analyzeWithOpenAI(body.inputType, inputValue, openaiKey, model);
    if (result.features.length < 2) throw new Error("분석 가능한 공개 근거가 부족합니다.");

    await supabase(`products?id=eq.${productId}`, { method: "PATCH", body: JSON.stringify({ canonical_name: result.product_name || inputValue, brand: result.brand || null, category: result.category || null, verification_status: result.verified ? "verified" : "unverified" }) }, supabaseUrl, serviceKey);

    const sourceRows = result.features.map((f) => ({ product_id: productId, source_type: "community", source_label: f.source_label, source_url: f.source_url }));
    const sourceInsert = await supabase("review_sources", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(sourceRows) }, supabaseUrl, serviceKey);
    if (!sourceInsert.ok) throw new Error("source insert failed");
    const sources = (await sourceInsert.json()) as Array<{ id: string }>;

    const reviewRows = result.features.map((f, i) => ({ product_id: productId, source_id: sources[i]?.id, review_text: f.excerpt || f.context, language_code: "und" }));
    const reviewInsert = await supabase("reviews", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(reviewRows) }, supabaseUrl, serviceKey);
    if (!reviewInsert.ok) throw new Error("review insert failed");
    const reviews = (await reviewInsert.json()) as Array<{ id: string }>;

    const evidences: ReviewFeatureEvidence[] = result.features.map((f, i) => ({
      reviewId: reviews[i]?.id ?? crypto.randomUUID(), productId: productId!, source: f.source_label,
      excerpt: f.excerpt, feature: f.context, axis: f.axis, code: f.code, sentiment: f.sentiment,
      intensity: f.intensity, confidence: f.confidence, analysisVersion: "layad-fit-v1", verified: result.verified,
    }));
    const product: Product = { id: productId, brand: result.brand, name: result.product_name, nameStatus: result.verified ? "verified" : "unverified", category: result.category || "화장품", productUrl: body.inputType === "url" ? inputValue : undefined };
    const fits = generateProductTypeFits(product, evidences);

    const featureRows = result.features.map((f, i) => ({ review_id: reviews[i]?.id, analysis_run_id: runId, axis: f.axis, code: f.code, feature_label: f.context.slice(0, 500), sentiment: f.sentiment, intensity: f.intensity, confidence: f.confidence, context_text: f.context, evidence_excerpt: f.excerpt, verified: result.verified }));
    await supabase("review_features", { method: "POST", body: JSON.stringify(featureRows) }, supabaseUrl, serviceKey);

    const fitRows = fits.map((fit) => ({ product_id: productId, beauty_code: fit.beautyCode, fit_score: fit.fitScore, review_count: fit.reviewEvidenceCount, confidence: Math.min(1, result.features.reduce((s, f) => s + f.confidence, 0) / result.features.length), analysis_version: "layad-fit-v1" }));
    await supabase("product_type_fits?on_conflict=product_id,beauty_code", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(fitRows) }, supabaseUrl, serviceKey);

    await supabase(`review_analysis_runs?id=eq.${runId}`, { method: "PATCH", body: JSON.stringify({ status: "completed", input_review_count: result.features.length, input_tokens: usage?.input_tokens ?? null, output_tokens: usage?.output_tokens ?? null, completed_at: new Date().toISOString() }) }, supabaseUrl, serviceKey);
    await supabase(`product_analysis_requests?id=eq.${requestId}`, { method: "PATCH", body: JSON.stringify({ status: "completed" }) }, supabaseUrl, serviceKey);

    return NextResponse.json({ ok: true, requestId, product: { name: result.product_name, brand: result.brand, category: result.category, summary: result.summary }, evidenceCount: result.features.length, fits: fits.map((f) => ({ beautyCode: f.beautyCode, fitScore: f.fitScore, confidenceLabel: f.confidenceLabel })) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "분석 처리 중 오류가 발생했습니다.";
    if (runId) await supabase(`review_analysis_runs?id=eq.${runId}`, { method: "PATCH", body: JSON.stringify({ status: "failed", error_message: message, completed_at: new Date().toISOString() }) }, supabaseUrl, serviceKey);
    if (requestId) await supabase(`product_analysis_requests?id=eq.${requestId}`, { method: "PATCH", body: JSON.stringify({ status: message.includes("근거가 부족") ? "insufficient_reviews" : "failed", error_message: message }) }, supabaseUrl, serviceKey);
    return NextResponse.json({ ok: false, code: "ANALYSIS_FAILED", requestId, message }, { status: 500 });
  }
}
