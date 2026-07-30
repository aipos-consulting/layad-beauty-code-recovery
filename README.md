# LAYAD BEAUTY CODE

LAYAD BEAUTY CODE는 12개 문항을 통해 사용자의 메이크업 성향을 16개 유형으로 분류하고, 유형별 K-Beauty 제품을 추천하는 서비스입니다.

## 프로젝트 목표

- 12문항 기반 16유형 테스트
- 유형별 K-Beauty 제품 5개 추천
- 1차 기준 가격대: 3만원 이하
- 한국어 기반의 미니멀한 사용자 화면
- 결과 공유와 구매 전환을 위한 CTA 제공

## 현재 상태

현재 저장소는 Next.js 초기 프로젝트 단계입니다.

- 개발환경 진단 완료
- 의존성 설치, ESLint, TypeScript 검사, 프로덕션 빌드 통과
- 문항 데이터, 유형 계산, 결과 화면, 제품 추천 기능은 아직 미구현
- 자동 테스트 스크립트는 아직 미구성
- 보안 감사에서 고위험 취약점이 발견되어 의존성 업데이트 검토 필요

자세한 진단 결과는 [B-001 개발환경 진단 결과](docs/B-001_ENV_DIAGNOSIS.md)를 참고하세요.

## 기술 구성

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- ESLint

## 로컬 실행

```bash
npm ci
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

일부 제한된 실행환경에서 기본 npm 캐시 경로를 사용할 수 없다면 다음과 같이 별도 캐시를 지정할 수 있습니다.

```bash
npm ci --cache /tmp/layad-npm-cache
```

## 현재 검증 명령

```bash
npm run lint
npx tsc --noEmit
npm run build
npm audit --audit-level=high
```

`test`와 `typecheck` 스크립트는 다음 개발 단계에서 `package.json`에 추가할 예정입니다.

## 문서

- [B-001 개발환경 진단 결과](docs/B-001_ENV_DIAGNOSIS.md)

## 진행 원칙

- 하루 작업은 작은 검증 단위로 진행합니다.
- 같은 오류를 반복 실행하지 않고 원인을 먼저 확인합니다.
- 완료 여부는 실행 결과와 GitHub 기록을 근거로 판단합니다.
- 기능 변경 전후에 lint, TypeScript 검사, build를 확인합니다.
