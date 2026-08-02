# Codex 개발 작업: 리뷰 맥락 기반 상품별 16유형 적합도 Beta

## 목표

현재 20문항 Beauty Code 테스트의 결과 화면에 **리뷰 맥락 기반 상품별 16유형 적합도 Beta**를 추가한다.

핵심 구조는 다음과 같다.

```text
상품 1개
→ 리뷰 맥락 분석
→ O/D·G/M·P/C·V/E 특성 코드 축적
→ 상품 특성 프로필 생성
→ 16개 Beauty Code 각각의 적합도 계산
→ ProductTypeFit 16건 생성 또는 갱신
→ 사용자의 Beauty Code에 해당하는 1건을 결과 화면에 표시
```

이번 작업에서는 실제 외부 AI API와 리뷰 크롤링을 연결하지 않는다. 샘플 리뷰 분석 결과로 데이터 구조, 집계 함수, 16유형 적합도 생성 함수와 결과 화면을 검증한다.

## 절대 유지 사항

- 기존 20문항 문구와 선택지 변경 금지
- 기존 O/D, G/M, P/C, V/E 점수 계산 변경 금지
- 축별 5문항 중 한 코드가 3점 이상이면 결과가 되는 규칙 유지
- Beauty Code 순서 `O/D → G/M → P/C → V/E` 유지
- 회원가입, 저장, 관리자 Dashboard는 이번 범위에서 변경하지 않음
- 특정 제품 효능을 보장하거나 피부 진단처럼 표현하지 않음
- 샘플 데이터를 실제 AI 분석 완료 데이터처럼 표현하지 않음
- 검증되지 않은 상품명을 확정 상품명처럼 노출하지 않음

## 1. 데이터 모델

`src/lib/review-product-fit.ts`를 생성한다.

```ts
type BeautyCodeLetter = "O" | "D" | "G" | "M" | "P" | "C" | "V" | "E";
type BeautyTypeCode =
  | "OGPV" | "OGPE" | "OGCV" | "OGCE"
  | "OMPV" | "OMPE" | "OMCV" | "OMCE"
  | "DGPV" | "DGPE" | "DGCV" | "DGCE"
  | "DMPV" | "DMPE" | "DMCV" | "DMCE";
type AxisKey = "OD" | "GM" | "PC" | "VE";
type Sentiment = "positive" | "negative" | "neutral";
type ProductNameStatus = "verified" | "unverified" | "missing";

type ReviewFeatureEvidence = {
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

type Product = {
  id: string;
  brand?: string;
  name?: string;
  nameStatus: ProductNameStatus;
  category: string;
  productUrl?: string;
  sourceLabel?: string;
};

type ProductTypeFit = {
  productId: string;
  beautyCode: BeautyTypeCode;
  fitScore: number;
  reviewEvidenceCount: number;
  verifiedEvidenceCount: number;
  confidenceLabel: "낮음" | "보통" | "높음" | "샘플 검증 단계";
  matchedAxes: AxisKey[];
  weakAxes: AxisKey[];
  representativeExcerpts: string[];
  analysisVersion: string;
  updatedAt: string;
};
```

## 2. 초기 대상 상품

초기 대상은 다음 4개다.

1. 아이레놀 쌩얼크림
2. 달바 톤업 선크림
3. 바닐라코 프라임 프라이머
4. 토리든 다이브인 히알루론산 세럼

위 이름은 작업 대상 식별용 초안일 수 있다.

상품명 검증 규칙:

- 공식 상품 상세 페이지에서 확인되면 `verified`
- 리뷰나 비공식 출처에서만 확인되면 `unverified`
- 정확한 이름을 확인하지 못하면 `missing`
- 미검증 상품명을 사용자 화면에 확정 상품명처럼 표시하지 않는다.

각 상품에 샘플 리뷰 분석 근거를 최소 4건 이상 등록하고 출처는 `SAMPLE`로 명시한다.

## 3. 리뷰 맥락 기반 상품 프로필 생성

`buildProductProfile(product, evidences)` 순수 함수를 구현한다.

기본 가중치:

```text
weight = intensity × confidence
```

- positive: 해당 코드에 가중치 추가
- negative: 반대 코드에 가중치 추가하거나 해당 코드 감점
- neutral: 낮은 가중치로 반영하거나 집계 제외
- verified 근거는 비검증 근거보다 가중치를 높일 수 있음

축별 두 코드의 합을 100으로 환산한다.

예:

```ts
{
  OD: { O: 28, D: 72 },
  GM: { G: 84, M: 16 },
  PC: { P: 31, C: 69 },
  VE: { V: 57, E: 43 },
}
```

0으로 나누는 경우를 안전하게 처리한다.

## 4. 상품별 16유형 적합도 계산

16개 유형 목록을 상수로 정의한다.

```ts
export const BEAUTY_TYPES: BeautyTypeCode[] = [
  "OGPV", "OGPE", "OGCV", "OGCE",
  "OMPV", "OMPE", "OMCV", "OMCE",
  "DGPV", "DGPE", "DGCV", "DGCE",
  "DMPV", "DMPE", "DMCV", "DMCE",
];
```

다음 순수 함수를 구현한다.

```ts
calculateTypeFit(beautyCode, productProfile)
generateProductTypeFits(product, productProfile, evidences)
```

`calculateTypeFit` 계산 규칙:

