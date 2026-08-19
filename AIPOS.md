# AIPOS.md

**AIPOS**: AI PROCESS OPERATING STANDARD  
**Version**: v1.0  
**Baseline date**: 2026-08-19  
**Status**: Active Baseline  

---

## 1. 목적

AIPOS는 사람이 AI와 함께 요구사항 정의, 설계, 개발, 데이터베이스, 배포, 운영, 비용통제까지 수행할 때 적용하는 공통 운영표준이다.

AIPOS의 목적은 단순히 AI로 코드를 빠르게 생성하는 것이 아니다. **작은 인원으로도 실제 운영 가능한 서비스를 안전하고 반복 가능하게 만들기 위한 AI 협업 운영체계**를 확립하는 데 있다.

실제 MVP 수행에서 확인된 핵심 교훈은 다음과 같다.

> 코드 생성보다 더 어려운 것은 `GitHub → Vercel → Domain → Environment Variables → Database → AI API → Cost Control → Runtime`을 하나의 운영 기준선으로 일치시키는 일이다.

따라서 AIPOS는 기능 구현보다 운영 기준선과 배포 체계의 일치 여부를 먼저 확인한다.

---

## 2. AIPOS 제1원칙 — 비용 지속가능성 우선 (Cost Sustainability First)

> **아무리 우수한 AI 설계와 기능이라도 고객이 지속적으로 감당할 수 없는 비용 구조라면 좋은 시스템이 아니다.**

AIPOS는 다음 원칙을 적용한다.

1. AI 호출은 꼭 필요한 경우에만 실행한다.
2. 동일 분석 결과는 저장하고 재사용한다.
3. 반복 호출을 최소화하고 가능한 경우 1회 호출에서 필요한 결과를 함께 생성한다.
4. 최고 성능 모델을 기본값으로 사용하지 않고 요구 품질을 만족하는 가장 경제적인 모델을 우선한다.
5. 일/주/월 사용량과 비용을 오너가 직접 확인할 수 있어야 한다.
6. 월 운영예산을 사전에 설정하고 한도 도달 시 자동 차단한다.
7. 신규 기능은 기능가치뿐 아니라 추가되는 AI 비용을 함께 평가한다.
8. 품질 개선의 가치가 추가 비용보다 낮으면 더 경제적인 대안을 선택한다.

AIPOS 판단 문구:

> **“가장 뛰어난 AI를 만드는 것이 아니라, 고객에게 필요한 수준의 AI를 가장 낮고 예측 가능한 비용으로 지속 제공한다.”**

---

## 3. AI DevOps 핵심 원칙

### 3.1 Production Baseline First

기능 수정 전에 반드시 다음 연결관계를 확인한다.

`Production Domain → Deployment Project → Git Repository → Production Branch → Commit SHA → Environment Variables → Database Project → AI Project`

이 중 하나라도 불일치하면 기능 수정과 테스트를 중단한다.

**규칙**: 코드가 정상이어도 실제 Production이 다른 저장소나 다른 배포 프로젝트를 보고 있으면 수정 완료로 인정하지 않는다.

### 3.2 One Production Source

다음 상태를 금지한다.

- 여러 Git 저장소가 동시에 운영 후보인 상태
- 서로 다른 배포 프로젝트가 동일 서비스의 Production 후보인 상태
- 과거 저장소에서 자동배포가 계속 살아 있는 상태
- 개발자가 보고 있는 화면과 오너가 테스트하는 실제 도메인이 다른 상태

기존/복구/실험 저장소는 비교·백업 용도로만 사용하고 Production Source는 하나로 고정한다.

### 3.3 AI 변경범위 통제

AI에게 수정 요청할 때는 변경 대상과 변경 금지 대상을 동시에 명시한다.

예:

- 변경: 특정 API 또는 기능
- 변경 금지: 승인된 로고, 레이아웃, 화면 흐름, 기존 정상 기능

AI가 과거 코드를 되살리거나 무관한 영역까지 수정할 수 있으므로 승인된 UI와 Production Baseline은 보호 대상으로 취급한다.

---

## 4. 환경변수 운영표준

환경변수는 코드와 별도의 Release 구성요소다. 코드 배포가 성공했다고 서비스가 준비된 것은 아니다.

### 4.1 기본 원칙

1. 운영에 필요한 환경변수 목록을 Release Checklist로 관리한다.
2. Production/Preview 등 적용 환경을 명확히 구분한다.
3. 환경변수 변경 후에는 반드시 해당 환경을 재배포한다.
4. API Key, Project ID, Secret Key의 역할을 구분한다.
5. 브라우저용 공개키와 서버용 비밀키를 혼용하지 않는다.

### 4.2 Secret 관리

1. Secret 값은 Git 저장소에 저장하지 않는다.
2. Secret 값을 채팅이나 스크린샷에 노출하지 않는다.
3. Secret이 노출되면 즉시 폐기/Rotate 후 새 키로 교체한다.
4. Secret 값은 배포 플랫폼의 Environment Variables에 직접 등록한다.
5. 서버용 비밀키는 서버 런타임에서만 사용한다.

---

## 5. Self-Test First 원칙

운영 기능을 사용자가 직접 눌러 확인하기 전에 서버 Self-Test가 먼저 통과해야 한다.

Release 전 최소한 다음을 자동 확인한다.

- Database 설정 존재
- Database 접근 가능
- 주요 운영 테이블 접근 가능
- AI API Key 설정 여부
- AI Project 연결 여부
- Cost Guard 설정 여부
- Budget 설정 조회 가능
- 비용 조회 가능
- 월 예산 잔여 여부

