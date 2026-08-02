# Codex 개발 작업: 사용자 상품 등록형 적합도 분석 UI

## 목표

기존 결과 화면의 고정 샘플 상품 카드를 제거하고, 사용자가 상품명 또는 상품 링크를 직접 입력해 적합도 분석 요청을 생성하는 UI로 변경한다.

이번 작업은 사용자 등록 UI와 요청 상태 관리까지만 구현한다. 실제 리뷰 수집, 외부 AI API 호출, 적합도 점수 생성은 포함하지 않는다.

반드시 `docs/PRODUCT_FIT_USER_REGISTRATION_DESIGN.md`를 먼저 읽고 아래 범위만 구현한다.

## 절대 유지 사항

- 기존 20문항과 선택지 변경 금지
- 기존 O/D, G/M, P/C, V/E 계산 변경 금지
- Beauty Code 순서 `O/D → G/M → P/C → V/E` 유지
- 기존 테스트 진행, 이전 질문, 결과 확인, 다시 하기 기능 유지
- 임의 적합도 생성 금지
- 상품명 또는 URL을 점수로 변환하는 가짜 계산 금지
- 실제 리뷰 분석 없이 `AI 분석 완료` 표시 금지

## 제거 범위

현재 결과 화면에서 다음을 제거한다.

- `SAMPLE_PRODUCTS` 사용
- `SAMPLE_REVIEW_EVIDENCES` 사용
- `getFitsForUserType` 기반 샘플 적합도 카드
- `SAMPLE DATA` 배지
- 고정 상품명 또는 고정 상품 카드

`src/lib/review-product-fit.ts`의 16유형 계산 타입과 함수는 향후 연결을 위해 유지할 수 있다. 단, 결과 화면에서 샘플 데이터는 사용하지 않는다.

## 1. 상태 모델

`src/lib/product-analysis-request.ts`를 새로 만들거나 현재 구조에 분리한다.

```ts
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
```

이번 단계의 새 요청 상태는 항상 `submitted`로 생성한다.

## 2. 입력 판별과 검증 함수

순수 함수로 구현한다.

```ts
classifyProductInput(value: string): ProductInputType
validateProductInput(value: string): { valid: boolean; message?: string }
createProductAnalysisRequest(value: string, beautyCode: BeautyTypeCode): ProductAnalysisRequest
```

규칙:

- 앞뒤 공백 제거
- 빈 값 제출 금지
- `http://` 또는 `https://`로 시작하면 `url`
- 그 외는 `name`
- 상품명 최대 200자
- URL 최대 2,000자
- URL은 `http:` 또는 `https:`만 허용
- `javascript:`, `data:`, `file:` 등 위험한 scheme 차단
- URL 판별값은 `new URL()`로 검증하고 예외를 안전하게 처리
- 요청 ID는 브라우저에서 충돌 가능성이 낮은 방식으로 생성
- 생성 시각은 ISO 문자열로 저장

## 3. 결과 화면 UI

`src/app/test/page.tsx`의 Beauty Code 결과 아래에 다음 섹션을 추가한다.

### 제목

```text
내 상품 적합도 분석
```

### 설명

```text
궁금한 상품명 또는 상품 링크를 등록하면 리뷰 맥락 분석을 통해 나의 Beauty Code와의 적합도를 확인할 수 있습니다.
```

### 입력창

- 단일 텍스트 입력
- 라벨: `상품명 또는 상품 링크`
- placeholder: `예: 프라이머 상품명 또는 https://...`
- 모바일에서 가로 넘침이 없어야 함
- Enter 제출 지원

### 버튼

```text
적합도 분석하기
```

- 빈 입력일 때 비활성화 가능
- 제출 중 중복 클릭 방지

## 4. 제출 후 요청 상태 카드

유효한 입력 제출 시 결과 화면 안에 상태 카드를 표시한다.

카드 표시 항목:

- `상품 분석 요청이 접수되었습니다.`
- 등록값
- 등록 유형: `상품명` 또는 `상품 링크`
- 내 Beauty Code
- 요청 시각
- 상태: `분석 준비 중`

표시 원칙:

- 상품 링크 입력 시 긴 URL 전체를 노출하지 않고 `등록한 상품 링크` 텍스트로 표시
- 링크는 새 탭에서 열기
- `target="_blank"`와 `rel="noopener noreferrer"` 적용
- 상품명 입력 시 `사용자 입력 상품명` 라벨과 입력값 표시
- 공식 상품명으로 확정된 것처럼 표현하지 않음
- 카드 배경은 연한 블러시 핑크, 테두리는 LAYAD 핑크
- `내 유형 {finalCode}` 배지 표시
- 적합도 숫자는 표시하지 않음
- 리뷰 수와 신뢰도도 아직 표시하지 않음

안내 문구:

```text
현재는 분석 요청 접수 단계입니다. 리뷰 데이터 수집과 AI 맥락 분석이 완료되기 전에는 적합도 점수를 표시하지 않습니다.
```

## 5. 요청 목록

한 세션에서 여러 상품을 등록할 수 있도록 요청 배열로 관리한다.

- 최신 요청이 위에 표시
- 같은 값의 연속 중복 제출은 차단하거나 기존 요청을 안내
- 비회원은 현재 브라우저 세션에서만 유지
- 이번 작업에서는 DB, localStorage, 계정 저장을 추가하지 않는다
- 테스트 다시 하기를 누르면 요청 목록도 초기화한다

## 6. 향후 16유형 적합도 결과 UI

