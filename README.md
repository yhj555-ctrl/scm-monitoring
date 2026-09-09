# SCM 리스크 모니터링

구매팀 SCM 관점에서 만든 공급업체·원자재·환율·물류 리스크 모니터링 대시보드입니다.
PR팀의 `pr-monitoring-v2` 구조(메인 대시보드 + 소스별 서브 모니터링 페이지)를 그대로 차용했습니다.

## 페이지 구성

| 경로 | 내용 |
|---|---|
| `/` | 통합 리스크 대시보드 (총 모니터링 건수, 고위험 건수, 업체평가 리스크 TOP5, 최근 이슈) |
| `/suppliers` | **업체평가 리스크 관리** — 99개 주요 공급업체 AI 평가 결과(검색·등급 필터·정렬 가능) |
| `/materials` | **원자재·환율 실시간 모니터링** + 하단에 원자재·환율 관련 최신 뉴스 |
| `/news` | **공급업체 뉴스 실시간 크롤링** (게재시각 최신순) |
| `/logistics` | 물류/리드타임 모니터링 — 중국·대만·미국 구간 (아직 목업) |

모든 실시간 데이터는 **매일 08:00(KST)** 에 자동 갱신됩니다.

## 공급업체 평가 데이터

`lib/suppliers.ts`에는 "주요_공급업체_99개_AI평가기준_스코어링" 원본 엑셀의 "종합평가 결과" 시트에서
추출한 실제 데이터(업체명, 사업자번호, 유형, 담당 MD, 25년 계약금액, 부채비율, 영업이익률, 매출액
성장률, 종합점수, 최종등급, 참고사항)가 그대로 들어 있습니다.

업체 명단이 바뀌면 새 엑셀을 같은 형식으로 정리한 뒤 `lib/suppliers.ts`의 `suppliers` 배열만
교체하면 됩니다. `/news`의 크롤링 대상 업체(우선순위 18개)도 이 배열에서 자동으로 뽑습니다.

## 실시간 데이터 연동

`/materials`와 `/news`는 목업이 아니라 **실시간 외부 소스를 직접 호출**합니다 (`lib/live/`).

| 데이터 | 소스 | 비고 |
|---|---|---|
| 공급업체 뉴스 | Google 뉴스 RSS (무료, 키 불필요) | 내부 평가상 위험·유의 등급 업체(최대 18개) 우선 크롤링, 게재시각 최신순 정렬 |
| 원자재·환율 뉴스 | Google 뉴스 RSS (무료, 키 불필요) | `/materials` 하단. 구리·알루미늄·니켈·유가·환율·석유화학 주제, 최신순 |
| 환율 | Frankfurter API `api.frankfurter.dev/v1` (ECB 기준, 무료, 키 불필요) | USD 기준 KRW/JPY/EUR/CNY. 구 도메인 `api.frankfurter.app` 은 이제 여기로 301 리다이렉트됨 |
| 원자재/지표 | Yahoo Finance 비공식 차트 API | 구리·알루미늄·금·WTI원유. **비공식 API라 클라우드(Vercel) IP에서 간헐적으로 차단될 수 있음** |
| 니켈, PP(폴리프로필렌) | 미연동 | 안정적인 무료 공개 API가 없어 자리만 마련해뒀습니다. KOMIS 등에서 키 발급 후 `lib/live/metals.ts`의 `NO_FREE_SOURCE`를 교체하세요 |

모든 실시간 호출은 실패해도 페이지가 깨지지 않도록 `try/catch` + 폴백 처리되어 있습니다
(`lib/live/fetchUtils.ts`). 실패 시 "-" 또는 예시값이 표시되고, 다음 정기 갱신 때 재시도합니다.

### 매일 08:00(KST) 자동 갱신

