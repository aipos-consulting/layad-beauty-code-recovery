import type { BeautyTypeCode } from "@/lib/review-product-fit";

export type ProductInputType = "name" | "url";

export type ProductAnalysisStatus =
  | "submitted"
  | "collecting_reviews"
  | "insufficient_reviews"
  | "analyzing"
  | "completed"
  | "failed";

export type ProductAnalysisRequest = {
  id: string;
  userBeautyCode: BeautyTypeCode;
  inputType: ProductInputType;
  inputValue: string;
  productName?: string;
  productUrl?: string;
  status: ProductAnalysisStatus;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
};

const HTTP_PATTERN = /^https?:\/\//i;
const DANGEROUS_SCHEME_PATTERN = /^(javascript|data|file):/i;

export function classifyProductInput(value: string): ProductInputType {
  return HTTP_PATTERN.test(value.trim()) ? "url" : "name";
}

export function validateProductInput(value: string): { valid: boolean; message?: string } {
  const trimmed = value.trim();

  if (!trimmed) return { valid: false, message: "상품명 또는 상품 링크를 입력해 주세요." };
  if (DANGEROUS_SCHEME_PATTERN.test(trimmed)) return { valid: false, message: "상품 링크는 http:// 또는 https:// 형식이어야 합니다." };

  const inputType = classifyProductInput(trimmed);
  if (inputType === "name") {
    if (trimmed.length > 200) return { valid: false, message: "상품명은 200자 이하로 입력해 주세요." };
    return { valid: true };
  }

  if (trimmed.length > 2000) return { valid: false, message: "상품 링크는 2,000자 이하로 입력해 주세요." };
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return { valid: false, message: "상품 링크는 http:// 또는 https:// 형식이어야 합니다." };
  } catch {
    return { valid: false, message: "유효하지 않은 상품 링크입니다." };
  }
  return { valid: true };
}

export function createProductAnalysisRequest(
  value: string,
  beautyCode: BeautyTypeCode,
): ProductAnalysisRequest {
  const inputValue = value.trim();
  const inputType = classifyProductInput(inputValue);
  const now = new Date().toISOString();
  const randomId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("layad:product-fit-request", {
      detail: { beautyCode, inputType, inputValue },
    }));
  }

  return {
    id: randomId,
    userBeautyCode: beautyCode,
    inputType,
    inputValue,
    productName: inputType === "name" ? inputValue : undefined,
    productUrl: inputType === "url" ? inputValue : undefined,
    status: "submitted",
    createdAt: now,
    updatedAt: now,
  };
}