- 1번째 문자: O/D 축
- 2번째 문자: G/M 축
- 3번째 문자: P/C 축
- 4번째 문자: V/E 축
- 각 축에서 해당 문자에 대응하는 상품 프로필 점수를 가져온다.
- 4개 축 점수의 평균을 계산한다.
- 0~100 정수로 반올림한다.

```text
fitScore = round((OD점수 + GM점수 + PC점수 + VE점수) / 4)
```

`generateProductTypeFits`는 상품 1개당 정확히 16개의 `ProductTypeFit`을 반환해야 한다.

필수 검증:

- 중복 Beauty Code 없음
- 누락 Beauty Code 없음
- 모든 fitScore는 0~100
- 배열 길이는 항상 16
- 적합도 높은 순 정렬 기능은 별도 제공

## 5. 조회 구조

사용자가 테스트를 완료하면 실시간으로 네 축을 다시 계산해 상품마다 임의 점수를 만들지 않는다.

아래 흐름으로 처리한다.

```text
사용자 finalCode
→ 각 상품의 ProductTypeFit 중 beautyCode === finalCode 조회
→ fitScore 기준 내림차순 정렬
→ 결과 화면 표시
```

샘플 단계에서는 메모리 내 배열로 구현해도 되지만, 실제 DB 테이블로 쉽게 이전할 수 있도록 타입과 함수 경계를 분리한다.

## 6. 신뢰도

- 0~4건: 낮음
- 5~19건: 보통
- 20건 이상: 높음
- 이번 샘플 데이터는 항상 `샘플 검증 단계`

적합도와 신뢰도를 혼합하지 않는다.

## 7. 결과 화면 UI

`src/app/test/page.tsx` 완료 화면 아래에 다음 섹션을 추가한다.

제목:

```text
리뷰 기반 상품 적합도 Beta
```

설명:

```text
AI가 리뷰의 맥락에서 상품 특성 코드를 추출하고, 상품별 16유형 적합도 중 나의 Beauty Code에 해당하는 결과를 보여줍니다.
```

각 상품 카드에는 현재 사용자 유형에 해당하는 적합도 1건만 표시한다.

표시 항목:

1. 브랜드 또는 출처 라벨
2. 검증된 상품명 링크 / 상품 링크 / 상품 정보 확인 중 중 하나
3. 카테고리
4. 현재 사용자 Beauty Code
5. 해당 유형 적합도 0~100%
6. 신뢰도 또는 `샘플 검증 단계`
7. 리뷰 근거 수
8. 잘 맞는 축
9. 주의 축
10. 대표 근거 문장 최대 2개
11. `SAMPLE DATA` 배지

상품명·링크 표시 규칙:

1. `productUrl`이 있고 `nameStatus === "verified"`이면 검증된 상품명을 클릭 링크로 표시
2. 링크가 있고 이름이 미검증이면 `상품 링크` 또는 `공식 상품 페이지`만 표시
3. 링크가 없고 이름만 검증됐으면 상품명 일반 텍스트
4. 링크도 없고 이름도 미검증이면 `상품 정보 확인 중`
5. 상품명과 링크를 중복 표시하지 않음
6. 별도 `상품 보기` 버튼을 만들지 않음
7. 긴 URL 문자열을 노출하지 않음
8. 외부 링크는 새 탭 + `rel="noopener noreferrer"`

상품 카드는 현재 사용자 유형 적합도 높은 순으로 정렬한다.

하단 안내:

```text
현재 결과는 리뷰 기반 AI 분석 구조와 상품별 16유형 적합도 계산을 검증하기 위한 샘플 데이터 기반 Beta입니다. 실제 사용감은 피부 상태, 계절, 환경, 사용량에 따라 달라질 수 있습니다.
```

## 8. 향후 실제 AI 연동 인터페이스

```ts
export interface ReviewFeatureAnalyzer {
  analyze(reviewText: string): Promise<ReviewFeatureEvidence[]>;
}
```

이번 작업에서는 mock만 제공하고 외부 API 키, AI API 호출, 리뷰 크롤링은 추가하지 않는다.

## 9. 테스트

최소 단위 테스트:

1. 상품 프로필 축별 합이 100인지
2. 상품 1개당 16개 적합도 생성
3. 16개 Beauty Code 중복·누락 없음
4. `OGPV`와 `DMCE` 계산 확인
5. fitScore 0~100 범위
6. 사용자 finalCode에 맞는 적합도 조회
7. 적합도 내림차순 정렬
8. 상품명 검증 상태별 UI 표시 함수 확인

## 10. 검증 명령

가능한 기존 명령만 각각 한 번 실행한다.

```text
npm run lint
npm run typecheck   # 스크립트가 있을 때만
npm test            # 스크립트가 있을 때만
npm run build
```

같은 실패 명령을 반복하지 않는다.

## 11. 완료 기준

- 기존 20문항 및 결과 코드 유지
- 초기 상품 4개 표시
- 상품별 16유형 적합도 총 64건 생성
- 사용자의 finalCode에 해당하는 상품별 적합도만 화면에 표시
- 적합도 높은 순 정렬
- 리뷰 수, 신뢰도, 대표 근거 표시
- `SAMPLE DATA` 표시
- 테스트 다시 하기 정상 동작

## 완료 보고

- 변경 파일 목록
- 상품별 16유형 적합도 계산식
- 상품별 생성된 적합도 건수
- UI 표시 위치
- 상품명 검증 상태와 링크 유무
- 샘플 데이터 표시 위치
- 검증 명령과 결과
- commit SHA
- Vercel 자동배포 예상 여부

## 커밋 메시지

```text
feat: add product by 16-type fit beta
```
