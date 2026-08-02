# 사용자 상품 등록 기반 제품 적합도 분석 설계

## 1. 변경 목적

고정된 샘플 상품을 결과 화면에 보여주는 방식은 사용하지 않는다.

사용자가 자신의 Beauty Code 결과를 확인한 뒤, 분석하고 싶은 상품을 직접 등록한다.

등록 방법은 다음 중 하나다.

- 상품명 입력
- 상품 링크 입력

두 값 중 하나만 있어도 분석 요청을 생성할 수 있다. 둘 다 입력된 경우에는 상품 링크를 우선 식별 근거로 사용하고 상품명은 보조 정보로 저장한다.

## 2. 사용자 화면 흐름

```text
20문항 테스트 완료
→ Beauty Code 결과 확인
→ 상품 적합도 분석 영역
→ 상품명 또는 상품 링크 입력
→ 입력값 검증
→ 분석 요청 생성
→ 리뷰 수집·AI 맥락 분석
→ 상품별 16유형 적합도 생성
→ 사용자 Beauty Code에 해당하는 적합도 강조 표시
```

## 3. 결과 화면 UI

결과 화면 하단에 다음 섹션을 배치한다.

### 제목

```text
내 상품 적합도 분석
```

### 설명

```text
궁금한 상품명 또는 상품 링크를 등록하면 리뷰 맥락을 분석해 나의 Beauty Code와의 적합도를 확인할 수 있습니다.
```

### 입력 UI

단일 입력창을 사용한다.

```text
상품명 또는 상품 링크
```

예시 placeholder:

```text
예: 프라이머 상품명 또는 https://...
```

버튼:

```text
적합도 분석하기
```

### 입력 판별

- `http://` 또는 `https://`로 시작하면 상품 링크로 판별
- 그 외 문자열은 상품명으로 판별
- 앞뒤 공백 제거
- 빈 값 제출 금지
- URL은 `http` 또는 `https`만 허용
- `javascript:`, `data:` 등 위험한 scheme 금지
- 최대 길이 제한 적용
  - 상품명: 200자
  - URL: 2,000자

## 4. 분석 상태 UI

### A. 입력 전

```text
분석할 상품을 등록해 주세요.
```

### B. 요청 접수

```text
상품 분석 요청이 접수되었습니다.
```

표시 항목:

- 등록값
- 등록 유형: 상품명 또는 상품 링크
- 사용자 Beauty Code
- 요청 시각
- 상태: 분석 준비 중

### C. 리뷰 데이터 부족

```text
분석 가능한 리뷰가 충분하지 않습니다.
```

임의 점수를 생성하지 않는다.

### D. 분석 완료

카드 배경을 연한 블러시 핑크로 강조한다.

표시 항목:

1. 상품 식별 정보
2. 내 유형 배지
3. 사용자 Beauty Code
4. 해당 유형 적합도 0~100%
5. 분석 리뷰 수
6. 신뢰도
7. 잘 맞는 축
8. 주의 축
9. 대표 리뷰 근거
10. 분석 버전과 갱신일

## 5. 상품명·링크 표시 원칙

- 상품 링크만 등록되었으면 화면에는 `등록한 상품 링크`라는 링크 텍스트를 표시한다.
- 상품명만 등록되었으면 입력된 상품명을 `사용자 입력 상품명`으로 표시한다.
- 상품명과 링크가 모두 있으면 링크를 상품 식별 기준으로 사용한다.
- 공식 페이지에서 확인되기 전에는 입력 상품명을 공식 상품명처럼 표현하지 않는다.
- 긴 URL 문자열을 화면에 그대로 노출하지 않는다.
- 외부 링크는 새 탭에서 열고 `rel="noopener noreferrer"`를 사용한다.

## 6. 데이터 모델

```ts
type ProductInputType = "name" | "url";
type ProductAnalysisStatus =
  | "submitted"
  | "collecting_reviews"
  | "insufficient_reviews"
  | "analyzing"
  | "completed"
  | "failed";

type ProductAnalysisRequest = {
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
```

분석 완료 후 기존 `ProductTypeFit` 구조를 사용한다.

```ts
type ProductTypeFit = {
  productId: string;
  beautyCode: BeautyTypeCode;
  fitScore: number;
  reviewEvidenceCount: number;
  confidenceLabel: string;
  matchedAxes: AxisKey[];
  weakAxes: AxisKey[];
  representativeExcerpts: string[];
  analysisVersion: string;
  updatedAt: string;
};
```

상품 하나가 분석 완료되면 16개 Beauty Code 적합도 레코드를 생성한다.

## 7. AI 분석 처리 흐름

```text
사용자 상품 등록
→ 상품 식별
→ 리뷰 원문 확보
→ 리뷰 문장·맥락 분리
→ O/D·G/M·P/C·V/E 특성 코드 추출
→ 감성·강도·조건·신뢰도 저장
→ 상품 축별 프로필 생성
→ 16유형 적합도 생성
→ 사용자 Beauty Code 적합도 조회
```

실제 AI API와 리뷰 수집이 연결되지 않은 단계에서는 `분석 준비 중` 상태까지만 제공하고 가짜 적합도 점수를 만들지 않는다.

## 8. MVP 구현 단계

### 단계 1 — 사용자 등록 UI

- 결과 화면에 단일 입력창 추가
- 상품명·URL 자동 판별
- 입력 검증
- 분석 요청 상태 카드 표시
- 브라우저 상태 또는 임시 저장소 사용 가능

### 단계 2 — 요청 저장

- 회원 로그인 시 계정에 요청 저장
- 비회원은 현재 세션에서만 유지
- 서버 DB 연결 후 `ProductAnalysisRequest` 저장

### 단계 3 — 리뷰 수집과 AI 분석

- 리뷰 출처별 수집 권한과 이용조건 확인
- 리뷰 원문 AI 맥락 분석
- 특성 코드 및 분석 근거 저장
- 상품별 16유형 적합도 갱신

### 단계 4 — 결과 제공

- 사용자 유형 적합도 카드 강조
- 리뷰 수와 신뢰도 표시
- 분석 근거 표시
- 결과 재조회 지원

## 9. 절대 금지

- 입력한 상품명만으로 임의 적합도 생성 금지
- 상품 URL 문자열을 해시해 점수 생성 금지
- 실제 리뷰 분석 없이 AI 분석 완료라고 표시 금지
- 리뷰 수가 부족한데 높은 신뢰도로 표시 금지
- 상품 효능 또는 피부 진단 보장 금지

## 10. 완료 기준

- 고정 샘플 상품이 결과 화면에 표시되지 않는다.
- 사용자가 상품명 또는 링크를 입력할 수 있다.
- 입력값이 이름인지 URL인지 자동 판별된다.
- 잘못된 URL과 빈 입력이 차단된다.
- 요청 상태가 화면에 표시된다.
- 사용자 Beauty Code가 요청 정보에 연결된다.
- 실제 리뷰 분석이 없을 때 임의 적합도는 표시하지 않는다.
- 향후 AI 분석 완료 시 16유형 적합도 구조와 연결할 수 있다.
