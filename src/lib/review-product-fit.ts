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
  const emptyAxisScore = (): AxisScore => ({ O: 0, D: 0, G: 0, M: 0, P: 0, C: 0, V: 0, E: 0 });
  const raw: Record<AxisKey, AxisScore> = {
    OD: emptyAxisScore(),
    GM: emptyAxisScore(),
    PC: emptyAxisScore(),
    VE: emptyAxisScore(),
  };

  const productEvidences = evidences.filter((evidence) => evidence.productId === product.id);

  productEvidences.forEach((evidence) => {
    const baseWeight = clamp01(evidence.intensity) * clamp01(evidence.confidence);
    const weight = baseWeight * (evidence.verified ? 1.15 : 1);

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
    accumulator[axis] = { ...emptyAxisScore(), [first]: firstScore, [second]: secondScore };
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
    .map((product) => generateProductTypeFits(product, evidences).find((fit) => fit.beautyCode === beautyCode))
    .filter((fit): fit is ProductTypeFit => Boolean(fit))
    .sort((a, b) => b.fitScore - a.fitScore);
}

export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "layad-primer-sample",
    brand: "LAYAD",
    name: "LAYAD 프라이머",
    nameStatus: "verified",
    category: "프라이머",
    sourceLabel: "SAMPLE",
  },
];

const evidence = (
  reviewId: string,
  excerpt: string,
  axis: AxisKey,
  code: BeautyCodeLetter,
  intensity: number,
  confidence: number,
): ReviewFeatureEvidence => ({
  reviewId,
  productId: "layad-primer-sample",
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
  evidence("lp-1", "피부결을 세밀하게 정돈해 메이크업 완성도를 높이는 맥락", "PC", "P", 0.95, 0.9),
  evidence("lp-2", "보송하고 매끈한 마무리를 선호하는 맥락", "GM", "M", 0.9, 0.88),
  evidence("lp-3", "유분으로 인한 무너짐을 줄이는 데 도움이 된다는 맥락", "OD", "O", 0.86, 0.84),
  evidence("lp-4", "시간이 지나도 결과가 비교적 일정하게 유지된다는 맥락", "VE", "E", 0.82, 0.8),
];
