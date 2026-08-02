# Codex 작업지시 — 리뷰 맥락 기반 AI 제품 적합도 분석

## 목적

LAYAD BEAUTY CODE 결과 화면에 제품 적합도 분석 Beta를 추가한다. 적합도는 제품 설명을 임의로 코드화하는 방식이 아니라, 사용자 리뷰 원문의 맥락을 AI로 분석해 특성 코드를 누적한 결과를 바탕으로 계산해야 한다.

## 핵심 원칙

1. 단순 키워드 빈도만 세지 않는다.
2. 리뷰 문장과 앞뒤 맥락을 해석해 특성 표현을 추출한다.
3. 추출된 특성을 O/D, G/M, P/C, V/E 코드에 매핑한다.
4. 코드와 함께 긍정/부정, 강도, 조건, 사용 시점, 피부 상태, 계절·환경을 저장할 수 있어야 한다.
5. 제품별 최종 코드 하나만 고정하지 않는다.
6. 리뷰에서 누적된 근거 비율로 제품 특성 프로필을 만든다.
7. 사용자 Beauty Code와 제품 특성 프로필을 비교해 적합도를 계산한다.
8. 리뷰 수와 분석 신뢰도를 함께 표시한다.
9. 리뷰 근거가 없는 제품은 확정 적합도를 표시하지 않는다.
10. 실제 AI API 연동 전에는 `DEMO / SAMPLE DATA` 상태를 명확히 표시한다.

## 이번 구현 범위

이번 작업은 외부 리뷰 수집이나 실제 AI API 호출까지 구현하지 않는다. 다음의 데이터 구조, 순수 함수, 샘플 데이터, 결과 화면 Beta만 구현한다.

### 1. 리뷰 분석 데이터 구조

`src/lib/review-analysis.ts` 또는 프로젝트 구조에 맞는 위치에 다음 타입을 정의한다.

- ProductReview
  - id
  - productId
  - source
  - originalText
  - createdAt
  - reviewerSkinType(optional)
  - season(optional)
  - usageContext(optional)

- ReviewEvidence
  - reviewId
  - productId
  - excerpt
  - axis: OD | GM | PC | VE
  - code: O | D | G | M | P | C | V | E
  - sentiment: positive | negative | neutral
  - strength: 0~1
  - condition(optional)
  - confidence: 0~1
  - analyzerVersion
  - status: sample | ai-analyzed | human-reviewed

- ProductReviewProfile
  - productId
  - reviewCount
  - evidenceCount
  - axisScores
  - confidence
  - representativeEvidence
  - analysisStatus

### 2. 리뷰 근거 집계 함수

순수 함수로 구현한다.

- `buildProductReviewProfile(evidence)`
- 같은 축과 코드의 긍정 근거를 누적한다.
- 부정 근거는 반대 코드로 자동 변환하지 말고 해당 코드의 감점 근거로 처리한다.
- confidence와 strength를 가중치로 반영한다.
- 축별 O/D, G/M, P/C, V/E 비율을 0~100으로 정규화한다.
- 리뷰 수가 부족하면 confidence를 낮게 계산한다.

예시 출력:

```ts
{
  OD: { O: 28, D: 72 },
  GM: { G: 84, M: 16 },
  PC: { P: 31, C: 69 },
  VE: { V: 57, E: 43 }
}
```

### 3. 사용자 코드와 제품 프로필 적합도 함수

- `calculateReviewBasedFit(userCode, productProfile)`
- 사용자 코드 네 글자와 각 축의 제품 리뷰 비율을 비교한다.
- 기본은 4축 동일 가중치로 계산한다.
- 반환값:
  - score: 0~100
  - matchedAxes
  - axisDetails
  - confidence
  - reviewCount
  - reasons

적합도 점수와 confidence는 분리한다.

예:

```ts
{
  score: 81,
  confidence: "medium",
  reviewCount: 126,
  reasons: [
    "건조 관련 긍정 리뷰가 많이 축적됨",
    "글로우 표현 관련 긍정 맥락이 우세함"
  ]
}
```

### 4. 샘플 제품 4개

아래 제품을 sample/demo 상태로 등록한다.

- 아이레놀 쌩얼크림
- 달바 톤업 선크림
- 바닐라코 프라임 프라이머
- 토리든 다이브인 히알루론산 세럼

각 제품당 소수의 샘플 ReviewEvidence를 작성한다. 샘플 근거는 실제 외부 리뷰를 인용하지 말고, 구조 검증용 가상 문장으로 작성한다. 실제 사용자 리뷰인 것처럼 표시하지 않는다.

### 5. 결과 화면 Beta

현재 `/test` 완료 화면 아래에 `리뷰 기반 제품 적합도 Beta` 섹션을 추가한다.

각 제품 카드에 표시:

- 제품명
- 적합도 점수
- 리뷰 기반 분석 표시
- 분석 리뷰 수
- 신뢰도
- 일치 축
- 대표 근거 1~2개
- `SAMPLE DATA` 배지

안내 문구:

> AI가 사용자 리뷰의 맥락에서 제품 특성을 추출해 Beauty Code와의 적합도를 분석하는 구조를 검증 중입니다. 현재 표시되는 결과는 샘플 데이터 기반 Beta이며 실제 리뷰 분석 결과가 아닙니다.

### 6. 사용자 피드백 UI

각 제품 카드에 다음 버튼을 추가한다.

- 맞아요
- 보통이에요
- 안 맞아요

이번 단계에서는 서버 저장 없이 화면 상태로만 선택할 수 있게 한다. 실제 저장은 다음 단계로 남긴다.

## 금지 사항

- 특정 제품의 효능을 보장하지 않는다.
- 의학적 진단처럼 표현하지 않는다.
- 리뷰가 없는 제품에 임의의 확정 점수를 주지 않는다.
- 단순 제품 코드 4자리 일치만으로 적합도를 계산하지 않는다.
- 실제 AI API를 연동하지 않았는데 `AI가 실제 리뷰를 분석했다`고 표시하지 않는다.
- 회원가입, 데이터베이스, 관리자 Dashboard를 수정하지 않는다.
- 기존 20문항과 Beauty Code 계산 로직을 변경하지 않는다.

## 검증

구현 후 다음을 각각 한 번 실행한다.

- `npm run lint`
- 사용 가능한 경우 `npm run typecheck`
- 사용 가능한 경우 `npm test`
- `npm run build`

명령이 없으면 새 패키지를 설치하지 말고 해당 사실을 보고한다. 실패한 명령은 반복하지 않고 첫 원인을 기록한다.

## 예상 산출물

- `src/lib/review-analysis.ts`
- `src/data/sample-review-evidence.ts`
- 필요한 경우 테스트 파일
- `src/app/test/page.tsx` 결과 화면 Beta 섹션
- `docs/REVIEW_AI_PRODUCT_FIT_WORKLOG.md`

## 완료 기준

1. 리뷰 Evidence에서 제품 프로필이 계산된다.
2. 사용자 Beauty Code에 따라 제품 적합도 순서가 달라진다.
3. 점수와 신뢰도가 분리되어 표시된다.
4. 근거 문장이 표시된다.
5. 샘플 데이터임이 명확하다.
6. 기존 20문항 테스트가 그대로 동작한다.
7. Vercel production build가 성공한다.
