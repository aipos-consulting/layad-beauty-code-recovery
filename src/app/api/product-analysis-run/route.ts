import { NextRequest, NextResponse } from "next/server";
import { buildAxisProfiles, buildTypeFits, EvidenceForScoring } from "@/lib/product-intelligence/scoring";

const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";
const ANALYSIS_VERSION = "review-evidence-v1";
const PROMPT_VERSION = "review-web-search-v1";
const MIN_SOURCE_REVIEWS = 5;

type AnalysisRequest = { id: string; input_type: "name" | "url"; input_value: string; product_id: string | null; status: string };
type KeywordMaster = { canonical_keyword: string; language_code: string; synonyms: unknown; axis: string; code: string; default_weight: number };
type AIResult = {
  product: { canonicalName: string; brand: string | null; category: string | null; productUrl: string | null };
  reviews: Array<{
    sourceLabel: string;
    sourceUrl: string;
    languageCode: string;
    reviewText: string;
    features: Array<{
      keyword: string;
      axis: "OD" | "GM" | "PC" | "VE";
      code: "O" | "D" | "G" | "M" | "P" | "C" | "V" | "E";
      sentiment: "positive" | "negative" | "neutral" | "mixed";
      intensity: number;
      confidence: number;
      context: string;
      evidenceExcerpt: string;
    }>;
  }>;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
};

function config() {
  return {
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
    apiKey: process.env.OPENAI_API_KEY,
    adminKey: process.env.OPENAI_ADMIN_KEY,
    projectId: process.env.OPENAI_PROJECT_ID,
    model: process.env.OPENAI_MODEL ?? process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-5-mini",
  };
}

function headers(key: string, extra?: HeadersInit): HeadersInit {
  const base: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  if (!key.startsWith("sb_secret_")) base.Authorization = `Bearer ${key}`;
  return { ...base, ...(extra ?? {}) };
}

async function db(path: string, init: RequestInit, key: string) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: headers(key, init.headers), cache: "no-store" });
}

async function patchRequest(requestId: string, patch: Record<string, unknown>, key: string) {
  return db(`product_analysis_requests?id=eq.${requestId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  }, key);
}

function normalizeProductName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function parseOutputText(payload: OpenAIResponse) {
  if (payload.output_text) return payload.output_text;
  return payload.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("") ?? "";
}

async function checkCostGuard(key: string, adminKey: string | undefined, projectId: string | undefined) {
  const settingResponse = await db("ai_operation_settings?setting_key=eq.default&select=monthly_budget_usd&limit=1", { method: "GET" }, key);
  if (!settingResponse.ok) throw new Error("AI 운영 한도 설정을 읽지 못했습니다.");
  const settings = await settingResponse.json() as Array<{ monthly_budget_usd: number }>;
  const budget = Number(settings[0]?.monthly_budget_usd ?? 20);
  if (!adminKey || !projectId) return { allowed: false, spent: 0, budget, code: "COST_GUARD_NOT_CONFIGURED" };

  const now = new Date();
  const start = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);
  const params = new URLSearchParams({ start_time: String(start), end_time: String(Math.floor(Date.now() / 1000) + 1), bucket_width: "1d", limit: "31" });
  params.append("project_ids", projectId);
  const response = await fetch(`https://api.openai.com/v1/organization/costs?${params.toString()}`, {
    headers: { Authorization: `Bearer ${adminKey}`, "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return { allowed: false, spent: 0, budget, code: "COST_GUARD_CHECK_FAILED" };
  const payload = await response.json() as { data?: Array<{ results?: Array<{ amount?: { value?: number } }> }> };
  const spent = (payload.data ?? []).reduce((sum, bucket) => sum + (bucket.results ?? []).reduce((inner, row) => inner + Number(row.amount?.value ?? 0), 0), 0);
  return { allowed: spent < budget, spent, budget, code: spent >= budget ? "MONTHLY_BUDGET_REACHED" : undefined };
}

async function findOrCreateProduct(row: AnalysisRequest, key: string) {
  const lookup = row.input_type === "url"
    ? `products?product_url=eq.${encodeURIComponent(row.input_value)}&select=id&limit=1`
    : `products?normalized_name=eq.${encodeURIComponent(normalizeProductName(row.input_value))}&select=id&limit=1`;
  const lookupResponse = await db(lookup, { method: "GET" }, key);
  if (lookupResponse.ok) {
    const existing = await lookupResponse.json() as Array<{ id: string }>;
    if (existing[0]?.id) return existing[0].id;
  }

  const insertResponse = await db("products", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row.input_type === "url"
      ? { product_url: row.input_value, verification_status: "unverified" }
      : { canonical_name: row.input_value, normalized_name: normalizeProductName(row.input_value), verification_status: "unverified" }),
  }, key);
  if (!insertResponse.ok) throw new Error(`상품 생성 실패: ${await insertResponse.text()}`);
  const inserted = await insertResponse.json() as Array<{ id: string }>;
  if (!inserted[0]?.id) throw new Error("상품 ID를 생성하지 못했습니다.");
  return inserted[0].id;
}

