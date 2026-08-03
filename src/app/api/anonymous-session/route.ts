import { NextRequest, NextResponse } from "next/server";

type AnswerInput = {
  questionId: number;
  selectedCode: string;
};

type SessionInput = {
  clientSessionId?: string;
  ageBand?: string | null;
  beautyCode: string;
  beautyCodeSource: "test" | "manual";
  answers?: AnswerInput[];
};

const validBeautyCode = /^[OD][GM][PC][VE]$/;
const validAnswerCode = /^[ODGMPCVE]$/;
const validAgeBands = new Set([
  "14-19",
  "20-29",
  "30-39",
  "40-49",
  "50-59",
  "60+",
  "prefer_not_to_say",
]);

function detectDevice(userAgent: string) {
  if (/ipad|tablet/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|android/i.test(userAgent)) return "mobile";
  if (userAgent) return "desktop";
  return "unknown";
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serverKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY;

  const missing: string[] = [];
  if (!url) missing.push("SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_URL");
  if (!serverKey) missing.push("SUPABASE_SERVICE_ROLE_KEY 또는 SUPABASE_SECRET_KEY");

  return { url, serverKey, missing };
}

async function supabaseInsert<T>(
  url: string,
  serverKey: string,
  table: string,
  payload: unknown,
  returnRepresentation = true,
): Promise<T> {
  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: serverKey,
      Authorization: `Bearer ${serverKey}`,
      "Content-Type": "application/json",
      Prefer: returnRepresentation ? "return=representation" : "return=minimal",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase ${table} insert failed: ${response.status} ${detail}`);
  }

  if (!returnRepresentation) return undefined as T;
  return (await response.json()) as T;
}

export async function POST(request: NextRequest) {
  const { url, serverKey, missing } = getSupabaseConfig();
  if (!url || !serverKey) {
    return NextResponse.json(
      { ok: false, code: "SUPABASE_NOT_CONFIGURED", missing },
      { status: 503 },
    );
  }

  let body: SessionInput;
  try {
    body = (await request.json()) as SessionInput;
  } catch {
    return NextResponse.json({ ok: false, message: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!validBeautyCode.test(body.beautyCode)) {
    return NextResponse.json({ ok: false, message: "Beauty Code가 올바르지 않습니다." }, { status: 400 });
  }

  if (body.beautyCodeSource !== "test" && body.beautyCodeSource !== "manual") {
    return NextResponse.json({ ok: false, message: "Beauty Code 출처가 올바르지 않습니다." }, { status: 400 });
  }

  if (body.ageBand && !validAgeBands.has(body.ageBand)) {
    return NextResponse.json({ ok: false, message: "연령대 값이 올바르지 않습니다." }, { status: 400 });
  }

  const answers = Array.isArray(body.answers) ? body.answers : [];
  const normalizedAnswers = answers
    .filter(
      (answer) =>
        Number.isInteger(answer.questionId) &&
        answer.questionId >= 1 &&
        answer.questionId <= 20 &&
        validAnswerCode.test(answer.selectedCode),
    )
    .map((answer) => ({
      question_id: answer.questionId,
      selected_code: answer.selectedCode,
    }));

  const countryCode = request.headers.get("x-vercel-ip-country") || null;
  const regionCode = request.headers.get("x-vercel-ip-country-region") || null;
  const deviceType = detectDevice(request.headers.get("user-agent") ?? "");

  try {
    const rows = await supabaseInsert<Array<{ id: string }>>(url, serverKey, "test_sessions", {
      completed_at: new Date().toISOString(),
      country_code: countryCode,
      region_code: regionCode,
      geo_source: countryCode || regionCode ? "vercel_ip" : "unknown",
      age_band: body.ageBand ?? null,
      beauty_code: body.beautyCode,
      beauty_code_source: body.beautyCodeSource,
      device_type: deviceType,
      completed: true,
    });

    const sessionId = rows[0]?.id;
    if (!sessionId) throw new Error("Supabase did not return a session id.");

    if (normalizedAnswers.length > 0) {
      await supabaseInsert(
        url,
        serverKey,
        "test_answers",
        normalizedAnswers.map((answer) => ({ ...answer, session_id: sessionId })),
        false,
      );
    }

    return NextResponse.json({ ok: true, sessionId });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, code: "DATABASE_WRITE_FAILED" },
      { status: 500 },
    );
  }
}
