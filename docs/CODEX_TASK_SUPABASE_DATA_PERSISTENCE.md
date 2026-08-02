# Codex 작업: Supabase 익명 데이터 저장 및 배포 준비

## 선행 문서

- `docs/SUPABASE_ANONYMOUS_DATA_DESIGN.md`
- `supabase/migrations/20260803_001_anonymous_sessions.sql`

## 목표

기존 LAYAD 화면과 20문항 로직을 유지하면서 Supabase에 익명 테스트 데이터를 저장할 수 있도록 구현한다.

## 이번 구현 범위

1. Supabase 서버 클라이언트 구성
2. 익명 테스트 세션 생성 API
3. 테스트 완료와 20문항 응답 저장 API
4. 직접 선택 Beauty Code 저장
5. 상품 분석 요청 저장
6. 연령대 선택 UI
7. 국가와 광역 지역을 Vercel 요청 헤더에서 추출
8. 저장 실패 시 사용자 테스트 흐름을 중단하지 않는 오류 처리
9. 환경변수 예시와 배포 체크리스트 작성

## 금지사항

- 원 IP 저장 금지
- 이름, 이메일, 전화번호, 생년월일 저장 금지
- 정확한 위치 좌표 저장 금지
- 브라우저에 service role key 노출 금지
- 클라이언트에서 관리자 권한으로 Supabase 직접 호출 금지
- AI API 호출 추가 금지
- 기존 20문항과 Beauty Code 계산 변경 금지

## 화면 요구사항

결과 화면에 선택형 연령대 UI를 추가한다.

- 14–19세
- 20–29세
- 30–39세
- 40–49세
- 50–59세
- 60세 이상
- 응답하지 않음

연령대를 선택하지 않아도 결과 확인과 상품 분석 요청이 가능해야 한다.

첫 화면 또는 개인정보 안내 영역에 다음 취지의 문구를 표시한다.

> LAYAD는 이름, 이메일, 전화번호와 원 IP 주소를 저장하지 않습니다. 서비스 개선을 위해 접속 국가·지역, 선택형 연령대, 테스트 응답과 이용 기록을 최소한으로 처리합니다.

## 서버 처리

- `x-vercel-ip-country`에서 국가 코드 추출
- `x-vercel-ip-country-region`에서 광역 지역 코드 추출
- 원 IP 관련 헤더와 값을 DB에 전달하지 않음
- 기기 유형은 User-Agent를 단순 분류하거나 기존 클라이언트 정보로 저장

## 권장 파일

- `src/lib/supabase/server.ts`
- `src/lib/supabase/types.ts`
- `src/app/api/sessions/route.ts`
- `src/app/api/sessions/[id]/complete/route.ts`
- `src/app/api/product-analysis-requests/route.ts`
- `.env.example`

현재 구조에 더 적합한 파일 배치가 있으면 이유를 보고하고 최소 범위로 조정한다.

## 환경변수

`.env.example`에는 값 없이 키 이름만 기록한다.

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## 보안

- 모든 public 테이블 RLS 활성화 유지
- anon/authenticated 권한 직접 부여 금지
- 쓰기는 Next.js 서버 API를 통해서만 수행
- service role key는 서버 모듈에서만 읽음
- API 입력값을 서버에서 다시 검증
- session id는 UUID 형식 검증

## 검증

존재하는 명령만 각각 한 번 실행한다.

```text
npm run lint
npm run typecheck
npm test
npm run build
```

없는 스크립트는 실행하지 않는다. 같은 실패를 반복하지 않는다.

## 완료 보고

- 변경 파일
- Supabase 연결 방식
- 저장 시점
- 국가/지역 추출 방식
- 원 IP 미저장 확인
- 연령대 미응답 가능 확인
- RLS와 서버 전용 키 확인
- 검증 결과
- commit SHA
- Vercel에 필요한 환경변수 목록
- 배포 가능 여부와 남은 수동 작업

실제 Supabase 프로젝트 정보와 환경변수가 없으면 배포하지 말고 `배포 준비 완료` 상태로 종료한다.
