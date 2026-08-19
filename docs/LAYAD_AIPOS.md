# LAYAD_AIPOS.md

**Document**: LAYAD AI PROCESS OPERATING STANDARD  
**Project**: LAYAD BEAUTY CODE (`layad16.com`)  
**Version**: v1.0  
**Baseline date**: 2026-08-19  
**Status**: Active Project Baseline  

---

## 1. Purpose

이 문서는 LAYAD BEAUTY CODE 프로젝트에서 사람이 AI와 함께 요구사항 정의, 개발, 데이터베이스, 배포, 운영, 비용통제를 수행할 때 적용하는 단일 기준문서(Single Source of Truth)이다.

AIPOS의 목적은 단순히 AI로 코드를 빠르게 생성하는 것이 아니다. **작은 인원으로도 실제 운영 가능한 서비스를 안전하고 반복 가능하게 만들기 위한 AI 협업 운영표준**을 확립하는 데 있다.

LAYAD 프로젝트에서 확인된 핵심 교훈은 다음과 같다.

> 코드 생성보다 더 어려운 것은 `GitHub → Vercel → Domain → Environment Variables → Supabase → OpenAI → Cost Control → Mobile Runtime`을 하나의 운영 기준선으로 일치시키는 일이다.

따라서 LAYAD의 모든 변경은 기능 구현 전에 운영 기준선과 배포 체계를 먼저 확인한다.

---

## 2. AIPOS 제1원칙 — 비용 지속가능성 우선 (Cost Sustainability First)

> **아무리 우수한 AI 설계와 기능이라도 고객이 지속적으로 감당할 수 없는 비용 구조라면 좋은 시스템이 아니다.**

LAYAD에서는 다음 원칙을 적용한다.

1. OpenAI 호출은 꼭 필요한 경우에만 실행한다.
2. 동일 상품의 분석 결과는 DB에 저장하고 재사용한다.
3. 하나의 상품 분석에서 16개 Beauty Code 적합도 결과를 함께 생성·저장한다.
4. 사용자별 동일 상품 조회 때문에 OpenAI를 반복 호출하지 않는다.
5. 최고 성능 모델을 기본값으로 사용하지 않고 요구 품질을 만족하는 가장 경제적인 모델을 우선한다.
6. 월 운영예산을 사전에 설정하고 한도 도달 시 자동 차단한다.
7. Admin에서 일/주/월 사용량과 비용추세를 확인할 수 있어야 한다.
8. 기능 추가 시 기능가치뿐 아니라 증가하는 AI 비용을 함께 평가한다.

AIPOS 판단 문구:

> **“가장 뛰어난 AI를 만드는 것이 아니라, 고객에게 필요한 수준의 AI를 가장 낮고 예측 가능한 비용으로 지속 제공한다.”**

---

## 3. AI DevOps 핵심 원칙

### 3.1 운영 기준선 우선 (Production Baseline First)

기능 수정 전에 반드시 다음 연결관계를 확인한다.

`Production Domain → Vercel Project → GitHub Repository → Production Branch → Commit SHA → Environment Variables → Supabase Project → OpenAI Project`

이 중 하나라도 불일치하면 기능 수정과 테스트를 중단한다.

LAYAD 운영 기준선(2026-08-19 확인):

- Domain: `layad16.com`, `www.layad16.com`
- Vercel Team: `LAYAD`
- Vercel Project: `layad-makeup-type-test`
- GitHub Repository: `aipos-consulting/layad-beauty-code-recovery`
- Production Branch: `main`
- 기준 Release Branch: `release/production-baseline-20260819`
- Supabase Project: LAYAD
- OpenAI Project: LAYAD

**규칙**: 코드가 정상이어도 실제 Production이 다른 저장소나 다른 Vercel 프로젝트를 보고 있으면 수정 완료로 인정하지 않는다.

### 3.2 운영 소스는 하나만 유지

다음 상태를 금지한다.

- 여러 GitHub 저장소가 동시에 운영 후보인 상태
- 서로 다른 Vercel 프로젝트가 동일 서비스의 Production 후보인 상태
- 과거 저장소에서 자동배포가 계속 살아 있는 상태
- 개발자가 보고 있는 화면과 오너가 테스트하는 실제 도메인이 다른 상태