async function loadKeywordMaster(key: string) {
  const response = await db("review_keyword_master?active=eq.true&verification_status=eq.approved&select=canonical_keyword,language_code,synonyms,axis,code,default_weight&limit=200", { method: "GET" }, key);
  if (!response.ok) throw new Error(`키워드 마스터 조회 실패: ${await response.text()}`);
  return await response.json() as KeywordMaster[];
}

async function createRun(productId: string, model: string, key: string) {
  const response = await db("review_analysis_runs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ product_id: productId, status: "running", provider: "openai", model_name: model, prompt_version: PROMPT_VERSION, analysis_version: ANALYSIS_VERSION, started_at: new Date().toISOString() }),
  }, key);
  if (!response.ok) throw new Error(`분석 실행 기록 생성 실패: ${await response.text()}`);
  const rows = await response.json() as Array<{ id: string }>;
  if (!rows[0]?.id) throw new Error("분석 실행 ID를 생성하지 못했습니다.");
  return rows[0].id;
}

async function callOpenAI(inputValue: string, inputType: string, keywords: KeywordMaster[], apiKey: string, model: string) {
  const keywordGuide = keywords.slice(0, 120).map((item) => ({ keyword: item.canonical_keyword, language: item.language_code, axis: item.axis, code: item.code, weight: item.default_weight }));
  const prompt = `You are the evidence extraction layer for LAYAD BEAUTY CODE.\n\nProduct input: ${inputValue}\nInput type: ${inputType}\n\nUse web search to find PUBLIC, source-backed consumer review evidence for this exact cosmetic product. Prefer commerce review pages and beauty communities. Do not use manufacturer marketing claims as consumer review evidence. Do not invent a review, source, URL, product fact, or quote. If the exact product cannot be verified, return no reviews.\n\nCollect up to 20 distinct review evidence items. Each item must have a real source URL found during web search. reviewText must be a concise paraphrase of the relevant consumer review evidence, not a long quotation. evidenceExcerpt must be a very short evidence phrase. Extract only features supported by that review and map them to the official axes: OD, GM, PC, VE. P=Precise, C=Convenient, V=Variable, E=Even.\n\nApproved LAYAD keyword master entries, when available, should be preferred over inventing a new keyword:\n${JSON.stringify(keywordGuide)}\n\nFor expressions not covered by the master, provide the natural keyword you observed so LAYAD can accumulate it as a candidate. Confidence must reflect evidence certainty. Return fewer reviews rather than fabricating evidence.`;

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      product: {
        type: "object", additionalProperties: false,
        properties: {
          canonicalName: { type: "string" },
          brand: { type: ["string", "null"] },
          category: { type: ["string", "null"] },
          productUrl: { type: ["string", "null"] },
        },
        required: ["canonicalName", "brand", "category", "productUrl"],
      },
      reviews: {
        type: "array", maxItems: 20,
        items: {
          type: "object", additionalProperties: false,
          properties: {
            sourceLabel: { type: "string" }, sourceUrl: { type: "string" }, languageCode: { type: "string" }, reviewText: { type: "string" },
            features: {
              type: "array", maxItems: 8,
              items: {
                type: "object", additionalProperties: false,
                properties: {
                  keyword: { type: "string" }, axis: { type: "string", enum: ["OD", "GM", "PC", "VE"] },
                  code: { type: "string", enum: ["O", "D", "G", "M", "P", "C", "V", "E"] },
                  sentiment: { type: "string", enum: ["positive", "negative", "neutral", "mixed"] },
                  intensity: { type: "number", minimum: 0, maximum: 1 }, confidence: { type: "number", minimum: 0, maximum: 1 },
                  context: { type: "string" }, evidenceExcerpt: { type: "string" },
                },
                required: ["keyword", "axis", "code", "sentiment", "intensity", "confidence", "context", "evidenceExcerpt"],
              },
            },
          },
          required: ["sourceLabel", "sourceUrl", "languageCode", "reviewText", "features"],
        },
      },
    },
    required: ["product", "reviews"],
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, store: false, tools: [{ type: "web_search" }], input: prompt, text: { format: { type: "json_schema", name: "layad_review_evidence", strict: true, schema } } }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`OpenAI 분석 실패 (${response.status}): ${await response.text()}`);
  const payload = await response.json() as OpenAIResponse;
  const text = parseOutputText(payload);
  if (!text) throw new Error("OpenAI 분석 결과가 비어 있습니다.");
  return { parsed: JSON.parse(text) as AIResult, usage: payload.usage };
}

