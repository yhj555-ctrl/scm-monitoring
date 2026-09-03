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

export async function fetchSupplierNews(): Promise<SupplierNewsItem[]> {
  return [
    { id: "n1", supplierName: "A정밀", headline: "자금 유동성 악화 관련 보도", category: "재무", risk: "상", sourceName: "연합인포맥스", publishedAt: "2026-09-02 18:11" },
    { id: "n2", supplierName: "B산업", headline: "하도급 대금 지급 지연 논란", category: "법적분쟁", risk: "중", sourceName: "이데일리", publishedAt: "2026-09-02 14:02" },
    { id: "n3", supplierName: "C소재", headline: "탄소배출 저감 설비 투자 발표", category: "ESG", risk: "하", sourceName: "머니투데이", publishedAt: "2026-09-01 10:45" },
    { id: "n4", supplierName: "D전자", headline: "대표이사 변경 공시", category: "경영권", risk: "중", sourceName: "전자공시(DART)", publishedAt: "2026-08-31 16:20" },
  ];
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
  const highRiskCount =
    materials.filter((m) => m.risk === "상").length +
    news.filter((n) => n.risk === "상").length +
    logistics.filter((l) => l.risk === "상").length;

  return {
    totalMonitoredItems: materials.length + news.length + logistics.length,
    highRiskCount,
    activeSuppliers: new Set(news.map((n) => n.supplierName)).size + 12,
    recentlyUpdated: news.length + logistics.length,
  };
}