기존/복구/실험 저장소는 비교·백업 용도로만 사용하고 Production Source는 하나로 고정한다.

### 3.3 변경범위 통제

AI에게 수정 요청할 때는 변경 대상과 변경 금지 대상을 동시에 명시한다.

예:

- 변경: 상품 적합도 분석 API
- 변경 금지: 로고, 승인된 모바일 레이아웃, 테스트 질문 UI, 결과 카드 디자인

AI가 과거 코드를 되살리거나 무관한 UI를 함께 수정하는 경우가 있으므로 **승인된 UI와 Production Baseline은 보호 대상**으로 취급한다.

---

## 4. 환경변수 운영표준

### 4.1 환경변수는 코드와 별도의 Release 구성요소다

코드 배포가 성공했다고 서비스가 준비된 것은 아니다. Production 환경변수가 누락되면 기능은 런타임에서 실패한다.

LAYAD 핵심 서버 환경변수 예:

- `OPENAI_API_KEY`
- `OPENAI_ADMIN_KEY`
- `OPENAI_PROJECT_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### 4.2 Secret 관리 원칙

1. Secret 값은 GitHub 저장소에 저장하지 않는다.
2. Secret 값을 채팅이나 스크린샷에 노출하지 않는다.
3. Secret이 노출되면 즉시 폐기/Rotate 후 새 키로 교체한다.
4. Vercel에는 환경변수 이름과 실제 값을 함께 등록한다.
5. 서버용 Supabase 키는 `sb_secret_...` 또는 올바른 service-role 키를 사용한다.
6. 브라우저용 Publishable key와 서버용 Secret key를 혼용하지 않는다.
7. 환경변수 변경 후에는 반드시 Production Redeploy를 수행한다.

---

## 5. Self-Test First 원칙

운영 기능을 사용자가 직접 눌러 확인하기 전에 서버 Self-Test가 먼저 통과해야 한다.

### 5.1 Self-Test 대상

Release 전 최소한 다음을 자동 확인한다.

- Supabase 설정 존재
- Database 접근 가능
- 주요 분석 테이블 접근 가능
- OpenAI API Key 설정 여부
- OpenAI Cost Guard 설정 여부
- Budget 설정 조회 가능
- Cost API 접근 가능
- 월 예산 잔여 여부

### 5.2 Release Gate

`ready:true`가 확인되기 전에는 오너에게 반복적인 실사용 테스트를 요청하지 않는다.

이는 다음 문제를 방지한다.

- 실패 요청의 DB 중복 적재
- 불필요한 AI 호출 가능성
- 원인이 불분명한 반복 테스트
- 오너의 시간 낭비
- 잘못된 상태를 기능 오류로 오인

---

## 6. 문제 진단 순서

장애가 발생하면 기능코드부터 수정하지 않는다. 아래 순서로 확인한다.

### Gate 1 — Production Baseline

1. 사용자가 접속한 도메인 확인
2. 도메인이 연결된 Vercel 프로젝트 확인
3. Vercel Production Deployment의 GitHub repo/branch/SHA 확인
4. GitHub 최신 기준선과 일치 여부 확인

### Gate 2 — Runtime Configuration

1. Production 환경변수 존재 여부
2. 환경변수 대상이 Production인지 확인
3. Secret/Publishable 키 유형 확인
4. Redeploy 여부 확인

### Gate 3 — External Service

1. Supabase 연결
2. RLS/권한/테이블 접근
3. OpenAI API 연결
4. OpenAI 비용 조회 및 한도

### Gate 4 — Application Flow

1. 요청 생성
2. AI Run 생성
3. Evidence 저장
4. 16유형 Score 저장
5. 사용자 결과 조회
6. Admin 비용/사용량 반영

**규칙**: 앞 Gate가 통과하지 않았으면 다음 Gate의 코드를 수정하지 않는다.

---

## 7. LAYAD 상품 적합도 분석 운영원칙

### 7.1 실행 방식

- 사용자가 상품명을 입력한다.
- 기존 분석 결과가 DB에 존재하면 결과를 즉시 재사용한다.
- 신규 상품만 OpenAI 분석 대상으로 한다.
- 한 번의 AI 분석에서 16개 Beauty Code 적합도를 모두 생성한다.
- 공개적으로 확인 가능한 Evidence만 사용한다.
- Evidence가 최소 기준을 충족하지 못하면 결과를 억지로 생성하지 않는다.

### 7.2 중복 호출 방지

비용 통제를 위해 다음 중복을 차단한다.

- 동일 Submit의 브라우저 이벤트 중복
- 동일 상품의 동시 분석 실행
- 동일 상품의 사용자별 반복 분석
- 실패한 클라이언트 재시도로 인한 불필요한 OpenAI 중복 호출

### 7.3 대량 GPT 시뮬레이션 금지

반복적인 GPT 기반 대량 시뮬레이션/백테스트는 LAYAD 기본 운영방식으로 사용하지 않는다.

검증은 소수의 대표 실제 상품에 대한 End-to-End 테스트로 수행한다.

---

## 8. AI와 사람이 함께 개발할 때 확인된 한계

LAYAD MVP 수행과정에서 AI DevOps는 가능성이 있으나 다음 한계를 가진다는 점을 확인하였다.

### AI가 강한 영역

- 코드 작성과 수정 속도
- 프론트/백엔드/DB/API를 넘나드는 범용성
- 로그·DB·소스 비교를 통한 원인 후보 탐색
- 반복 문서화와 운영 체크리스트 생성

### AI가 반드시 통제되어야 하는 영역

- 오래된 코드나 UI를 다시 되살리는 문제
- 실제 Production과 다른 저장소를 기준으로 수정하는 문제
- 환경변수와 계정 권한을 코드 문제로 오판하는 문제
- 사용자의 승인 범위를 넘어 관련 없는 영역까지 수정하는 문제
- 작업 성공과 Production 성공을 혼동하는 문제

따라서 AI를 단순 코더로 사용하기보다 **명시적인 기준선과 Release Gate를 가진 DevOps 협업자**로 운영한다.

---

## 9. Release Definition of Done

LAYAD 기능은 다음 조건을 모두 만족해야 완료로 인정한다.

1. GitHub Production 기준 저장소/브랜치/SHA 확인
2. Vercel Production 배포 READY
3. `layad16.com`이 해당 Deployment를 바라봄
4. Production 환경변수 Self-Test 통과
5. Supabase 주요 테이블 접근 정상
6. OpenAI 분석 설정 정상
7. Cost Guard 정상
8. 실제 상품 1건 End-to-End 성공
9. 16개 유형 점수 저장 확인
10. Admin에 호출/비용 반영 확인
11. 월 한도 자동 차단 로직 확인
12. 모바일에서 오너 최종 확인

---

## 10. AIPOS 향후 프로젝트 공통 적용사항

LAYAD에서 확인된 다음 규칙은 향후 AIPOS 프로젝트의 기본 DevOps 표준으로 재사용한다.

1. **Production Baseline First**
2. **One Production Source**
3. **Environment Variables Checklist**
4. **Secret Rotation Rule**
5. **Self-Test Before Owner Test**
6. **Release Gate Before Feature Test**
7. **Minimal AI Calls / Cache First**
8. **Hard Cost Cap**
9. **AI Change Scope Control**
10. **Deployment Evidence and Handover Record**

---

## 11. 변경이력

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-19 | LAYAD 기준 AIPOS 문서 최초 생성. Production 기준선 불일치, Vercel 팀/OAuth, OpenAI 환경변수, Supabase Secret/RLS, Cost Guard, Self-Test, Release Gate 및 AI DevOps 통제 원칙 반영 |

---

## 12. 현재 상태 메모 — 2026-08-19

오늘 확인된 주요 개선사항:

- Age/세션/화면전환 문제는 진전 확인
- `layad16.com`의 실제 Vercel Team/Project/GitHub Source 기준선 확인
- OpenAI `API Key / Admin Key / Project ID` Production 등록
- Supabase 서버용 Secret key 교체 및 보안 Rotate 수행
- OpenAI Cost Guard 연결 확인
- `review_analysis_runs` 접근 정상화
- 최종 Self-Test의 Cost Control 설정 조회 문제를 현재 진단 중

다음 Release Gate는 **Self-Test `ready:true` → 실제 상품 1건 End-to-End 성공 → 비용 기록 확인** 순서로 진행한다.
