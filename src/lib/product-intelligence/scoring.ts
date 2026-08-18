export const BEAUTY_CODES = [
  "OGPV", "OGPE", "OGCV", "OGCE",
  "OMPV", "OMPE", "OMCV", "OMCE",
  "DGPV", "DGPE", "DGCV", "DGCE",
  "DMPV", "DMPE", "DMCV", "DMCE",
] as const;

export type BeautyCode = (typeof BEAUTY_CODES)[number];
export type Axis = "OD" | "GM" | "PC" | "VE";
export type AxisCode = "O" | "D" | "G" | "M" | "P" | "C" | "V" | "E";
export type Sentiment = "positive" | "negative" | "neutral" | "mixed";

export type EvidenceForScoring = {
  reviewKey: string;
  axis: Axis;
  code: AxisCode;
  sentiment: Sentiment;
  intensity: number;
  confidence: number;
  verified?: boolean;
};

export type AxisProfile = {
  axis: Axis;
  firstCode: AxisCode;
  firstScore: number;
  secondCode: AxisCode;
  secondScore: number;
  reviewCount: number;
  confidence: number;
};

export type TypeFit = {
  beautyCode: BeautyCode;
  fitScore: number;
  reviewCount: number;
  confidence: number;
};

const AXES: Record<Axis, [AxisCode, AxisCode]> = {
  OD: ["O", "D"],
  GM: ["G", "M"],
  PC: ["P", "C"],
  VE: ["V", "E"],
};

const AXIS_ORDER: Axis[] = ["OD", "GM", "PC", "VE"];

function clamp01(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function opposite(axis: Axis, code: AxisCode) {
  const [first, second] = AXES[axis];
  return code === first ? second : first;
}

function confidenceFromEvidence(evidences: EvidenceForScoring[]) {
  if (evidences.length === 0) return 0;
  const average = evidences.reduce((sum, item) => sum + clamp01(item.confidence), 0) / evidences.length;
  const uniqueReviews = new Set(evidences.map((item) => item.reviewKey)).size;
  const coverage = Math.min(1, uniqueReviews / 10);
  return Number((average * coverage).toFixed(3));
}

export function buildAxisProfiles(evidences: EvidenceForScoring[]): AxisProfile[] {
  return AXIS_ORDER.map((axis) => {
    const [first, second] = AXES[axis];
    const raw: Record<string, number> = { [first]: 0, [second]: 0 };
    const axisEvidence = evidences.filter((item) => item.axis === axis && (item.code === first || item.code === second));

    for (const item of axisEvidence) {
      const base = clamp01(item.intensity) * clamp01(item.confidence) * (item.verified ? 1.1 : 1);
      if (item.sentiment === "positive") raw[item.code] += base;
      else if (item.sentiment === "negative") raw[opposite(axis, item.code)] += base;
      else if (item.sentiment === "mixed") {
        raw[item.code] += base * 0.45;
        raw[opposite(axis, item.code)] += base * 0.20;
      } else raw[item.code] += base * 0.20;
    }

    const total = raw[first] + raw[second];
    const firstScore = total > 0 ? Math.round((raw[first] / total) * 100) : 50;
    const secondScore = 100 - firstScore;
    return {
      axis,
      firstCode: first,
      firstScore,
      secondCode: second,
      secondScore,
      reviewCount: new Set(axisEvidence.map((item) => item.reviewKey)).size,
      confidence: confidenceFromEvidence(axisEvidence),
    };
  });
}

export function buildTypeFits(evidences: EvidenceForScoring[], profiles = buildAxisProfiles(evidences)): TypeFit[] {
  const profileMap = new Map(profiles.map((profile) => [profile.axis, profile]));
  const uniqueReviewCount = new Set(evidences.map((item) => item.reviewKey)).size;
  const overallConfidence = confidenceFromEvidence(evidences);

  return BEAUTY_CODES.map((beautyCode) => {
    const letters = beautyCode.split("") as AxisCode[];
    const scores = AXIS_ORDER.map((axis, index) => {
      const profile = profileMap.get(axis);
      if (!profile) return 50;
      return letters[index] === profile.firstCode ? profile.firstScore : profile.secondScore;
    });
    return {
      beautyCode,
      fitScore: Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length),
      reviewCount: uniqueReviewCount,
      confidence: overallConfidence,
    };
  });
}
