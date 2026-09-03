import { suppliers, gradeToRisk } from "./suppliers";

export type RiskLevel = "상" | "중" | "하";

export interface MaterialPrice {
  id: string;
  materialName: string;
  unit: string;
  currentPrice: number;
  changeRate: number; // percent, +/-
  risk: RiskLevel;
  source: string;
  updatedAt: string;
}

export interface SupplierNewsItem {
  id: string;
  supplierName: string;
  headline: string;
  category: "재무" | "법적분쟁" | "ESG" | "경영권" | "기타";
  risk: RiskLevel;
  sourceName: string;
  publishedAt: string;
}

export interface LogisticsItem {
  id: string;
  route: string; // e.g. "상하이 -> 부산"
  carrier: string;
  status: "정상" | "지연" | "지연 심각";
  delayDays: number;
  risk: RiskLevel;
  updatedAt: string;
}

export interface BiddingItem {
  id: string;
  projectName: string;
  supplierName: string;
  stage: "공고" | "입찰마감" | "낙찰" | "계약체결";
  amount: number; // KRW
  competitorCount: number;
  updatedAt: string;
}

export interface DashboardSummary {
  totalMonitoredItems: number;
  highRiskCount: number;
  activeSuppliers: number;
  recentlyUpdated: number;
}

/**
 * 아래 함수들은 목업 데이터를 반환합니다.
 * 실제 연동 시 이 파일의 함수 내부만 교체하면 됩니다:
 *  - fetchMaterialPrices  -> LME, 한국자원정보서비스(KOMIS), 원자재 거래소 API
 *  - fetchSupplierNews    -> 뉴스 API(빅카인즈, 네이버 뉴스), 기업 신용정보(NICE, KED) API
 *  - fetchLogisticsStatus -> 선사/포워더 API, 관세청 수출입 통관 정보
 *  - fetchBiddingStatus   -> 나라장터(조달청) API, 사내 ERP/SRM 연동
 * 각 함수는 fetch()로 외부 API를 호출하는 서버 컴포넌트/라우트 핸들러에서
 * 사용하도록 async로 선언해 두었습니다.
 */

export async function fetchMaterialPrices(): Promise<MaterialPrice[]> {
  return [
    { id: "m1", materialName: "구리 (Copper)", unit: "USD/톤", currentPrice: 9820, changeRate: 3.4, risk: "중", source: "LME", updatedAt: "2026-09-03 09:00" },
    { id: "m2", materialName: "알루미늄", unit: "USD/톤", currentPrice: 2510, changeRate: -1.2, risk: "하", source: "LME", updatedAt: "2026-09-03 09:00" },
    { id: "m3", materialName: "니켈", unit: "USD/톤", currentPrice: 16200, changeRate: 7.8, risk: "상", source: "LME", updatedAt: "2026-09-03 09:00" },
    { id: "m4", materialName: "폴리프로필렌(PP)", unit: "KRW/kg", currentPrice: 1450, changeRate: 0.5, risk: "하", source: "KOMIS", updatedAt: "2026-09-03 08:30" },
  ];
}

/**
 * 공급업체 뉴스 목록.
 * 업체명·평가등급·비고(참고사항)는 "주요_공급업체_99개_AI평가기준_스코어링" 원본의 실제 평가
 * 데이터(lib/suppliers.ts)를 그대로 사용합니다. headline/sourceName/publishedAt은 아직 외부
 * 뉴스 API가 연동되지 않아 평가 결과를 바탕으로 생성한 예시 문구입니다.
 * 실제 연동 시: 이 함수 내부를 뉴스 API(빅카인즈 등) 호출 결과로 교체하고,
 * suppliers 배열의 업체명을 검색 키워드로 사용하면 됩니다.
 */
