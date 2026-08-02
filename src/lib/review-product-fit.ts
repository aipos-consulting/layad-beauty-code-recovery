export type BeautyCodeLetter = "O" | "D" | "G" | "M" | "P" | "C" | "V" | "E";
export type BeautyTypeCode =
  | "OGPV" | "OGPE" | "OGCV" | "OGCE"
  | "OMPV" | "OMPE" | "OMCV" | "OMCE"
  | "DGPV" | "DGPE" | "DGCV" | "DGCE"
  | "DMPV" | "DMPE" | "DMCV" | "DMCE";
export type AxisKey = "OD" | "GM" | "PC" | "VE";
export type Sentiment = "positive" | "negative" | "neutral";
export type ProductNameStatus = "verified" | "unverified" | "missing";

export type ReviewFeatureEvidence = {
  reviewId: string;
  productId: string;
  source: string;
  excerpt: string;
  feature: string;
  axis: AxisKey;
  code: BeautyCodeLetter;
  sentiment: Sentiment;
  intensity: number;
  confidence: number;
  condition?: string;
  skinContext?: string;
  season?: string;
  environment?: string;
  timeContext?: string;
  analysisVersion: string;
  verified: boolean;
};

export type Product = {
  id: string;
  brand?: string;
  name?: string;
  nameStatus: ProductNameStatus;
  category: string;
  productUrl?: string;
  sourceLabel?: string;
};

type AxisScore = Record<BeautyCodeLetter, number>;

export type ProductProfile = {
  product: Product;
  axisScores: Record<AxisKey, AxisScore>;
  reviewEvidenceCount: number;
  verifiedEvidenceCount: number;
  representativeExcerpts: string[];
};

export type ProductTypeFit = {
  product: Product;
  beautyCode: BeautyTypeCode;
  fitScore: number;
  reviewEvidenceCount: number;
  verifiedEvidenceCount: number;
  confidenceLabel: "낮음" | "보통" | "높음" | "샘플 검증 단계";
  matchedAxes: AxisKey[];
  weakAxes: AxisKey[];
  representativeExcerpts: string[];
  analysisVersion: string;
};

export interface ReviewFeatureAnalyzer {
  analyze(reviewText: string): Promise<ReviewFeatureEvidence[]>;
}

export const BEAUTY_TYPES: BeautyTypeCode[] = [
  "OGPV", "OGPE", "OGCV", "OGCE",
  "OMPV", "OMPE", "OMCV", "OMCE",
  "DGPV", "DGPE", "DGCV", "DGCE",
  "DMPV", "DMPE", "DMCV", "DMCE",
];

const AXIS_PAIRS: Record<AxisKey, [BeautyCodeLetter, BeautyCodeLetter]> = {
  OD: ["O", "D"],
  GM: ["G", "M"],
  PC: ["P", "C"],
  VE: ["V", "E"],
};

const AXIS_ORDER: AxisKey[] = ["OD", "GM", "PC", "VE"];

