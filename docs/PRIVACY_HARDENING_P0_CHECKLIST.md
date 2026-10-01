# P0 배포 체크리스트

- [ ] `USER_SESSION_SECRET`을 Vercel Production/Preview에 등록
- [ ] 회원 로그인 성공
- [ ] 자동 로그인 유지
- [ ] 로그아웃 정상
- [ ] 마이페이지 정상 조회
- [ ] Admin 회원 목록 정상 조회
- [ ] Admin 회원 목록 응답 JSON에 `email` 필드 없음
- [ ] Admin 화면에 이메일 검색/원문 노출 없음
- [ ] 기존 로그인 사용자가 강제 로그아웃되지 않는지 확인
- [ ] 이상 없으면 main 병합 및 Production 배포