async function updateProduct(productId: string, row: AnalysisRequest, product: AIResult["product"], key: string) {
  const body = {
    canonical_name: product.canonicalName || (row.input_type === "name" ? row.input_value : null),
    normalized_name: product.canonicalName ? normalizeProductName(product.canonicalName) : null,
    brand: product.brand,
    category: product.category,
    product_url: row.input_type === "url" ? row.input_value : product.productUrl,
    verification_status: row.input_type === "url" ? "link_verified" : "name_verified",
  };
  const response = await db(`products?id=eq.${productId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(body) }, key);
  if (!response.ok) throw new Error(`상품 정보 갱신 실패: ${await response.text()}`);
}

async function persistEvidence(productId: string, runId: string, requestId: string, result: AIResult, key: string) {
  const sourceMap = new Map<string, { sourceLabel: string; languageCode: string }>();
  for (const review of result.reviews) if (review.sourceUrl) sourceMap.set(review.sourceUrl, { sourceLabel: review.sourceLabel, languageCode: review.languageCode });

  const sourceRows = Array.from(sourceMap.entries()).map(([sourceUrl, value]) => ({ product_id: productId, source_type: "commerce", source_label: value.sourceLabel, source_url: sourceUrl, country_code: null }));
  const sourceResponse = await db("review_sources?select=id,source_url", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(sourceRows) }, key);
  if (!sourceResponse.ok) throw new Error(`리뷰 출처 저장 실패: ${await sourceResponse.text()}`);
  const insertedSources = await sourceResponse.json() as Array<{ id: string; source_url: string }>;
  const sourceIdByUrl = new Map(insertedSources.map((row) => [row.source_url, row.id]));

  const reviewRows = result.reviews.map((review, index) => ({
    product_id: productId,
    source_id: sourceIdByUrl.get(review.sourceUrl) ?? null,
    external_review_key: `openai-web:${requestId}:${index}`,
    review_text: review.reviewText.slice(0, 20000),
    language_code: review.languageCode.slice(0, 12),
  }));
  const reviewResponse = await db("reviews?select=id,external_review_key", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(reviewRows) }, key);
  if (!reviewResponse.ok) throw new Error(`리뷰 Evidence 저장 실패: ${await reviewResponse.text()}`);
  const insertedReviews = await reviewResponse.json() as Array<{ id: string; external_review_key: string }>;
  const reviewIdByKey = new Map(insertedReviews.map((row) => [row.external_review_key, row.id]));

  const featureRows: Array<Record<string, unknown>> = [];
  const scoringEvidence: EvidenceForScoring[] = [];
  result.reviews.forEach((review, reviewIndex) => {
    const reviewKey = `openai-web:${requestId}:${reviewIndex}`;
    const reviewId = reviewIdByKey.get(reviewKey);
    if (!reviewId) return;
    review.features.forEach((feature) => {
      featureRows.push({
        review_id: reviewId, analysis_run_id: runId, axis: feature.axis, code: feature.code,
        feature_label: feature.keyword.slice(0, 200), sentiment: feature.sentiment,
        intensity: Math.min(1, Math.max(0, feature.intensity)), confidence: Math.min(1, Math.max(0, feature.confidence)),
        context_text: feature.context.slice(0, 1000), evidence_excerpt: feature.evidenceExcerpt.slice(0, 500),
        condition_tags: {}, verified: false,
      });
      scoringEvidence.push({ reviewKey, axis: feature.axis, code: feature.code, sentiment: feature.sentiment, intensity: feature.intensity, confidence: feature.confidence, verified: false });
    });
  });

  if (featureRows.length === 0) throw new Error("리뷰에서 적합도 Evidence를 추출하지 못했습니다.");
  const featureResponse = await db("review_features", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(featureRows) }, key);
  if (!featureResponse.ok) throw new Error(`Review Feature 저장 실패: ${await featureResponse.text()}`);
  return scoringEvidence;
}

async function recordKeywordCandidates(productId: string, result: AIResult, masters: KeywordMaster[], key: string) {
  const known = new Set<string>();
  for (const master of masters) {
    known.add(`${master.language_code}:${normalizeProductName(master.canonical_keyword)}`);
    if (Array.isArray(master.synonyms)) for (const synonym of master.synonyms) if (typeof synonym === "string") known.add(`${master.language_code}:${normalizeProductName(synonym)}`);
  }

  const grouped = new Map<string, { keyword: string; language: string; axis: string; code: string; weight: number; confidence: number; count: number; context: string }>();
  for (const review of result.reviews) {
    for (const feature of review.features) {
      if (!feature.keyword.trim() || known.has(`${review.languageCode}:${normalizeProductName(feature.keyword)}`)) continue;
      const identity = `${review.languageCode}|${normalizeProductName(feature.keyword)}|${feature.axis}|${feature.code}`;
      const current = grouped.get(identity);
      if (current) {
        current.count += 1;
        current.confidence = Math.max(current.confidence, feature.confidence);
      } else grouped.set(identity, { keyword: feature.keyword.trim(), language: review.languageCode, axis: feature.axis, code: feature.code, weight: feature.intensity, confidence: feature.confidence, count: 1, context: feature.context });
    }
  }

  await Promise.all(Array.from(grouped.values()).map(async (candidate) => {
    const query = `review_keyword_candidates?candidate_keyword=eq.${encodeURIComponent(candidate.keyword)}&language_code=eq.${encodeURIComponent(candidate.language)}&suggested_axis=eq.${candidate.axis}&suggested_code=eq.${candidate.code}&status=eq.pending&select=id,occurrence_count&limit=1`;
    const existingResponse = await db(query, { method: "GET" }, key);
    if (!existingResponse.ok) return;
    const existing = await existingResponse.json() as Array<{ id: number; occurrence_count: number }>;
    if (existing[0]) {
      await db(`review_keyword_candidates?id=eq.${existing[0].id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ occurrence_count: existing[0].occurrence_count + candidate.count, last_product_id: productId, ai_confidence: candidate.confidence, sample_context: candidate.context.slice(0, 1000) }),
      }, key);
    } else {
      await db("review_keyword_candidates", {
        method: "POST", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ candidate_keyword: candidate.keyword, language_code: candidate.language, suggested_axis: candidate.axis, suggested_code: candidate.code, suggested_weight: candidate.weight, ai_confidence: candidate.confidence, occurrence_count: candidate.count, first_product_id: productId, last_product_id: productId, sample_context: candidate.context.slice(0, 1000) }),
      }, key);
    }
  }));
}

