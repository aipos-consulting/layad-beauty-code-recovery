import { NextResponse } from "next/server";

function config() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  };
}

export async function PATCH(request: Request) {
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ ok: false, message: "Supabase 설정이 없습니다." }, { status: 503 });

  try {
    const body = await request.json() as {
      productId?: string;
      canonicalName?: string;
      brand?: string;
      category?: string;
    };

    const productId = body.productId?.trim();
    const canonicalName = body.canonicalName?.trim();
    if (!productId || !canonicalName) {
      return NextResponse.json({ ok: false, message: "상품 ID와 상품명은 필수입니다." }, { status: 400 });
    }

    const payload = {
      canonical_name: canonicalName,
      brand: body.brand?.trim() || null,
      category: body.category?.trim() || null,
    };

    const response = await fetch(`${url}/rest/v1/products?id=eq.${encodeURIComponent(productId)}`, {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`상품 수정 실패: ${response.status} ${await response.text()}`);
    }

    const rows = await response.json() as Array<{ id: string; canonical_name: string; brand: string | null; category: string | null }>;
    if (!rows.length) return NextResponse.json({ ok: false, message: "수정할 상품을 찾지 못했습니다." }, { status: 404 });

    return NextResponse.json({ ok: true, product: rows[0], scoresChanged: false });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "상품 수정 중 오류가 발생했습니다." }, { status: 500 });
  }
}
