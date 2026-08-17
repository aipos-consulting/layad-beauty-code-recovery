# LAYAD AIPOS

## 1. 문서 목적

이 문서는 LAYAD Beauty Code MVP의 단일 운영 기준문서입니다. 요구사항, 개발, 형상관리, 데이터베이스, 배포, 검증, 장애 대응, 인수인계의 기준을 하나로 고정하여 동일한 혼선이 반복되지 않도록 합니다.

AIPOS는 AI PROCESS OPERATING STANDARD의 약자로, AI 기반 MVP 개발 과정의 의사결정·작업·검증·증적을 연결하여 다른 개발자나 AI 에이전트가 이어받아도 현재 상태를 재구성할 수 있도록 하는 운영 표준입니다.

## 2. Source of Truth

2026-08-17 기준 운영 기준은 다음과 같습니다.

- GitHub Organization: `aipos-consulting`
- Production Repository: `aipos-consulting/layad-beauty-code-recovery`
- Production Branch: `main`
- 최신 UI 복구 작업 브랜치: `recovery/owner-ui-20260817`
- 해당 브랜치 마지막 UI 커밋: `f8cd87704934e88652bdea34a4adb9d4f4918b6d`
- 최신 UI를 main에 병합한 커밋: `eeadd0210ae5384d7efb9a3046df0f6bfa653276`
- Vercel Project: `layad-makeup-type-test`
- Framework Preset: `Next.js`
- Root Directory: repository root (`./` 또는 빈 값)
- Supabase Project ID: `mbunlzldwpjgichedzfa`
- Supabase Region: Tokyo (`ap-northeast-1`)

이 항목 중 하나라도 실제 화면과 다르면 개발이나 배포를 진행하기 전에 먼저 기준을 재확인합니다.

## 3. LAYAD MVP 개발 표준 흐름

요구사항 접수
→ ChatGPT/AIPOS 기준화
→ 작업 브랜치 생성 또는 기존 작업 브랜치 확인
→ Codex/개발 작업
→ Preview 배포 및 화면 검증
→ 사용자 승인
→ `main` 병합
→ Vercel Production 배포
→ Production 화면 확인
→ Supabase 실제 저장 확인
→ Daily PM 기록
→ AIPOS 기준 변경 시 본 문서 갱신

화면 수정이나 코드 작성만 끝난 상태는 완료가 아닙니다. Production 화면과 필요한 DB 저장까지 확인되어야 완료로 판정합니다.

## 4. AIPOS MVP Release Gate

### Gate 0. 작업 시작 전 Source of Truth Check

다음을 모두 확인합니다.

1. GitHub Organization
2. Repository
3. 작업 Branch
4. Production Branch
5. Latest Approved Commit
6. Vercel Project
7. Framework Preset
8. Supabase Project
9. 필요한 Environment Variables

확인이 끝나기 전에는 Repository 변경, Branch 변경, Production 배포, DB 마이그레이션을 수행하지 않습니다.

### Gate 1. 개발 완료

- 요구사항이 코드에 반영되었는지 확인
- 기존 기능이 훼손되지 않았는지 확인
- 작업 브랜치와 커밋 SHA 기록
- 비밀키와 환경변수가 GitHub에 포함되지 않았는지 확인

### Gate 2. Preview 검증

- Preview URL에서 실제 화면 확인
- 모바일/데스크톱 주요 화면 확인
- 결과 화면과 주요 사용자 흐름 확인
- 사용자의 승인 여부 기록

### Gate 3. Main 승인

- 승인된 작업만 `main`에 병합
- 작업 브랜치가 `main`보다 앞서 있는 경우 compare 후 병합
- 병합 전에 오늘의 최신 UI/기능이 어느 브랜치에 있는지 반드시 확인
- `main` 커밋 SHA 기록

### Gate 4. Production 배포

Vercel에서 반드시 확인합니다.

- Connected Git Repository가 Source of Truth와 일치
- Production Branch = `main`
- Framework Preset = `Next.js`
- Root Directory = repository root
- Build/Output/Install Command는 특별한 사유가 없는 한 Override OFF
- Build Log의 clone 대상 Repository와 Commit SHA 확인
- 배포 상태가 `Ready`인 것만으로 성공 판정하지 않음
- 실제 URL에서 페이지가 렌더링되는지 확인

### Gate 5. Supabase 검증

