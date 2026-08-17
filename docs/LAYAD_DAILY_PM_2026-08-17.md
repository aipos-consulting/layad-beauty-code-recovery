# LAYAD Daily PM — 2026-08-17

## 1. 오늘의 목표

- aipos-consulting 조직의 LAYAD Supabase 신규 프로젝트 상태 점검
- 기존 LAYAD 소스와 Supabase DB 구조 연결
- Vercel 환경변수 연결 및 Production 배포 정상화
- 당일 수정한 최신 LAYAD UI를 Production에 반영
- 재발방지 운영 프로세스를 AIPOS 기준으로 정리

## 2. 완료 작업

### Supabase

- LAYAD Project ID 확인: `mbunlzldwpjgichedzfa`
- Region: Tokyo (`ap-northeast-1`)
- 기존 GitHub migration을 검토하여 운영용 스키마 적용
- DEMO seed migration은 운영 DB에 적용하지 않음
- 주요 업무 테이블 11개 구성
- RLS 활성화 확인
- service role key는 브라우저에 노출하지 않고 Vercel server-side 환경변수로 관리

### GitHub

- 기준 Repository 확정: `aipos-consulting/layad-beauty-code-recovery`
- Production Branch: `main`
- 당일 UI 작업이 `recovery/owner-ui-20260817` 브랜치에 존재함을 확인
- 해당 브랜치의 마지막 UI 커밋: `f8cd87704934e88652bdea34a4adb9d4f4918b6d`
- `main` 대비 19개 커밋 ahead 상태 확인
- 최신 UI 상태를 유지하여 `main`에 병합
- 최신 UI 병합 커밋: `eeadd0210ae5384d7efb9a3046df0f6bfa653276`

### Vercel

- Connected Git Repository를 `aipos-consulting/layad-beauty-code-recovery`로 재연결
- Supabase 환경변수 등록
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Framework Preset이 `Other`였던 문제 발견
- Framework Preset을 `Next.js`로 수정
- Root Directory는 repository root 기준 유지
- 최신 `main` 배포 성공 확인
- 최신 UI가 실제 Production 화면에 반영된 것을 사용자 확인

## 3. 주요 장애 및 원인

### 장애 A — Vercel 404 NOT_FOUND

증상:
- 배포 상태는 `Ready`였으나 접속 시 404 발생
- Build Log에 deployable output이 없다는 경고 발생

원인:
- Vercel Framework Preset이 `Other`로 설정됨
- 이전 Repository/배포 기준이 남아 있어 잘못된 소스를 재배포하는 과정이 있었음

조치:
- Connected Git Repository 재확인
- Framework Preset을 `Next.js`로 수정
- 새 커밋을 통해 신규 Production build 수행

### 장애 B — 배포는 성공했으나 과거 UI 표시

증상:
- 사이트는 정상 열렸으나 당일 수정한 화면이 아닌 이전 버전 표시

원인:
- 당일 수정사항이 `main`이 아니라 `recovery/owner-ui-20260817`에 존재
- `main`이 최신 승인본이라고 가정하여 과거 UI를 Production에 배포

조치:
- branch 목록 및 commit history 조사
- `main`과 recovery branch 비교
- recovery branch가 19 commits ahead임을 확인
- 최신 UI를 `main`에 병합 후 Production 재배포

## 4. 오늘의 핵심 교훈

1. Repository 이름만 보고 운영 기준을 추정하지 않는다.
2. `main`이 최신이라고 가정하지 않는다.
3. 개발 시작 전 Source of Truth를 먼저 확인한다.
4. Vercel `Ready`는 실제 서비스 정상의 충분조건이 아니다.
5. Build Log에서 실제 clone Repository와 Commit SHA를 확인한다.
6. Preview에서 승인한 UI와 Production UI를 직접 대조한다.
7. Supabase 연결은 환경변수 등록으로 끝내지 않고 실제 DB 저장 확인까지 완료해야 한다.
8. 작업 완료의 정의는 `코드 수정`이 아니라 `Production + DB 검증 + 기록`까지이다.

## 5. Source of Truth — 2026-08-17 종료 시점

- GitHub Organization: `aipos-consulting`
- Repository: `aipos-consulting/layad-beauty-code-recovery`
- Production Branch: `main`
- Latest UI Merge Commit: `eeadd0210ae5384d7efb9a3046df0f6bfa653276`
- Vercel Project: `layad-makeup-type-test`
- Framework: `Next.js`
- Supabase Project ID: `mbunlzldwpjgichedzfa`
- Supabase Region: Tokyo
- 기준문서: `/LAYAD_AIPOS.md`

## 6. AIPOS Release Gate 적용

향후 LAYAD 작업은 다음 순서로 완료 판정합니다.

`요구사항 → AIPOS 기준화 → 작업 Branch → 개발 → Preview 검증 → 사용자 승인 → main 병합 → Production 배포 → Production 화면 확인 → Supabase 저장 검증 → Daily PM → AIPOS 변경 반영`

이 흐름을 정부지원사업 MVP 개발의 기본 운영모델로 확장합니다.

## 7. 미완료 / 다음 단계

- 실제 LAYAD 테스트 1건을 수행하여 Supabase의 `test_sessions`, `test_answers`, Beauty Code 저장 상태 최종 확인
- 상품 분석 요청까지 연계되는 경우 `product_analysis_requests` 저장 확인
- 이후 기능 개발은 최신 `main` 기준에서 새 작업 브랜치 생성 후 진행

## 8. PM 상태

- UI 최신본 Production 반영: 완료
- GitHub 운영 기준 재정렬: 완료
- Vercel Next.js 설정 정상화: 완료
- Supabase 스키마 구축: 완료
- AIPOS 운영 표준 문서화: 완료
- 실제 테스트 데이터 end-to-end 저장 검증: 다음 단계

---

작성일: 2026-08-17
프로젝트: LAYAD BEAUTY CODE
관리 기준: AIPOS