async function persistScores(productId: string, evidences: EvidenceForScoring[], key: string) {
  const profiles = buildAxisProfiles(evidences);
  const fits = buildTypeFits(evidences, profiles);
  const profileRows = profiles.map((profile) => ({ product_id: productId, axis: profile.axis, first_code: profile.firstCode, first_score: profile.firstScore, second_code: profile.secondCode, second_score: profile.secondScore, review_count: profile.reviewCount, confidence: profile.confidence, analysis_version: ANALYSIS_VERSION, updated_at: new Date().toISOString() }));
  const fitRows = fits.map((fit) => ({ product_id: productId, beauty_code: fit.beautyCode, fit_score: fit.fitScore, review_count: fit.reviewCount, confidence: fit.confidence, analysis_version: ANALYSIS_VERSION, updated_at: new Date().toISOString() }));

  const [profileResponse, fitResponse] = await Promise.all([
    db("product_axis_profiles?on_conflict=product_id,axis", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(profileRows) }, key),
    db("product_type_fits?on_conflict=product_id,beauty_code", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(fitRows) }, key),
  ]);
  if (!profileResponse.ok) throw new Error(`상품 축 프로필 저장 실패: ${await profileResponse.text()}`);
  if (!fitResponse.ok) throw new Error(`16유형 적합도 저장 실패: ${await fitResponse.text()}`);
}