- Project ID 확인
- 필요한 migration 적용 여부 확인
- 모든 public 업무 테이블의 RLS 상태 확인
- 브라우저에 service role key 노출 금지
- `SUPABASE_SERVICE_ROLE_KEY`는 Vercel server-side 환경변수에만 저장
- 실제 사용자 흐름 1건을 실행하여 DB 저장 확인
- 저장 확인 항목: 세션, 20문항 응답, Beauty Code, 상품 분석 요청 등 해당 기능 범위

### Gate 6. 완료 및 인수인계

- Daily PM에 작업/오류/조치/커밋/배포 상태 기록
- 기준이 바뀌었으면 본 `LAYAD_AIPOS.md` 갱신
- 다음 작업자가 처음 읽어도 현재 운영 기준을 알 수 있어야 완료

## 5. 2026-08-17 재발방지 규칙

### 사건 요약

1. Supabase 신규 LAYAD 프로젝트를 점검하고 기존 GitHub migration을 적용했습니다.
2. Vercel 환경변수에 Supabase URL, publishable key, service role key를 연결했습니다.
3. Vercel이 잘못된/이전 Repository 또는 이전 배포 상태를 참조하면서 404가 발생했습니다.
4. Vercel Framework Preset이 `Other`로 설정되어 있어 배포가 `Ready`여도 실제 Next.js 산출물이 생성되지 않는 문제가 있었습니다.
5. 이를 `Next.js`로 수정하여 앱 배포를 정상화했습니다.
6. 이후 Production에 표시된 UI가 당일 수정본이 아닌 과거 UI임을 발견했습니다.
7. 최신 UI가 `main`이 아니라 `recovery/owner-ui-20260817` 브랜치에 존재함을 확인했습니다.
8. 해당 브랜치는 `main`보다 19개 커밋 앞서 있었고, 검토 후 최신 UI 상태를 유지하는 merge commit으로 `main`에 반영했습니다.
9. 최신 UI 병합 커밋은 `eeadd0210ae5384d7efb9a3046df0f6bfa653276`입니다.

### 재발방지 핵심

- Repository 이름이 비슷하다는 이유로 추정하지 않습니다.
- `main`이 최신이라고 가정하지 않습니다.
- Production 배포 전 반드시 `git compare` 또는 브랜치 최신 커밋을 확인합니다.
- Vercel `Ready`만 보고 성공으로 판단하지 않습니다.
- Build Log에서 실제 clone Repository와 Commit SHA를 확인합니다.
- UI 승인본과 Production 화면을 직접 대조합니다.
- DB 연결 작업은 Production UI 버전 확인 후 실제 저장 테스트로 끝냅니다.

## 6. Supabase 운영 구조

2026-08-17 기준 운영 스키마에는 다음 주요 테이블이 있습니다.

- `test_sessions`
- `test_answers`
- `product_analysis_requests`
- `products`
- `review_sources`
- `reviews`
- `review_analysis_runs`
- `review_features`
- `product_axis_profiles`
- `product_type_fits`
- `admin_data_audit_logs`

개인정보 최소화 원칙을 유지합니다. 이름, 이메일, 전화번호, 원 IP, 생년월일, 정확한 위치좌표를 애플리케이션 DB에 저장하지 않습니다.

## 7. 브랜치 운영 원칙

- `main`: Production 승인본
- 기능/디자인/복구 작업: 별도 branch
- Preview 검증 전 main 직접 수정은 지양
- 긴급 수정도 원칙적으로 branch → 검증 → main 반영
- 작업 종료 시 미병합 branch가 있는지 확인
- 다음 날 작업 시작 시 가장 먼저 `main`과 활성 branch의 차이를 확인

## 8. Daily PM 최소 기록 항목

매 작업일 다음을 기록합니다.

- 날짜
- 목표
- 완료 작업
- 주요 의사결정
- Repository / Branch / Commit
- Vercel Production 상태
- Supabase 변경 및 검증 상태
- 장애/오류와 원인
- 재발방지 조치
- 미완료 항목
- 다음 단계

## 9. 정부지원사업 MVP 표준화 원칙

LAYAD는 AIPOS Consulting의 정부지원사업 MVP 개발 표준 프로세스를 검증하는 기준 프로젝트로 관리합니다.

표준 구성은 다음과 같습니다.

`PROJECT_AIPOS.md + Daily PM + GitHub + Supabase + Vercel + Release Gate`

향후 고객 MVP도 착수 시 이 구조를 기본 생성하고, 모든 작업은 요구사항부터 Production 및 DB 검증까지 추적 가능하도록 운영합니다.

---

최종 갱신: 2026-08-17
상태: 운영 기준 적용