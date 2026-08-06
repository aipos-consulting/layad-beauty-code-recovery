import { NextRequest, NextResponse } from "next/server";

type Entity = "requests" | "products" | "sessions" | "audit";
type Action = "soft-delete" | "restore" | "status" | "update-product" | "exclude-session";

function config() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  };
}

async function db(url: string, key: string, path: string, init: RequestInit = {}) {
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

async function readJson(response: Response) {
  const text = await response.text();
  if (!response.ok) throw new Error(text || `DB ${response.status}`);
  return text ? JSON.parse(text) : null;
}

async function audit(url: string, key: string, payload: Record<string, unknown>) {
  const response = await db(url, key, "admin_data_audit_logs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`감사 이력 저장 실패: ${await response.text()}`);
}

export async function GET(request: NextRequest) {
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });

  const entity = (request.nextUrl.searchParams.get("entity") ?? "requests") as Entity;
  const search = (request.nextUrl.searchParams.get("search") ?? "").trim().toLowerCase();
  const includeDeleted = request.nextUrl.searchParams.get("includeDeleted") === "true";

  try {
    const pathByEntity: Record<Entity, string> = {
      requests: "product_analysis_requests?select=id,session_id,input_type,input_value,status,product_id,created_at,deleted_at,deleted_reason&order=created_at.desc&limit=500",
      products: "products?select=id,canonical_name,brand,category,created_at,deleted_at,deleted_reason&order=created_at.desc&limit=500",
      sessions: "test_sessions?select=id,beauty_code,beauty_code_source,country_code,gender,age_band,completed,created_at,excluded_from_statistics,deleted_at,deleted_reason&order=created_at.desc&limit=500",
      audit: "admin_data_audit_logs?select=id,entity_type,entity_id,action,reason,actor_label,created_at&order=created_at.desc&limit=500",
    };

    const rows = await readJson(await db(url, key, pathByEntity[entity])) as Array<Record<string, unknown>>;
    const filtered = rows.filter(row => {
      if (!includeDeleted && entity !== "audit" && row.deleted_at) return false;
      if (!search) return true;
      return JSON.stringify(row).toLowerCase().includes(search);
    });

    return NextResponse.json({ ok: true, entity, rows: filtered });
  } catch (error) {
    return NextResponse.json({ ok: false, code: "OPERATIONAL_DATA_READ_FAILED", message: error instanceof Error ? error.message : "조회 실패" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });

  let body: { entity: Exclude<Entity, "audit">; id: string; action: Action; reason: string; values?: Record<string, unknown> };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, message: "잘못된 요청입니다." }, { status: 400 }); }

  if (!body.id || !body.reason?.trim()) {
    return NextResponse.json({ ok: false, message: "대상과 변경 사유를 입력해 주세요." }, { status: 400 });
  }

  const tableByEntity = { requests: "product_analysis_requests", products: "products", sessions: "test_sessions" } as const;
  const table = tableByEntity[body.entity];
  if (!table) return NextResponse.json({ ok: false, message: "지원하지 않는 데이터 구분입니다." }, { status: 400 });

  try {
    const beforeRows = await readJson(await db(url, key, `${table}?id=eq.${encodeURIComponent(body.id)}&select=*&limit=1`)) as Array<Record<string, unknown>>;
    const before = beforeRows[0];
    if (!before) return NextResponse.json({ ok: false, message: "대상을 찾지 못했습니다." }, { status: 404 });

    let patch: Record<string, unknown> = {};
    if (body.action === "soft-delete") patch = { deleted_at: new Date().toISOString(), deleted_reason: body.reason.trim() };
    if (body.action === "restore") patch = { deleted_at: null, deleted_reason: null };
    if (body.action === "status" && body.entity === "requests") patch = { status: String(body.values?.status ?? "submitted") };
    if (body.action === "update-product" && body.entity === "products") {
      patch = {
        canonical_name: String(body.values?.canonical_name ?? before.canonical_name ?? "").trim(),
        brand: String(body.values?.brand ?? before.brand ?? "").trim() || null,
        category: String(body.values?.category ?? before.category ?? "").trim() || null,
      };
    }
    if (body.action === "exclude-session" && body.entity === "sessions") {
      patch = { excluded_from_statistics: Boolean(body.values?.excluded) };
    }
    if (!Object.keys(patch).length) return NextResponse.json({ ok: false, message: "허용되지 않은 작업입니다." }, { status: 400 });

    const update = await db(url, key, `${table}?id=eq.${encodeURIComponent(body.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    });
    const afterRows = await readJson(update) as Array<Record<string, unknown>>;
    const after = afterRows[0] ?? { ...before, ...patch };

    await audit(url, key, {
      entity_type: body.entity,
      entity_id: body.id,
      action: body.action,
      before_data: before,
      after_data: after,
      reason: body.reason.trim(),
      actor_label: "admin",
    });

    return NextResponse.json({ ok: true, row: after });
  } catch (error) {
    return NextResponse.json({ ok: false, code: "OPERATIONAL_DATA_WRITE_FAILED", message: error instanceof Error ? error.message : "처리 실패" }, { status: 500 });
  }
}