export async function POST(request: NextRequest) {
  const { serviceKey, apiKey, adminKey, projectId, model } = config();
  if (!serviceKey) return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  if (!apiKey) return NextResponse.json({ ok: false, code: "AI_NOT_CONFIGURED", message: "OpenAI 자동 분석 설정이 연결되지 않았습니다." }, { status: 503 });

  let body: { requestId?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, message: "잘못된 요청입니다." }, { status: 400 }); }
  if (!body.requestId || !/^[0-9a-f-]{36}$/i.test(body.requestId)) return NextResponse.json({ ok: false, message: "분석 요청 ID를 확인해 주세요." }, { status: 400 });

  let runId = "";
  try {
    const requestResponse = await db(`product_analysis_requests?id=eq.${body.requestId}&select=id,input_type,input_value,product_id,status&limit=1`, { method: "GET" }, serviceKey);
    if (!requestResponse.ok) throw new Error(`분석 요청 조회 실패: ${await requestResponse.text()}`);
    const rows = await requestResponse.json() as AnalysisRequest[];
    const row = rows[0];
    if (!row) return NextResponse.json({ ok: false, message: "상품 분석 요청을 찾을 수 없습니다." }, { status: 404 });
    if (row.status === "completed") return NextResponse.json({ ok: true, status: "completed", reused: true });
    if (!["submitted", "collecting_reviews"].includes(row.status)) return NextResponse.json({ ok: false, message: `현재 상태(${row.status})에서는 자동 분석을 시작할 수 없습니다.` }, { status: 409 });

    const guard = await checkCostGuard(serviceKey, adminKey, projectId);
    if (!guard.allowed) {
      const message = guard.code === "MONTHLY_BUDGET_REACHED"
        ? `월 AI 운영 한도 $${guard.budget.toFixed(2)}에 도달하여 자동 분석을 차단했습니다.`
        : "AI 비용 한도를 검증할 수 없어 자동 분석을 안전 차단했습니다.";
      await patchRequest(row.id, { status: "failed", error_message: message }, serviceKey);
      return NextResponse.json({ ok: false, code: guard.code, message, spent: guard.spent, budget: guard.budget }, { status: 429 });
    }

    const productId = row.product_id ?? await findOrCreateProduct(row, serviceKey);
    const masters = await loadKeywordMaster(serviceKey);
    runId = await createRun(productId, model, serviceKey);
    await patchRequest(row.id, { status: "collecting_reviews", product_id: productId, analysis_run_id: runId, error_message: null }, serviceKey);

    const { parsed, usage } = await callOpenAI(row.input_value, row.input_type, masters, apiKey, model);
    const validReviews = parsed.reviews.filter((review) => /^https?:\/\//i.test(review.sourceUrl) && review.reviewText.trim() && review.features.length > 0);
    parsed.reviews = validReviews;
    if (validReviews.length < MIN_SOURCE_REVIEWS) {
      const message = `출처가 확인되는 공개 리뷰가 ${validReviews.length}건으로, 최소 ${MIN_SOURCE_REVIEWS}건 기준에 미달했습니다.`;
      await Promise.all([
        patchRequest(row.id, { status: "insufficient_reviews", product_id: productId, analysis_run_id: runId, error_message: message }, serviceKey),
        db(`review_analysis_runs?id=eq.${runId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "completed", input_review_count: validReviews.length, input_tokens: usage?.input_tokens ?? null, output_tokens: usage?.output_tokens ?? null, completed_at: new Date().toISOString(), error_message: message }) }, serviceKey),
      ]);
      return NextResponse.json({ ok: false, code: "INSUFFICIENT_REVIEWS", message }, { status: 422 });
    }

    await patchRequest(row.id, { status: "analyzing" }, serviceKey);
    await updateProduct(productId, row, parsed.product, serviceKey);
    const scoringEvidence = await persistEvidence(productId, runId, row.id, parsed, serviceKey);
    await persistScores(productId, scoringEvidence, serviceKey);
    await recordKeywordCandidates(productId, parsed, masters, serviceKey);

    await Promise.all([
      db(`review_analysis_runs?id=eq.${runId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "completed", input_review_count: validReviews.length, input_tokens: usage?.input_tokens ?? null, output_tokens: usage?.output_tokens ?? null, completed_at: new Date().toISOString(), error_message: null }) }, serviceKey),
      patchRequest(row.id, { status: "completed", product_id: productId, analysis_run_id: runId, error_message: null }, serviceKey),
    ]);

    return NextResponse.json({ ok: true, requestId: row.id, productId, analysisRunId: runId, status: "completed", reviewCount: validReviews.length, inputTokens: usage?.input_tokens ?? null, outputTokens: usage?.output_tokens ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "상품 자동 분석 중 오류가 발생했습니다.";
    if (runId) await db(`review_analysis_runs?id=eq.${runId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "failed", completed_at: new Date().toISOString(), error_message: message }) }, serviceKey).catch(() => undefined);
    if (body.requestId) await patchRequest(body.requestId, { status: "failed", error_message: message }, serviceKey).catch(() => undefined);
    return NextResponse.json({ ok: false, code: "AUTO_ANALYSIS_FAILED", message }, { status: 500 });
  }
}
