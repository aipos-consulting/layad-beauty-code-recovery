import { NextRequest, NextResponse } from "next/server";

type FitRow = { product_id: string; fit_score: number | string | null };
type ProductRow = { id: string; canonical_name: string | null; product_url: string | null; brand: string | null; category: string | null };

const CODE_RE = /^[OD][GM][PC][VE]$/;

function config() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  };
}

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

export async function GET(request: NextRequest) {
  const code = (request.nextUrl.searchParams.get("code") ?? "").trim().toUpperCase();
  if (!CODE_RE.test(code)) {
    return NextResponse.json({ ok: false, message: "Beauty Code를 확인해 주세요." }, { status: 400 });
  }

  const { url, key } = config();
  if (!url || !key) {
    return NextResponse.json({ ok: false, message: "Supabase 설정을 확인해 주세요." }, { status: 503 });
  }

  try {
    const fitResponse = await fetch(
      `${url}/rest/v1/product_type_fits?beauty_code=eq.${encodeURIComponent(code)}&select=product_id,fit_score&order=fit_score.desc.nullslast&limit=20`,
      { headers: headers(key), cache: "no-store" },
    );
    if (!fitResponse.ok) {
      throw new Error(`fit read failed: ${fitResponse.status}`);
    }

    const fits = (await fitResponse.json()) as FitRow[];
    const ids = [...new Set(fits.map((row) => row.product_id).filter(Boolean))];
    if (!ids.length) return NextResponse.json({ ok: true, code, products: [] });

    const idFilter = ids.join(",");
    const productResponse = await fetch(
      `${url}/rest/v1/products?id=in.(${idFilter})&deleted_at=is.null&select=id,canonical_name,product_url,brand,category`,
      { headers: headers(key), cache: "no-store" },
    );
    if (!productResponse.ok) {
      throw new Error(`product read failed: ${productResponse.status}`);
    }

    const products = (await productResponse.json()) as ProductRow[];
    const productMap = new Map(products.map((row) => [row.id, row]));

    const top = fits
      .map((fit) => {
        const product = productMap.get(fit.product_id);
        const score = Number(fit.fit_score);
        if (!product?.canonical_name?.trim() || !Number.isFinite(score)) return null;
        return {
          id: product.id,
          name: product.canonical_name.trim(),
          brand: product.brand?.trim() || null,
          category: product.category?.trim() || null,
          productUrl: product.product_url?.trim() || null,
          fitScore: Math.round(score),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .slice(0, 3)
      .map((row, index) => ({ ...row, rank: index + 1 }));

    return NextResponse.json({ ok: true, code, products: top });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message.slice(0, 300) : "추천 상품 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
