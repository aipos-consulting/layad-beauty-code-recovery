import { NextRequest, NextResponse } from "next/server";

type Entity = "requests" | "products" | "sessions" | "audit";
type Action = "hard-delete" | "update-row";

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
  if (!response.ok) throw new Error(`변경 이력 저장 실패: ${await response.text()}`);
}

const tableByEntity = {
  requests: "product_analysis_requests",
  products: "products",
  sessions: "test_sessions",
} as const;

const editableFields: Record<Exclude<Entity, "audit">, string[]> = {
  requests: ["input_type", "input_value", "status", "product_id"],
  products: ["canonical_name", "brand", "category"],
  sessions: ["beauty_code", "beauty_code_source", "country_code", "gender", "age_band", "completed", "excluded_from_statistics"],
};

export async function GET(request: NextRequest) {
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });

  const entity = (request.nextUrl.searchParams.get("entity") ?? "requests") as Entity;
  const search = (request.nextUrl.searchParams.get("search") ?? "").trim().toLowerCase();

  try {
    const pathByEntity: Record<Entity, string> = {
      requests: "product_analysis_requests?select=*&order=created_at.desc&limit=500",
      products: "products?select=*&order=created_at.desc&limit=500",
      sessions: "test_sessions?select=*&order=created_at.desc&limit=500",
      audit: "admin_data_audit_logs?select=*&order=created_at.desc&limit=500",
    };
    const rows = await readJson(await db(url, key, pathByEntity[entity])) as Array<Record<string, unknown>>;
    const filtered = !search ? rows : rows.filter(row => JSON.stringify(row).toLowerCase().includes(search));
    return NextResponse.json({ ok: true, entity, rows: filtered });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "조회 실패" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });

  let body: { entity: Exclude<Entity, "audit">; id: string; action: Action; values?: Record<string, unknown> };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, message: "잘못된 요청입니다." }, { status: 400 }); }

  if (!body.id) return NextResponse.json({ ok: false, message: "대상을 선택해 주세요." }, { status: 400 });
  const table = tableByEntity[body.entity];
  if (!table) return NextResponse.json({ ok: false, message: "지원하지 않는 데이터입니다." }, { status: 400 });

  try {
    const beforeRows = await readJson(await db(url, key, `${table}?id=eq.${encodeURIComponent(body.id)}&select=*&limit=1`)) as Array<Record<string, unknown>>;
    const before = beforeRows[0];
    if (!before) return NextResponse.json({ ok: false, message: "대상을 찾지 못했습니다." }, { status: 404 });

    if (body.action === "hard-delete") {
      const deletion = await db(url, key, `${table}?id=eq.${encodeURIComponent(body.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      if (!deletion.ok) throw new Error(await deletion.text());
      await audit(url, key, { entity_type: body.entity, entity_id: body.id, action: "hard-delete", before_data: before, after_data: null, reason: "관리자 직접 삭제", actor_label: "admin" });
      return NextResponse.json({ ok: true });
    }

    const allowed = new Set(editableFields[body.entity]);
    const patch = Object.fromEntries(Object.entries(body.values ?? {}).filter(([key]) => allowed.has(key)));
    if (!Object.keys(patch).length) return NextResponse.json({ ok: false, message: "수정할 항목이 없습니다." }, { status: 400 });

    const update = await db(url, key, `${table}?id=eq.${encodeURIComponent(body.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    });
    const afterRows = await readJson(update) as Array<Record<string, unknown>>;
    const after = afterRows[0] ?? { ...before, ...patch };
    await audit(url, key, { entity_type: body.entity, entity_id: body.id, action: "update-row", before_data: before, after_data: after, reason: "관리자 상세 수정", actor_label: "admin" });
    return NextResponse.json({ ok: true, row: after });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "처리 실패" }, { status: 500 });
  }
}