const oppositeCode = (axis: AxisKey, code: BeautyCodeLetter): BeautyCodeLetter => {
  const [first, second] = AXIS_PAIRS[axis];
  return code === first ? second : first;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function buildProductProfile(
  product: Product,
  evidences: ReviewFeatureEvidence[],
): ProductProfile {
  const raw: Record<AxisKey, AxisScore> = {
    OD: { O: 0, D: 0, G: 0, M: 0, P: 0, C: 0, V: 0, E: 0 },
    GM: { O: 0, D: 0, G: 0, M: 0, P: 0, C: 0, V: 0, E: 0 },
    PC: { O: 0, D: 0, G: 0, M: 0, P: 0, C: 0, V: 0, E: 0 },
    VE: { O: 0, D: 0, G: 0, M: 0, P: 0, C: 0, V: 0, E: 0 },
  };

  const productEvidences = evidences.filter((evidence) => evidence.productId === product.id);

  productEvidences.forEach((evidence) => {
    const baseWeight = clamp01(evidence.intensity) * clamp01(evidence.confidence);
    const verifiedWeight = evidence.verified ? 1.15 : 1;
    const weight = baseWeight * verifiedWeight;

    if (evidence.sentiment === "positive") {
      raw[evidence.axis][evidence.code] += weight;
    } else if (evidence.sentiment === "negative") {
      raw[evidence.axis][oppositeCode(evidence.axis, evidence.code)] += weight;
    } else {
      raw[evidence.axis][evidence.code] += weight * 0.25;
    }
  });

  const axisScores = AXIS_ORDER.reduce<Record<AxisKey, AxisScore>>((accumulator, axis) => {
    const [first, second] = AXIS_PAIRS[axis];
    const total = raw[axis][first] + raw[axis][second];
    const firstScore = total === 0 ? 50 : Math.round((raw[axis][first] / total) * 100);
    const secondScore = 100 - firstScore;

    accumulator[axis] = {
      O: 0, D: 0, G: 0, M: 0, P: 0, C: 0, V: 0, E: 0,
      [first]: firstScore,
      [second]: secondScore,
    } as AxisScore;
    return accumulator;
  }, {} as Record<AxisKey, AxisScore>);

  return {
    product,
    axisScores,
    reviewEvidenceCount: productEvidences.length,
    verifiedEvidenceCount: productEvidences.filter((evidence) => evidence.verified).length,
    representativeExcerpts: productEvidences
      .filter((evidence) => evidence.sentiment === "positive")
      .sort((a, b) => b.intensity * b.confidence - a.intensity * a.confidence)
      .slice(0, 2)
      .map((evidence) => evidence.excerpt),
  };
}

export function calculateTypeFit(
  beautyCode: BeautyTypeCode,
  profile: ProductProfile,
): ProductTypeFit {
  const letters = beautyCode.split("") as BeautyCodeLetter[];
  const axisResults = AXIS_ORDER.map((axis, index) => ({
    axis,
    score: profile.axisScores[axis][letters[index]],
  }));
  const fitScore = Math.round(
    axisResults.reduce((sum, result) => sum + result.score, 0) / axisResults.length,
  );

  return {
    product: profile.product,
    beautyCode,
    fitScore,
    reviewEvidenceCount: profile.reviewEvidenceCount,
    verifiedEvidenceCount: profile.verifiedEvidenceCount,
    confidenceLabel: "샘플 검증 단계",
    matchedAxes: axisResults.filter((result) => result.score >= 60).map((result) => result.axis),
    weakAxes: axisResults.filter((result) => result.score < 40).map((result) => result.axis),
    representativeExcerpts: profile.representativeExcerpts,
    analysisVersion: "sample-v1",
  };
}

export function generateProductTypeFits(
  product: Product,
  evidences: ReviewFeatureEvidence[],
): ProductTypeFit[] {
  const profile = buildProductProfile(product, evidences);
  return BEAUTY_TYPES.map((beautyCode) => calculateTypeFit(beautyCode, profile));
}

export function getFitsForUserType(
  beautyCode: BeautyTypeCode,
  products: Product[],
  evidences: ReviewFeatureEvidence[],
): ProductTypeFit[] {
  return products
    .map((product) =>
      generateProductTypeFits(product, evidences).find((fit) => fit.beautyCode === beautyCode),
    )
    .filter((fit): fit is ProductTypeFit => Boolean(fit))
    .sort((a, b) => b.fitScore - a.fitScore);
}

export const SAMPLE_PRODUCTS: Product[] = [
  { id: "irenol-bare-cream", brand: "IRENOL", name: "아이레놀 쌩얼크림", nameStatus: "unverified", category: "톤업 크림", sourceLabel: "상품명 확인 중" },
  { id: "dalba-toneup-sun", brand: "d'Alba", name: "달바 톤업 선크림", nameStatus: "unverified", category: "톤업 선크림", sourceLabel: "상품명 확인 중" },
  { id: "banila-primer", brand: "BANILA CO", name: "바닐라코 프라임 프라이머", nameStatus: "unverified", category: "프라이머", sourceLabel: "상품명 확인 중" },
  { id: "torriden-divein-serum", brand: "Torriden", name: "토리든 다이브인 히알루론산 세럼", nameStatus: "unverified", category: "수분 세럼", sourceLabel: "상품명 확인 중" },
];

const evidence = (
  reviewId: string,
  productId: string,
  excerpt: string,
  axis: AxisKey,
  code: BeautyCodeLetter,
  intensity: number,
  confidence: number,
): ReviewFeatureEvidence => ({
  reviewId,
  productId,
  source: "SAMPLE",
  excerpt,
  feature: excerpt,
  axis,
  code,
  sentiment: "positive",
  intensity,
  confidence,
  analysisVersion: "sample-v1",
  verified: false,
});

export const SAMPLE_REVIEW_EVIDENCES: ReviewFeatureEvidence[] = [
  evidence("i-1", "irenol-bare-cream", "한 단계로 자연스럽게 피부 표현이 정돈되는 사용 맥락", "PC", "C", 0.9, 0.85),
  evidence("i-2", "irenol-bare-cream", "은은한 윤기가 남는 마무리 맥락", "GM", "G", 0.78, 0.8),
  evidence("i-3", "irenol-bare-cream", "건조할 때 편안하다고 느끼는 맥락", "OD", "D", 0.72, 0.76),
  evidence("i-4", "irenol-bare-cream", "날마다 표현 차이가 있다는 맥락", "VE", "V", 0.65, 0.72),

  evidence("d-1", "dalba-toneup-sun", "빛을 받으면 자연스러운 광채가 느껴지는 맥락", "GM", "G", 0.94, 0.9),
  evidence("d-2", "dalba-toneup-sun", "선케어와 톤업을 함께 끝내는 간편함 맥락", "PC", "C", 0.9, 0.88),
  evidence("d-3", "dalba-toneup-sun", "건조한 날에도 촉촉함이 유지된다는 맥락", "OD", "D", 0.82, 0.8),
  evidence("d-4", "dalba-toneup-sun", "환경에 따라 광 표현이 달라진다는 맥락", "VE", "V", 0.62, 0.7),

  evidence("b-1", "banila-primer", "피부결을 세밀하게 정돈하는 완성도 맥락", "PC", "P", 0.95, 0.9),
  evidence("b-2", "banila-primer", "보송하고 매끈한 마무리 맥락", "GM", "M", 0.9, 0.88),
  evidence("b-3", "banila-primer", "유분으로 인한 무너짐을 줄였다는 맥락", "OD", "O", 0.86, 0.84),
  evidence("b-4", "banila-primer", "시간이 지나도 결과가 비교적 일정하다는 맥락", "VE", "E", 0.82, 0.8),

  evidence("t-1", "torriden-divein-serum", "메이크업 전 수분 준비에 도움이 되는 맥락", "OD", "D", 0.96, 0.92),
  evidence("t-2", "torriden-divein-serum", "루틴에 쉽게 추가할 수 있다는 맥락", "PC", "C", 0.82, 0.82),
  evidence("t-3", "torriden-divein-serum", "촉촉한 바탕으로 은은한 광이 난다는 맥락", "GM", "G", 0.76, 0.78),
  evidence("t-4", "torriden-divein-serum", "컨디션에 따라 흡수감 차이가 있다는 맥락", "VE", "V", 0.6, 0.68),
];