실제 리뷰 수집과 AI 분석이 연결되어 `completed` 상태가 되면, 상품 하나에 대해 16개 Beauty Code 적합도를 모두 표시할 수 있어야 한다.

표시 대상 16유형:

```text
OGPV, OGPE, OGCV, OGCE,
OMPV, OMPE, OMCV, OMCE,
DGPV, DGPE, DGCV, DGCE,
DMPV, DMPE, DMCV, DMCE
```

필수 UI 규칙:

- 16유형 전체를 동일한 그리드 또는 표 구조로 표시한다.
- 각 유형에는 `Beauty Code`와 `적합도 %`를 표시한다.
- 현재 사용자의 `finalCode`와 일치하는 유형만 하이라이트한다.
- 하이라이트 유형은 연한 블러시 핑크 배경, LAYAD 핑크 테두리, 진한 적합도 숫자를 사용한다.
- 하이라이트 유형에 `내 유형` 배지를 표시한다.
- 예: 사용자가 `OGPV`라면 16개 중 `OGPV` 셀 또는 행만 강조한다.
- 색상만으로 구분하지 말고 `내 유형` 텍스트를 반드시 함께 표시한다.
- 나머지 15유형은 중립적인 흰색 또는 연한 회색 배경으로 표시한다.
- 모바일에서는 2열 이하 또는 가로 스크롤 없는 반응형 구조를 사용한다.
- 사용자의 유형을 목록 맨 앞으로 이동하지 않는다. 16유형의 고정 순서는 유지하고 해당 위치에서만 강조한다.
- 사용자 유형 적합도만 별도 요약 카드로 한 번 더 보여줄 수 있으나, 16유형 목록의 하이라이트는 반드시 유지한다.

이번 단계에서는 `completed` 분석 결과가 없으므로 16유형 점수 UI를 가짜 데이터로 렌더링하지 않는다. 다만 컴포넌트와 타입 경계는 향후 `ProductTypeFit[]` 16건을 받아 표시할 수 있도록 설계한다.

권장 컴포넌트 예시:

```ts
type ProductTypeFitGridProps = {
  fits: ProductTypeFit[];
  userBeautyCode: BeautyTypeCode;
};
```

하이라이트 판별:

```ts
const isUserType = fit.beautyCode === userBeautyCode;
```

## 7. 향후 연결 경계

향후 서버 연결을 위해 아래 인터페이스를 둘 수 있다.

```ts
export interface ProductAnalysisRequester {
  submit(request: ProductAnalysisRequest): Promise<ProductAnalysisRequest>;
}
```

이번에는 네트워크 호출 없는 메모리 구현만 사용한다.

완료 상태가 생기면 기존 `ProductTypeFit`의 16개 적합도와 연결할 수 있도록 타입 의존성을 명확히 유지한다.

## 8. 오류 표시

입력 오류는 입력창 가까이에 한글로 표시한다.

예:

- `상품명 또는 상품 링크를 입력해 주세요.`
- `상품명은 200자 이하로 입력해 주세요.`
- `상품 링크는 http:// 또는 https:// 형식이어야 합니다.`
- `유효하지 않은 상품 링크입니다.`

오류가 있으면 요청을 생성하지 않는다.

## 9. 단위 테스트

현재 프로젝트에 테스트 스크립트가 있으면 최소 다음을 검증한다.

- 상품명 판별
- HTTP URL 판별
- HTTPS URL 판별
- 빈 입력 차단
- 위험 scheme 차단
- 잘못된 URL 차단
- 상품명 200자 경계
- URL 2,000자 경계
- 요청에 사용자 Beauty Code 연결
- 요청 상태가 `submitted`
- 16유형 결과 UI에서 사용자 Beauty Code 한 건만 하이라이트됨
- 다른 15유형에는 `내 유형` 배지가 표시되지 않음

테스트 스크립트가 없으면 새 외부 의존성을 설치하지 말고, 구현 및 수동 검증 결과만 기록한다.

## 10. 검증 명령

프로젝트에 존재하는 명령만 각각 한 번 실행한다.

```text
npm run lint
npm run typecheck  # 스크립트가 있을 때만
npm test           # 스크립트가 있을 때만
npm run build
```

같은 실패 명령을 반복하지 않는다.

## 11. 수동 확인

1. 20문항 완료
2. 기존 Beauty Code 정상 표시
3. 고정 상품 카드가 보이지 않음
4. 상품명 입력 후 요청 카드 생성
5. URL 입력 후 요청 카드 생성
6. 위험 URL 차단
7. 빈 입력 차단
8. 여러 요청 등록 가능
9. 최신 요청이 위에 표시
10. 적합도 점수가 생성되지 않음
11. 테스트 다시 하기 시 요청 초기화
12. 모바일에서 입력창과 상태 카드가 깨지지 않음
13. 향후 완료 결과 테스트 데이터 사용 시 16유형 모두 표시됨
14. 16유형 중 사용자 finalCode 한 건만 배경색·테두리·`내 유형` 배지로 강조됨
15. 16유형 고정 순서가 유지됨

## 완료 보고

다음만 보고한다.

- 변경 파일 목록
- 제거한 샘플 데이터 연결 위치
- 입력 판별·검증 규칙
- 요청 상태 UI 위치
- 16유형 결과 하이라이트 컴포넌트 위치
- 실행한 검증 명령과 결과
- 임의 적합도를 생성하지 않았다는 확인
- commit SHA
- Vercel 자동배포 예상 여부

## 커밋 메시지

```text
feat: add user product analysis request UI
```