export async function fetchSupplierNews(): Promise<SupplierNewsItem[]> {
  const riskFlagged = suppliers.filter((s) => gradeToRisk(s.grade) !== "하" && s.note);
  const fromNotes: SupplierNewsItem[] = riskFlagged.map((s, idx) => ({
    id: `n-note-${s.id}`,
    supplierName: s.name,
    headline: `[내부 평가] ${s.note} — 최종등급 ${s.grade}`,
    category: "재무",
    risk: gradeToRisk(s.grade),
    sourceName: "구매팀 AI 평가 결과",
    publishedAt: `2026-09-0${(idx % 3) + 1} 09:00`,
  }));

  const riskGradeOnly = suppliers.filter(
    (s) =>
      (s.grade === "위험 (Risk)" || s.grade === "위험 (Risk) - 과락" || s.grade === "유의 (Caution)") &&
      !s.note
  );
  const fromGrade: SupplierNewsItem[] = riskGradeOnly.slice(0, 6).map((s, idx) => ({
    id: `n-grade-${s.id}`,
    supplierName: s.name,
    headline: `종합점수 ${s.totalScore}점, 최종등급 ${s.grade}로 재무 리스크 주의 필요`,
    category: "재무",
    risk: gradeToRisk(s.grade),
    sourceName: "구매팀 AI 평가 결과",
    publishedAt: `2026-09-0${(idx % 3) + 1} 11:00`,
  }));

  const excellent = suppliers.filter(
    (s) => s.grade === "최우수 (Excellent)" || s.grade === "우수 (Good)"
  );
  const positiveSample: SupplierNewsItem[] = excellent.slice(0, 3).map((s, idx) => ({
    id: `n-pos-${s.id}`,
    supplierName: s.name,
    headline: `종합점수 ${s.totalScore}점, 우량 공급업체로 재평가`,
    category: "기타",
    risk: "하",
    sourceName: "구매팀 AI 평가 결과",
    publishedAt: `2026-08-2${8 + idx} 10:00`,
  }));

  return [...fromNotes, ...fromGrade, ...positiveSample];
}

export async function fetchLogisticsStatus(): Promise<LogisticsItem[]> {
  return [
    { id: "l1", route: "상하이 -> 부산", carrier: "HMM", status: "정상", delayDays: 0, risk: "하", updatedAt: "2026-09-03 07:00" },
    { id: "l2", route: "호치민 -> 인천", carrier: "Maersk", status: "지연", delayDays: 3, risk: "중", updatedAt: "2026-09-03 07:00" },
    { id: "l3", route: "칭다오 -> 평택", carrier: "고려해운", status: "지연 심각", delayDays: 9, risk: "상", updatedAt: "2026-09-03 06:40" },
  ];
}

export async function fetchBiddingStatus(): Promise<BiddingItem[]> {
  return [
    { id: "b1", projectName: "2026 사출성형 부품 연간단가", supplierName: "A정밀", stage: "낙찰", amount: 820000000, competitorCount: 4, updatedAt: "2026-09-01" },
    { id: "b2", projectName: "물류센터 자동화 설비", supplierName: "미정", stage: "입찰마감", amount: 1520000000, competitorCount: 6, updatedAt: "2026-09-02" },
    { id: "b3", projectName: "포장재 3년 장기계약", supplierName: "C소재", stage: "계약체결", amount: 430000000, competitorCount: 3, updatedAt: "2026-08-28" },
  ];
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const [materials, news, logistics] = await Promise.all([
    fetchMaterialPrices(),
    fetchSupplierNews(),
    fetchLogisticsStatus(),
  ]);
  const supplierHighRisk = suppliers.filter((s) => gradeToRisk(s.grade) === "상").length;
  const highRiskCount =
    materials.filter((m) => m.risk === "상").length +
    news.filter((n) => n.risk === "상").length +
    logistics.filter((l) => l.risk === "상").length +
    supplierHighRisk;

  return {
    totalMonitoredItems: materials.length + news.length + logistics.length + suppliers.length,
    highRiskCount,
    activeSuppliers: suppliers.length,
    recentlyUpdated: news.length + logistics.length,
  };
}
