# SCM 리스크 모니터링

구매팀 SCM 관점에서 만든 공급업체·원자재·물류·입찰 리스크 모니터링 대시보드입니다.
PR팀의 `pr-monitoring-v2` 구조(메인 대시보드 + 소스별 서브 모니터링 페이지)를 그대로 차용했습니다.

## 페이지 구성

| 경로 | 내용 |
|---|---|
| `/` | 통합 리스크 대시보드 (총 모니터링 건수, 고위험 건수, 업체평가 리스크 TOP5, 최근 이슈) |
| `/suppliers` | **업체평가 리스크 관리** — 99개 주요 공급업체 AI 평가 결과(검색·등급 필터·정렬 가능) |
| `/materials` | 원자재 가격 모니터링 |
| `/news` | 공급업체 뉴스/공시 모니터링 (실제 업체명·평가등급 기반) |
| `/logistics` | 물류/리드타임 모니터링 |
| `/bidding` | 입찰/계약 모니터링 |

## 공급업체 평가 데이터

`lib/suppliers.ts`에는 "주요_공급업체_99개_AI평가기준_스코어링" 원본 엑셀의 "종합평가 결과" 시트에서
추출한 실제 데이터(업체명, 사업자번호, 유형, 담당 MD, 25년 계약금액, 부채비율, 영업이익률, 매출액
성장률, 종합점수, 최종등급, 참고사항)가 그대로 들어 있습니다. `/suppliers` 페이지와 대시보드의
"업체평가 리스크 TOP 5", `/news`의 일부 항목이 이 데이터를 사용합니다.

업체 명단이 바뀌면 새 엑셀을 같은 형식으로 정리한 뒤 `lib/suppliers.ts`의 `suppliers` 배열만
교체하면 됩니다.

## 로컬 실행

```bash
npm install
npm run dev
```

`http://localhost:3000` 에서 확인할 수 있습니다.

## 실제 데이터 연동

지금은 `lib/data.ts`의 `fetchMaterialPrices`, `fetchSupplierNews`, `fetchLogisticsStatus`,
`fetchBiddingStatus` 함수가 목업 데이터를 반환합니다. 이 함수들 내부만 실제 API 호출로
교체하면 나머지 UI는 수정 없이 그대로 동작합니다.

- 원자재 가격: LME, 한국자원정보서비스(KOMIS)
- 공급업체 뉴스: 뉴스 API(빅카인즈 등), 기업 신용정보(NICE/KED), 전자공시(DART)
- 물류/리드타임: 선사·포워더 API, 관세청 수출입 통관 정보
- 입찰/계약: 나라장터(조달청) API, 사내 ERP/SRM 연동

API 키가 필요한 경우 Vercel 프로젝트의 Settings > Environment Variables에 등록하고,
`lib/data.ts`에서 `process.env.YOUR_KEY` 형태로 불러오세요.

## Vercel 배포

1. 이 폴더를 GitHub 저장소에 push
2. vercel.com에서 GitHub 계정으로 로그인
3. "Add New... > Project"에서 해당 저장소 선택 (Next.js는 자동 감지됨)
4. 필요한 환경 변수 등록 후 Deploy
5. 배포 완료 시 `https://프로젝트이름.vercel.app` 주소 생성