각 실시간 데이터는 하루(86400초) Next.js 캐시를 갖고 있고, `vercel.json`에 등록된 **Vercel Cron**이
매일 UTC 23:00(=KST 08:00)에 `/api/cron/refresh`를 호출해 캐시 태그(`supplier-news`,
`commodity-news`, `fx-rates`, `metal-prices`, `logistics`)를 강제로 무효화합니다. 다음 접속 시
새 데이터로 다시 만들어집니다.

각 페이지 상단의 **"마지막 갱신 시각(KST)"** 이 이 캐시 스냅샷이 만들어진 시각입니다.
환율의 "ECB 기준일" 은 유럽중앙은행 고시일이라 주말·공휴일·이른 아침에는 전 영업일로 보이는
것이 정상이며(하루 1회, 대략 CET 16:00 고시), 실제 데이터 조회 여부는 "마지막 갱신 시각" 으로
판단하세요.

**주의**: Vercel Hobby(무료) 플랜은 크론이 정시가 아니라 해당 UTC 1시간 내 임의 시각에 실행됩니다
(즉 08:00~08:59 KST 사이 어느 시점). 더 촘촘한 스케줄이나 정시 실행이 필요하면 Pro 플랜이 필요합니다.
`CRON_SECRET` 환경변수는 Vercel이 프로젝트 배포 시 자동으로 만들어주므로 따로 설정할 필요는 없습니다.

## 아직 목업인 부분

`lib/data.ts`의 `fetchLogisticsStatus`는 아직 목업 스냅샷(중국·대만·미국 구간)을 반환합니다.
실제 연동 시 이 함수 내부만 교체하면 됩니다:

- 물류/리드타임: 선사·포워더 스케줄 API, Freightos/Drewry 운임지수, 미국 항만(LA/LB) 대기
  데이터, 관세청 수출입 통관 정보

API 키가 필요한 경우 Vercel 프로젝트의 Settings > Environment Variables에 등록하고,
`process.env.YOUR_KEY` 형태로 불러오세요.

## 로그인 (아이디/비밀번호)

모든 페이지는 로그인 후에만 접근할 수 있습니다. 미인증 상태로 접근하면 `/login` 으로
이동합니다.

- 기본 계정: **아이디 `procurement` / 비밀번호 `rnaoxla2026!`**
- 계정·비밀키는 환경변수로 덮어쓸 수 있습니다 (`.env.example` 참고):
  - `AUTH_USERNAME`, `AUTH_PASSWORD`
  - `AUTH_SECRET` — 세션 쿠키 서명용 비밀키. **Vercel 배포 시 Settings > Environment
    Variables 에 임의의 긴 문자열로 반드시 설정하세요** (`openssl rand -hex 32`).
    미설정 시 개발용 기본값이 쓰여 세션 위조에 취약합니다.

로그인하면 12시간짜리 httpOnly 세션 쿠키(`scm_session`)가 발급되고, 우측 상단
"로그아웃" 버튼으로 해제할 수 있습니다. 인증 처리는 `middleware.ts` + `lib/auth.ts` +
`app/api/auth/*` 에 있습니다. 크론 엔드포인트(`/api/cron/refresh`)는 기존 `CRON_SECRET`
방식을 그대로 유지합니다.

## 로컬 실행

```bash
npm install
npm run dev
```

`http://localhost:3000` 에서 확인할 수 있습니다.

## Vercel 배포

1. 이 폴더를 GitHub 저장소에 push (실제 재무 데이터가 포함되어 있으니 **Private 저장소** 권장)
2. vercel.com에서 GitHub 계정으로 로그인
3. "Add New... > Project"에서 해당 저장소 선택 (Next.js는 자동 감지됨)
4. **Settings > Environment Variables** 에 `AUTH_SECRET` (임의의 긴 문자열) 등록.
   계정을 바꾸려면 `AUTH_USERNAME` / `AUTH_PASSWORD` 도 함께 등록
5. Deploy — `vercel.json`의 크론이 자동으로 등록됩니다
6. 배포 완료 시 `https://프로젝트이름.vercel.app` 주소 생성
