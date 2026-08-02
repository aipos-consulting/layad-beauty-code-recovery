# Codex 개발 작업: 리뷰 맥락 기반 제품 적합도 Beta

## 목표

현재 20문항 Beauty Code 테스트의 결과 화면에 리뷰 맥락 기반 제품 적합도 Beta를 추가한다.

제품 적합도는 사람이 제품별 Beauty Code를 직접 고정하는 방식이 아니다. 리뷰 원문에서 맥락 단위의 특성을 추출하고, O/D·G/M·P/C·V/E 특성 코드와 긍정·부정·강도·조건을 누적해 제품 프로필을 만든 뒤 사용자 Beauty Code와 비교한다.

이번 작업에서는 실제 외부 AI API와 리뷰 크롤링을 연결하지 않는다. 샘플 리뷰 분석 결과 데이터로 데이터 구조, 집계 함수, 적합도 함수와 결과 화면을 검증한다.

## 절대 유지 사항

- 기존 20문항 문구와 선택지 변경 금지
- 기존 O/D, G/M, P/C, V/E 점수 계산 변경 금지
- 축별 5문항 중 한 코드가 3점 이상이면 결과가 되는 규칙 유지
- 회원가입, 저장, 관리자 Dashboard는 이번 범위에서 변경하지 않음
- 특정 제품 효능을 보장하거나 피부 진단처럼 표현하지 않음
- 샘플 데이터를 실제 AI 분석 완료 데이터처럼 표현하지 않음

## 개발 범위

### 1. 리뷰 분석 결과 데이터 모델

`src/lib/review-product-fit.ts`를 생성한다.

필수 타입 예시:

```ts
type BeautyCode = "O" | "D" | "G" | "M" | "P" | "C" | "V" | "E";
type AxisKey = "OD" | "GM" | "PC" | "VE";
type Sentiment = "positive" | "negative" | "neutral";

type ReviewFeatureEvidence = {
  reviewId: string;
  productId: string;
  source: string;
  excerpt: string;
  feature: string;
  axis: AxisKey;
  code: BeautyCode;
  sentiment: Sentiment;
  intensity: number; // 0~1
  confidence: number; // 0~1
  condition?: string;
  skinContext?: string;
  timeContext?: string;
  analysisVersion: string;
  verified: boolean;
};

type Product = {
  id: string;
  brand: string;
  name: string;
  category: string;
};
```

### 2. 초기 제품 4개

다음 제품만 샘플로 등록한다.

1. 아이레놀 쌩얼크림
2. 달바 톤업 선크림
3. 바닐라코 프라임 프라이머
4. 토리든 다이브인 히알루론산 세럼

각 제품에 리뷰 맥락 분석 결과 샘플을 최소 4건 이상 등록한다. 샘플 리뷰는 실제 리뷰를 인용한 것처럼 표시하지 말고 `SAMPLE` 출처로 명확히 표시한다.

### 3. 제품 특성 프로필 집계

순수 함수로 구현한다.

```ts
buildProductProfile(product, evidences)
```

축별 각 코드의 유효 가중치를 계산한다.

기본 가중치:

```text
weight = intensity × confidence
```

- positive: 해당 코드에 가중치 추가
- negative: 해당 코드의 반대 코드에 가중치 추가하거나 해당 코드 가중치를 감점
- neutral: 낮은 가중치로 반영하거나 집계 제외
- verified=true 근거는 verified=false보다 가중치를 높일 수 있음

각 축은 두 코드의 합을 100으로 환산한다.

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

### 4. 사용자 적합도 계산

순수 함수로 구현한다.

```ts
calculateProductFit(userCode, productProfile)
```

사용자 4자리 코드 순서는 반드시 다음과 같다.

```text
O/D → G/M → P/C → V/E
```

각 축에서 사용자 코드에 해당하는 제품 프로필 점수를 가져와 평균을 계산한다.

```text
적합도 = 4축 사용자 코드 점수 평균
```

0~100 정수로 반올림한다.

함께 반환할 정보:

- fitScore
- matchedAxes
- weakAxes
- reviewEvidenceCount
- verifiedEvidenceCount
- confidenceLabel
- representativeExcerpts 최대 2개

### 5. 신뢰도

리뷰 근거 수와 검증 근거 수를 이용해 별도 표시한다.

초기 기준:

- 0~4건: 낮음
- 5~19건: 보통
- 20건 이상: 높음

이번 샘플 데이터는 실제 리뷰가 아니므로 최종 표시를 항상 `샘플 검증 단계`로 한다.

적합도 점수와 신뢰도를 혼합하지 않는다.

### 6. 결과 화면 연결

현재 `src/app/test/page.tsx`의 테스트 완료 화면 아래에 다음 섹션을 추가한다.

제목:

```text
리뷰 기반 제품 적합도 Beta
```

설명:

```text
리뷰 맥락에서 추출한 제품 특성 코드와 나의 Beauty Code를 비교한 결과입니다.
```

각 제품 카드에 표시:

- 브랜드·제품명
- 제품 카테고리
- 적합도 0~100%
- 신뢰도 또는 `샘플 검증 단계`
- 분석된 리뷰 근거 수
- 잘 맞는 축
- 주의가 필요한 축
- 대표 근거 문장 최대 2개
- `SAMPLE DATA` 배지

점수 높은 순으로 정렬한다.

하단 안내:

```text
현재 결과는 리뷰 분석 구조를 검증하기 위한 샘플 데이터 기반 Beta입니다. 실제 사용감은 피부 상태, 계절, 환경, 사용량에 따라 달라질 수 있습니다.
```

### 7. 향후 실제 AI 연동을 위한 인터페이스

현재 함수와 샘플 데이터를 실제 AI API 결과로 교체할 수 있도록 분리한다.

예:

```ts
export interface ReviewFeatureAnalyzer {
  analyze(reviewText: string): Promise<ReviewFeatureEvidence[]>;
}
```

이번 작업에서는 mock 구현만 제공하고 외부 API 키나 네트워크 호출을 추가하지 않는다.

## 검증

가능한 기존 명령만 실행한다.

1. `npm run lint`
2. `npm run typecheck` — 스크립트가 있을 때만
3. `npm test` — 스크립트가 있을 때만
4. `npm run build`

같은 실패 명령을 반복하지 않는다. Google Fonts 등 기존 네트워크 문제는 코드 결함과 분리해 기록한다.

수동 확인:

1. 20문항 완료
2. 4자리 코드 기존과 동일하게 생성
3. 제품 4개 카드 표시
4. 적합도 순 정렬
5. 리뷰 근거 수와 대표 문장 표시
6. SAMPLE DATA 표시
7. 테스트 다시 하기 정상 동작

## 완료 보고

다음만 보고한다.

- 변경 파일 목록
- 계산식 요약
- 샘플 데이터임을 표시한 위치
- 실행한 검증 명령과 결과
- commit SHA
- Vercel 자동배포 예상 여부

## 커밋 메시지

```text
feat: add review-based product fit beta
```
