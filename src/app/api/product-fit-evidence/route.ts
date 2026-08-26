import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 15;

const MODEL = "gpt-5.4-nano";
const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";

type EvidenceItem = {
  source_name?: string;
  source_url?: string;
  excerpt?: string;
  keywords?: string[];
  related_axes?: string[];
};

type EvidencePayload = { evidence?: EvidenceItem[] };
type CleanEvidence = {
  sourceName: string;
  sourceUrl: string;
  excerpt: string;
  keywords: string[];
  relatedAxes: string[];
};

function dbHeaders(key: string, extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
  return { ...headers, ...(extra ?? {}) };
}

async function db(path: string, init: RequestInit, key: string) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: dbHeaders(key, init.headers),
    cache: "no-store",
  });
}

function outputText(payload: unknown) {
  const data = payload as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  return "";
}

function parseJson(text: string): EvidencePayload {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return {};
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as EvidencePayload;
  } catch {
    return {};
  }
}

function cleanUrl(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function cleanEvidence(payload: EvidencePayload): CleanEvidence[] {
  return (payload.evidence ?? [])
    .slice(0, 3)
    .map((item) => ({
      sourceName: String(item.source_name ?? "공개 웹 출처").trim().slice(0, 80),
      sourceUrl: cleanUrl(item.source_url),
      excerpt: String(item.excerpt ?? "").trim().slice(0, 220),
      keywords: Array.isArray(item.keywords) ? item.keywords.map(String).map((v) => v.trim()).filter(Boolean).slice(0, 4) : [],
      relatedAxes: Array.isArray(item.related_axes)
        ? item.related_axes.map(String).map((v) => v.trim().toUpperCase()).filter((v) => /^(OD|GM|PC|VE|O|D|G|M|P|C|V|E)$/.test(v)).slice(0, 4)
        : [],
    }))
    .filter((item) => item.excerpt && item.sourceUrl);
}

async function resolveProductId(key: string, requestId: string, productName: string) {
  if (requestId) {
    const response = await db(`product_analysis_requests?id=eq.${encodeURIComponent(requestId)}&select=product_id&limit=1`, { method: "GET" }, key);
    if (response.ok) {
      const rows = await response.json() as Array<{ product_id?: string | null }>;
      if (rows[0]?.product_id) return rows[0].product_id;
    }
  }

  const normalized = productName.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  const response = await db(`products?normalized_name=eq.${encodeURIComponent(normalized)}&deleted_at=is.null&select=id&limit=1`, { method: "GET" }, key);
  if (!response.ok) return "";
  const rows = await response.json() as Array<{ id?: string }>;
  return rows[0]?.id ?? "";
}

async function readCached(key: string, productId: string): Promise<CleanEvidence[]> {
  if (!productId) return [];
  const response = await db(
    `product_fit_evidence?product_id=eq.${encodeURIComponent(productId)}&select=evidence_rank,source_name,source_url,excerpt,keywords,related_axes&order=evidence_rank.asc`,
    { method: "GET" },
    key,
  );
  if (!response.ok) return [];
  const rows = await response.json() as Array<{
    source_name: string;
    source_url: string;
    excerpt: string;
    keywords?: string[];
    related_axes?: string[];
  }>;
  return rows.map((row) => ({
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    excerpt: row.excerpt,
    keywords: Array.isArray(row.keywords) ? row.keywords : [],
    relatedAxes: Array.isArray(row.related_axes) ? row.related_axes : [],
  })).slice(0, 3);
}

async function saveCached(key: string, productId: string, evidence: CleanEvidence[]) {
  if (!productId || !evidence.length) return;
  const rows = evidence.map((item, index) => ({
    product_id: productId,
    evidence_rank: index + 1,
    source_name: item.sourceName,
    source_url: item.sourceUrl,
    excerpt: item.excerpt,
    keywords: item.keywords,
    related_axes: item.relatedAxes,
    fetched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  await db("product_fit_evidence?on_conflict=product_id,evidence_rank", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  }, key);
}

export async function POST(request: NextRequest) {
  const openai = process.env.OPENAI_API_KEY;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!openai || !key) return NextResponse.json({ ok: false, message: "AI 분석 설정을 확인해 주세요." }, { status: 503 });

  try {
    const body = await request.json() as { productName?: string; beautyCode?: string; requestId?: string };
    const productName = body.productName?.trim() ?? "";
    const beautyCode = body.beautyCode?.trim().toUpperCase() ?? "";
    const requestId = body.requestId?.trim() ?? "";
    if (!productName || productName.length > 500) {
      return NextResponse.json({ ok: false, message: "상품명을 확인해 주세요." }, { status: 400 });
    }

    const productId = await resolveProductId(key, requestId, productName);
    const cached = await readCached(key, productId);
    if (cached.length) {
      return NextResponse.json({ ok: true, cached: true, evidence: cached });
    }

    const prompt = `당신은 LAYAD Beauty Code의 공개 근거 검증 담당자입니다.\n\n상품: ${productName}\n사용자 Beauty Code: ${beautyCode || "미지정"}\n\n웹 검색을 사용하여 이 상품의 적합도 판단에 도움이 되는 실제 사용자 리뷰 또는 신뢰할 수 있는 공개 사용후기/제품 설명 중 관련성이 높은 근거를 최대 3건 선정하세요.\n\n선정 기준:\n1. 상품명이 정확히 일치하거나 동일 제품임이 명확한 출처를 우선합니다.\n2. O/D, G/M, P/C, V/E 판단에 직접 도움이 되는 구체적 사용 경험을 우선합니다.\n3. 단순 판매 문구보다 실제 사용후기와 구체적인 제품 특성 설명을 우선합니다.\n4. 같은 사이트의 사실상 중복 내용은 하나만 선택합니다.\n5. source_url은 검색에서 실제 확인한 공개 URL만 기록하고 URL을 추정하거나 만들어내지 마세요.\n6. excerpt는 해당 출처 내용을 그대로 길게 복사하지 말고, 핵심 의미를 한국어로 1문장 요약하세요. 80자 이내로 작성하세요.\n7. keywords는 핵심 키워드 최대 4개, related_axes는 관련 축 또는 코드 최대 4개로 기록하세요.\n8. 확인 가능한 근거가 3개 미만이면 실제 확인한 수만 반환하세요.\n\nJSON만 반환하세요. 형식:\n{\n  "evidence": [\n    {\n      "source_name": "출처명",\n      "source_url": "https://...",\n      "excerpt": "핵심 내용 요약",\n      "keywords": ["키워드"],\n      "related_axes": ["OD", "GM"]\n    }\n  ]\n}`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openai}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        input: prompt,
        tools: [{ type: "web_search" }],
        max_output_tokens: 900,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(9000),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error("근거 검색에 실패했습니다.");

    const evidence = cleanEvidence(parseJson(outputText(payload)));
    await saveCached(key, productId, evidence);
    return NextResponse.json({ ok: true, cached: false, evidence });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || /timeout/i.test(error.message));
    return NextResponse.json(
      { ok: false, message: timeout ? "주요 분석 근거를 불러오는 데 시간이 걸리고 있습니다." : "주요 분석 근거를 불러오지 못했습니다." },
      { status: timeout ? 504 : 500 },
    );
  }
}