**규칙**: `ready:true` 또는 이에 준하는 Release Health Check가 확인되기 전에는 오너에게 반복적인 실사용 테스트를 요청하지 않는다.

이 원칙은 실패 요청의 중복 적재, 불필요한 AI 호출, 원인이 불분명한 반복 테스트, 오너의 시간 낭비를 줄이기 위한 것이다.

---

## 6. 장애 진단 Gate

장애가 발생하면 기능코드부터 수정하지 않는다. 아래 순서로 확인한다.

### Gate 1 — Production Baseline

1. 사용자가 접속한 실제 도메인 확인
2. 도메인이 연결된 배포 프로젝트 확인
3. Production Deployment의 Git repo/branch/SHA 확인
4. 기준 소스와 일치 여부 확인

### Gate 2 — Runtime Configuration

1. Production 환경변수 존재 여부
2. 환경변수 적용 환경 확인
3. Secret/Public Key 유형 확인
4. 환경변수 변경 후 Redeploy 여부 확인

### Gate 3 — External Service

1. Database 연결
2. RLS/권한/테이블 접근
3. AI API 연결
4. 비용 조회 및 한도

### Gate 4 — Application Flow

1. 요청 생성
2. 서버 처리 시작
3. AI Run 생성
4. 결과/Evidence 저장
5. 사용자 결과 조회
6. Admin 비용/사용량 반영

**규칙**: 앞 Gate가 통과하지 않았으면 다음 Gate의 코드를 수정하지 않는다.

---

## 7. AI 비용 통제 표준

1. Cache First / DB First를 기본으로 한다.
2. 동일 입력에 대해 재사용 가능한 결과는 다시 AI 호출하지 않는다.
3. 동일 요청의 브라우저 이벤트 중복을 차단한다.
4. 동일 대상의 동시 AI 실행을 서버 또는 DB에서 차단한다.
5. 재시도는 무조건 반복 호출하지 않고 이전 실행 상태를 먼저 확인한다.
6. 월 예산 한도와 Hard Stop을 구현한다.
7. 비용 통제 기능 자체가 실패하면 Fail-Open이 아니라 필요 시 Fail-Closed를 적용한다.
8. 대량 GPT 시뮬레이션은 기본 검증방법으로 사용하지 않는다. 대표 실제 사례의 End-to-End 검증을 우선한다.

---

## 8. AI와 사람이 함께 개발할 때 확인된 한계

### AI가 강한 영역

- 코드 작성과 수정 속도
- 프론트/백엔드/DB/API를 넘나드는 범용성
- 로그·DB·소스 비교를 통한 원인 후보 탐색
- 반복 문서화와 운영 체크리스트 생성

### AI가 반드시 통제되어야 하는 영역

- 오래된 코드나 UI를 다시 되살리는 문제
- 실제 Production과 다른 저장소를 기준으로 수정하는 문제
- 환경변수와 계정 권한 문제를 코드 문제로 오판하는 문제
- 승인 범위를 넘어 관련 없는 영역까지 수정하는 문제
- 코드 변경 성공과 Production 성공을 혼동하는 문제
- 반복 테스트 과정에서 불필요한 비용과 데이터가 발생하는 문제

따라서 AI를 단순 코더가 아니라 **명시적인 기준선, 변경통제, Release Gate를 가진 DevOps 협업자**로 운영한다.

---

## 9. Definition of Done

기능은 다음 조건을 모두 만족해야 완료로 인정한다.

1. Production 기준 저장소/브랜치/SHA 확인
2. Production 배포 READY
3. 실제 도메인이 해당 Deployment를 바라봄
4. Production 환경변수 Health Check 통과
5. Database 주요 테이블 접근 정상
6. AI 연결 정상
7. Cost Guard 정상
8. 대표 실제 케이스 End-to-End 성공
9. 결과 데이터 저장 확인
10. Admin/운영 화면 반영 확인
11. 비용 한도 차단 로직 확인
12. 오너 최종 확인

---

## 10. LAYAD MVP에서 도출된 AI DevOps 학습사항 — 2026-08-19

LAYAD MVP 마무리 과정에서 다음 사항을 실제로 확인하였다.

- 기능 오류처럼 보였던 문제가 실제로는 Production 기준선, Vercel 팀 권한, 환경변수, Supabase Secret/RLS 등 운영 구성 문제에서 발생할 수 있다.
- GitHub 수정본이 정상이어도 실제 도메인이 다른 배포 기준선을 바라보면 수정 효과가 없다.
- 배포 플랫폼 OAuth가 잘못된 팀/계정 범위를 바라보면 운영 진단 자체가 왜곡될 수 있다.
- OpenAI API Key, Admin Key, Project ID는 각각 역할이 다르며 모두 정확한 프로젝트/조직 범위로 연결되어야 한다.
- Supabase Publishable Key와 서버 Secret Key는 목적이 다르며 서버 작업에는 올바른 Secret/service-role 권한이 필요하다.
- Secret 노출 시 즉시 Rotation해야 한다.
- Self-Test가 준비되지 않은 상태에서 오너에게 버튼을 반복해서 누르게 하는 방식은 피해야 한다.
- 코딩 자체보다 DevOps 연결관계와 운영 기준선을 통제하는 것이 실제 MVP 완성에서 더 까다로울 수 있다.

이 경험을 기반으로 이후 AIPOS 프로젝트는 **Production Baseline First → Runtime Configuration → External Service → Application Flow → Owner Test** 순서를 기본 운영절차로 적용한다.

---

## 11. 변경이력

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-19 | LAYAD MVP 실제 수행에서 도출된 Production Baseline, 환경변수, Secret 관리, Self-Test, Release Gate, Cost Control, AI DevOps 통제 원칙을 AIPOS 공통표준으로 반영 |
