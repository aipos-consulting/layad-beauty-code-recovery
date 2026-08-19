import { NextRequest, NextResponse } from "next/server";
import { POST as importBatch } from "../admin/product-batch-import/route";

const NONCE = "batch-smoke-20260819-estee-01";

const item = {
  product: {
    canonical_name: "estee lauder double wear foundation",
    brand: "Estée Lauder",
    category: "foundation",
    product_url: "https://www.esteelauder.com/product/643/22830/product-catalog/makeup/face/foundation/double-wear/stay-in-place-makeup"
  },
  reviews: [
    {
      source_label: "Sephora",
      source_url: "https://www.sephora.com/product/double-wear-stay-in-place-makeup-P378284",
      language_code: "en",
      review_text: "Consumer reviews commonly emphasize strong all-day wear, a matte finish and dependable coverage, while some dry-skin users report that careful skin preparation helps avoid a tight or dry look.",
      features: [
        { keyword: "long wear", axis: "VE", code: "E", sentiment: "positive", intensity: 0.95, confidence: 0.94, context: "wear remains stable through a long day", evidence_excerpt: "all-day wear" },
        { keyword: "matte finish", axis: "GM", code: "M", sentiment: "positive", intensity: 0.9, confidence: 0.93, context: "finish is consistently described as matte", evidence_excerpt: "matte finish" },
        { keyword: "dryness", axis: "OD", code: "O", sentiment: "mixed", intensity: 0.65, confidence: 0.82, context: "dry skin can need more preparation", evidence_excerpt: "can look dry" }
      ]
    },
    {
      source_label: "Ulta Beauty",
      source_url: "https://www.ulta.com/p/double-wear-stay-in-place-foundation-xlsImpprod14641507",
      language_code: "en",
      review_text: "Reviews frequently describe good transfer resistance and lasting coverage. Users also note that the formula sets relatively quickly, so working in sections can improve application.",
      features: [
        { keyword: "transfer resistance", axis: "VE", code: "E", sentiment: "positive", intensity: 0.9, confidence: 0.9, context: "coverage remains in place with limited transfer", evidence_excerpt: "limited transfer" },
        { keyword: "quick setting", axis: "PC", code: "P", sentiment: "mixed", intensity: 0.8, confidence: 0.86, context: "application benefits from precise, section-by-section blending", evidence_excerpt: "sets quickly" }
      ]
    },
    {
      source_label: "Nordstrom",
      source_url: "https://www.nordstrom.com/s/estee-lauder-double-wear-stay-in-place-makeup/2780518",
      language_code: "en",
      review_text: "Review feedback commonly highlights buildable medium-to-full coverage and a polished, controlled finish, with particularly strong appeal for combination and oil-prone skin.",
      features: [
        { keyword: "buildable coverage", axis: "PC", code: "P", sentiment: "positive", intensity: 0.9, confidence: 0.9, context: "coverage can be layered for a more perfected result", evidence_excerpt: "buildable coverage" },
        { keyword: "oil control", axis: "OD", code: "O", sentiment: "positive", intensity: 0.9, confidence: 0.9, context: "helps maintain a controlled finish on oil-prone skin", evidence_excerpt: "controlled finish" }
      ]
    },
    {
      source_label: "Influenster",
      source_url: "https://www.influenster.com/reviews/estee-lauder-double-wear-stay-in-place-makeup",
      language_code: "en",
      review_text: "Many reviewers praise the durability and ability to cover uneven tone or discoloration. A recurring caution is that applying too much can make texture or dry areas more noticeable.",
      features: [
        { keyword: "high coverage", axis: "PC", code: "P", sentiment: "positive", intensity: 0.92, confidence: 0.91, context: "covers uneven tone and discoloration effectively", evidence_excerpt: "high coverage" },
        { keyword: "texture emphasis", axis: "OD", code: "O", sentiment: "mixed", intensity: 0.6, confidence: 0.78, context: "heavy application may emphasize dry texture", evidence_excerpt: "can emphasize texture" }
      ]
    },
    {
      source_label: "MakeupAlley",
      source_url: "https://www.makeupalley.com/product/showreview.asp/ItemId=1597/Double-Wear-Stay-in-Place-Makeup/Estee-Lauder/Liquid",
      language_code: "en",
      review_text: "Long-term user feedback often describes reliable wear and shine control. Reviews also suggest that moisturizing and thin layers are important for users with drier areas.",
      features: [
        { keyword: "shine control", axis: "OD", code: "O", sentiment: "positive", intensity: 0.88, confidence: 0.87, context: "helps control visible shine through wear", evidence_excerpt: "shine control" },
        { keyword: "thin layering", axis: "PC", code: "P", sentiment: "positive", intensity: 0.7, confidence: 0.8, context: "thin controlled layers give a cleaner result", evidence_excerpt: "thin layers" },
        { keyword: "stable finish", axis: "VE", code: "E", sentiment: "positive", intensity: 0.9, confidence: 0.88, context: "finish remains relatively stable over time", evidence_excerpt: "reliable wear" }
      ]
    }
  ],
  axis_profiles: [
    { axis: "OD", first_code: "O", first_score: 78, second_code: "D", second_score: 22, review_count: 5, confidence: 0.84 },
    { axis: "GM", first_code: "G", first_score: 20, second_code: "M", second_score: 80, review_count: 5, confidence: 0.9 },
    { axis: "PC", first_code: "P", first_score: 65, second_code: "C", second_score: 35, review_count: 5, confidence: 0.82 },
    { axis: "VE", first_code: "V", first_score: 20, second_code: "E", second_score: 80, review_count: 5, confidence: 0.9 }
  ],
  type_fits: {
    OGPV: 46, OGPE: 61, OGCV: 38, OGCE: 53,
    OMPV: 61, OMPE: 76, OMCV: 53, OMCE: 68,
    DGPV: 32, DGPE: 47, DGCV: 24, DGCE: 39,
    DMPV: 47, DMPE: 62, DMCV: 39, DMCE: 54
  },
  keyword_candidates: [
    { keyword: "long wear", language_code: "en", axis: "VE", code: "E", weight: 0.95, confidence: 0.94, occurrence_count: 2, sample_context: "stable all-day wear" },
    { keyword: "matte finish", language_code: "en", axis: "GM", code: "M", weight: 0.9, confidence: 0.93, occurrence_count: 1, sample_context: "controlled matte finish" },
    { keyword: "oil control", language_code: "en", axis: "OD", code: "O", weight: 0.9, confidence: 0.9, occurrence_count: 2, sample_context: "shine and oil control" },
    { keyword: "buildable coverage", language_code: "en", axis: "PC", code: "P", weight: 0.9, confidence: 0.9, occurrence_count: 2, sample_context: "medium-to-full buildable coverage" },
    { keyword: "quick setting", language_code: "en", axis: "PC", code: "P", weight: 0.8, confidence: 0.86, occurrence_count: 1, sample_context: "sets quickly during application" },
    { keyword: "dryness", language_code: "en", axis: "OD", code: "O", weight: 0.65, confidence: 0.82, occurrence_count: 2, sample_context: "dry areas need preparation" }
  ]
};

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("nonce") !== NONCE) return NextResponse.json({ ok: false }, { status: 404 });
  const req = new NextRequest(new URL("/api/admin/product-batch-import", request.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: [item], validateOnly: false })
  });
  const res = await importBatch(req);
  return NextResponse.json(await res.json(), { status: res.status, headers: { "Cache-Control": "no-store" } });
}
