# LAYAD16 개인정보 보호 P0 개선

## 목적
- Admin 화면 및 API에서 고객 이메일 원문 노출 제거
- 사용자 세션 쿠키에서 이메일 제거
- Supabase service role key와 사용자 세션 서명 용도 분리 준비
- 운영 중인 로그인 구조는 유지하여 장애 위험 최소화

## 적용 범위
1. Admin 회원조회 API
   - `layad_users.email`을 select하지 않음
   - 브라우저 응답에 이메일을 포함하지 않음
   - 회원 식별은 UUID 기반 `memberCode` 사용

2. Admin 회원조회 화면
   - 이메일 검색 제거
   - 이메일 컬럼 제거
   - 회원 ID, 닉네임, 인증 여부, Locale, Beauty Code, 저장상품, 가입일, 최근 활동 표시

3. 사용자 세션 쿠키
   - payload에서 이메일 제거
   - `{ id, exp }`만 저장
   - 기존 쿠키는 전환 기간 동안 검증 가능하되 email 필드는 무시

4. 세션 서명키 분리
   - 신규 `USER_SESSION_SECRET` 환경변수 지원
   - 미설정 시 기존 service role key fallback으로 무중단 전환
   - 운영 배포 시 `USER_SESSION_SECRET` 설정 후 신규 쿠키는 전용 키로 서명

## 운영 전 확인사항
- Vercel Production/Preview 환경에 `USER_SESSION_SECRET` 등록
- 로그인/자동로그인/로그아웃/마이페이지 정상 동작 확인
- Admin 회원조회에서 이메일 원문이 네트워크 응답에도 존재하지 않는지 확인

## 다음 단계(P1)
- Supabase Auth 중심으로 신규 가입 전환
- 기존 Custom Auth 회원의 점진적 마이그레이션 설계
- `layad_users.email`, `password_hash`, `email_verified` 제거 또는 축소
- Master 전용 개인정보 조회 및 감사로그 정책 설계
