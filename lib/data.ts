import { suppliers, gradeToRisk } from "./suppliers";
import { fetchLiveSupplierNews } from "./live/news";
import { fetchLiveExchangeRates, FxRate } from "./live/fx";
import { fetchLiveMetalPrices } from "./live/metals";

export type RiskLevel = "상" | "중" | "하";

export interface MaterialPrice {
  id: string;
  materialName: string;
  unit: string;
  currentPrice: number;
  changeRate: number; // percent, +/-
  risk: RiskLevel;
  source: string;
  live: boolean;
  note?: string;
  marketTime?: number; // 시세 기준 시각 (unix seconds)
}

export interface SupplierNewsItem {
  id: string;
  supplierName: string;
  headline: string;
  link?: string;
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
 * 실시간 데이터 소스 (모두 lib/live/*.ts):
 *  - fetchMaterialPrices  -> Yahoo Finance(비공식, 구리/알루미늄/금/원유) + 환율(Frankfurter.app)
 *  - fetchSupplierNews    -> Google 뉴스 RSS 실시간 크롤링 (내부 평가 위험/유의 등급 업체 우선)
 *  - fetchLogisticsStatus / fetchBiddingStatus -> 아직 목업. 아래 함수 내부만 교체하면 됩니다:
 *      물류: 선사/포워더 API, 관세청 수출입 통관 정보
 *      입찰: 나라장터(조달청) API, 사내 ERP/SRM 연동
 *
 * 캐시: 각 실시간 fetch는 30분(1800초) 캐시 + 태그(supplier-news / fx-rates / metal-prices)를
 * 가지고 있어, /api/cron/refresh 가 매일 09시(KST)에 태그를 무효화하여 즉시 새로 고칩니다.
 */

function materialRisk(m: { live: boolean; changeRate: number }): RiskLevel {
  if (!m.live) return "중";
  const abs = Math.abs(m.changeRate);
  if (abs >= 5) return "상";
  if (abs >= 2) return "중";
  return "하";
}

export async function fetchMaterialPrices(): Promise<MaterialPrice[]> {
  const live = await fetchLiveMetalPrices();
  return live.map((m) => ({
    id: m.id,
    materialName: m.materialName,
    unit: m.unit,
    currentPrice: m.currentPrice,
    changeRate: m.changeRate,
    risk: materialRisk(m),
    source: m.source,
    live: m.live,
    note: m.note,
    marketTime: m.marketTime,
  }));
}

export async function fetchExchangeRates(): Promise<{ rates: FxRate[]; asOf: string; live: boolean }> {
  return fetchLiveExchangeRates();
}

/**
 * 공급업체 뉴스.
 * Google 뉴스 RSS로 실시간 크롤링한 결과(fromLive)를 우선 사용하고,
 * 크롤링이 비어 있는 업체는 내부 평가 데이터(비고/등급) 기반 항목으로 보완합니다.
 */
export async function fetchSupplierNews(): Promise<SupplierNewsItem[]> {
  const liveItems = await fetchLiveSupplierNews();
  const fromLive: SupplierNewsItem[] = liveItems.map((n) => ({
    id: n.id,
    supplierName: n.supplierName,
    headline: n.title,
    link: n.link,
    risk: n.risk,
    sourceName: n.source,
    publishedAt: n.publishedAt,
  }));

  const coveredNames = new Set(liveItems.map((n) => n.supplierName));
  const riskFlagged = suppliers.filter(
    (s) => gradeToRisk(s.grade) !== "하" && !coveredNames.has(s.name)
  );
  const fromInternal: SupplierNewsItem[] = riskFlagged.slice(0, 10).map((s) => ({
    id: `internal-${s.id}`,
    supplierName: s.name,
    headline: s.note
      ? `[내부 평가] ${s.note} — 최종등급 ${s.grade}`
      : `종합점수 ${s.totalScore}점, 최종등급 ${s.grade}로 재무 리스크 주의 필요`,
    risk: gradeToRisk(s.grade),
    sourceName: "구매팀 AI 평가 결과 (뉴스 크롤링 결과 없음)",
    publishedAt: "-",
  }));

  return [...fromLive, ...fromInternal];
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
