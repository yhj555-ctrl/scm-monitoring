import { unstable_cache } from "next/cache";
import { suppliers, gradeToRisk } from "./suppliers";
import { fetchLiveSupplierNews, fetchLiveCommodityNews, fetchLiveCompetitorNews } from "./live/news";
import type { CommodityNewsItem, CompetitorNewsItem } from "./live/news";
import { fetchLiveExchangeRates } from "./live/fx";
import type { FxRate } from "./live/fx";
import { fetchLiveMetalPrices } from "./live/metals";
import type { LiveMaterialPrice } from "./live/metals";
import { fetchLiveSemiconductorPrices } from "./live/semiconductors";
import { fetchDartDisclosures } from "./live/dart";
import type { DartResult } from "./live/dart";
import { fetchSeoulWeather as fetchLiveSeoulWeather } from "./live/weather";
import type { SeoulWeather } from "./live/weather";
import { kstDate, kstTodayEightAM } from "./time";

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
  publishedAt: string; // ISO 문자열 또는 "-"
  publishedTs: number; // 정렬용 epoch ms (0 = 알 수 없음)
}

export type LogisticsRegion = "중국" | "대만" | "미국" | "유럽" | "대한민국";

export interface LogisticsItem {
  id: string;
  region: LogisticsRegion;
  route: string; // e.g. "상하이 → 부산"
  lane: "수입" | "수출" | "국내"; // 대한민국 기준 방향
  carrier: string;
  mode: "해상" | "항공" | "내륙";
  leadTimeDays: number; // 현재 예상 리드타임(대한민국 기준, 일)
  baselineDays: number; // 평시 기준 리드타임
  status: "정상" | "지연" | "지연 심각";
  delayDays: number;
  risk: RiskLevel;
  updatedAt: string;
  note?: string;
}

export interface DashboardSummary {
  totalMonitoredItems: number;
  highRiskCount: number;
  activeSuppliers: number;
  recentlyUpdated: number;
}

export type { CommodityNewsItem };
export type { DartResult, DartSupplierDisclosure, DartFiling } from "./live/dart";
export type { CompetitorNewsItem, CompetitorCompany } from "./live/news";
export type { SeoulWeather };

/** 전자공시시스템(DART) 최근 공시 현황 (DART_API_KEY 설정 시). 매일 08:00(KST) 갱신. */
export async function fetchSupplierDisclosures(): Promise<DartResult> {
  return fetchDartDisclosures();
}

/** 서울 현재 날씨 (상단 네비게이션). 매일 08:00(KST) 갱신. */
export async function fetchSeoulWeather(): Promise<SeoulWeather> {
  return fetchLiveSeoulWeather();
}

/** 경쟁사(KT/LG유플러스/SK텔레콤) 장비·구매·공급업체 관련 최신 뉴스 (최신순). */
export async function fetchCompetitorNews(): Promise<CompetitorNewsItem[]> {
  return fetchLiveCompetitorNews();
}

/**
 * 실시간 데이터 소스 (모두 lib/live/*.ts):
 *  - fetchMaterialPrices  -> Yahoo Finance(비공식, 구리/알루미늄/금/원유) + 환율(Frankfurter)
 *  - fetchSupplierNews    -> Google 뉴스 RSS 실시간 크롤링 (내부 평가 위험/유의 등급 업체 우선, 최신순 정렬)
 *  - fetchCommodityNews   -> Google 뉴스 RSS (원자재·환율 주제, 최신순)
 *  - fetchLogisticsStatus -> 중국·대만·미국 구간 목업 스냅샷 (매일 08:00 KST 기준)
 *
 * 캐시: 각 실시간 fetch는 하루(86400초) 캐시 + 태그(supplier-news / commodity-news /
 * fx-rates / metal-prices / logistics)를 가지고 있어, /api/cron/refresh 가 매일 08:00(KST)에
 * 태그를 무효화하여 다음 요청 때 새로 고칩니다.
 */

function materialRisk(m: { live: boolean; changeRate: number }): RiskLevel {
  if (!m.live) return "중";
  const abs = Math.abs(m.changeRate);
  if (abs >= 5) return "상";
  if (abs >= 2) return "중";
  return "하";
}

function toMaterialPrice(m: LiveMaterialPrice): MaterialPrice {
  return {
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
  };
}

export async function fetchMaterialPrices(): Promise<MaterialPrice[]> {
  const live = await fetchLiveMetalPrices();
  return live.map(toMaterialPrice);
}

/**
 * 메모리(DDR)·주요 칩셋 관련 지표. DRAM/NAND 현물가는 무료 API가 없어
 * 삼성전자·SK하이닉스·Micron·TSMC 주가를 관련 대리 지표로 보여줍니다.
 * (lib/live/semiconductors.ts 참고)
 */
export async function fetchSemiconductorPrices(): Promise<MaterialPrice[]> {
  const live = await fetchLiveSemiconductorPrices();
  return live.map(toMaterialPrice);
}

export async function fetchExchangeRates(): Promise<{ rates: FxRate[]; asOf: string; live: boolean }> {
  return fetchLiveExchangeRates();
}

/** 원자재·환율 관련 최신 뉴스 (최신순). */
export async function fetchCommodityNews(): Promise<CommodityNewsItem[]> {
  return fetchLiveCommodityNews();
}

/**
 * 공급업체 뉴스.
 * Google 뉴스 RSS로 실시간 크롤링한 결과(fromLive, 게재시각 최신순)를 우선 사용하고,
 * 크롤링이 비어 있는 위험/유의 업체는 내부 평가 데이터(비고/등급) 기반 항목으로 뒤에 보완합니다.
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
    publishedAt: n.publishedAt || "-",
    publishedTs: n.publishedTs,
  }));

  // 이미 news.ts 에서 최신순 정렬되어 있으나, 매핑 이후 한 번 더 보장합니다.
  fromLive.sort((a, b) => b.publishedTs - a.publishedTs);

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
    publishedTs: 0,
  }));

  return [...fromLive, ...fromInternal];
}

/**
 * 물류 리드타임 — 중국·대만·미국 위주 구간 스냅샷.
 * 아직 목업입니다. 실제 연동 시 이 함수 내부만 교체하세요:
 *   선사/포워더 스케줄 API, Freightos/Drewry 운임지수, 미국 항만(LA/LB) 대기 데이터,
 *   관세청 수출입 통관 정보 등.
 * updatedAt 은 매일 08:00(KST) 기준으로 표기됩니다.
 */
export const fetchLogisticsStatus = unstable_cache(
  async (): Promise<LogisticsItem[]> => buildLogisticsSnapshot(),
  ["logistics-snapshot"],
  { revalidate: 86400, tags: ["logistics"] }
);

function buildLogisticsSnapshot(): LogisticsItem[] {
  const updatedAt = kstDate(kstTodayEightAM()) + " 08:00";

  // 리드타임(leadTimeDays)은 모두 "대한민국 기준" 문전~문전 소요일입니다.
  const base: Omit<LogisticsItem, "status" | "risk" | "updatedAt">[] = [
    // 중국 ↔ 대한민국
    { id: "cn-imp-pus", region: "중국", route: "상하이 → 부산", lane: "수입", carrier: "COSCO", mode: "해상", leadTimeDays: 9, baselineDays: 7, delayDays: 2, note: "상하이항 적체·기상 지연" },
    { id: "cn-imp-icn", region: "중국", route: "선전 → 인천", lane: "수입", carrier: "HMM", mode: "해상", leadTimeDays: 12, baselineDays: 10, delayDays: 2 },
    { id: "cn-imp-air", region: "중국", route: "상하이(PVG) → 인천(ICN)", lane: "수입", carrier: "아시아나 카고", mode: "항공", leadTimeDays: 3, baselineDays: 2, delayDays: 1, note: "이커머스 물량으로 스페이스 타이트" },
    { id: "cn-exp-pus", region: "중국", route: "부산 → 칭다오", lane: "수출", carrier: "장금상선", mode: "해상", leadTimeDays: 6, baselineDays: 5, delayDays: 1 },
    // 대만 ↔ 대한민국
    { id: "tw-imp-pus", region: "대만", route: "가오슝 → 부산", lane: "수입", carrier: "Evergreen", mode: "해상", leadTimeDays: 8, baselineDays: 7, delayDays: 1 },
    { id: "tw-imp-air", region: "대만", route: "타이베이(TPE) → 인천(ICN)", lane: "수입", carrier: "China Airlines 카고", mode: "항공", leadTimeDays: 3, baselineDays: 2, delayDays: 1, note: "반도체 장비 우선 선적" },
    { id: "tw-exp-pus", region: "대만", route: "부산 → 지룽", lane: "수출", carrier: "Yang Ming", mode: "해상", leadTimeDays: 7, baselineDays: 6, delayDays: 1 },
    // 미국 ↔ 대한민국
    { id: "us-imp-pus", region: "미국", route: "로스앤젤레스 → 부산", lane: "수입", carrier: "Matson", mode: "해상", leadTimeDays: 18, baselineDays: 15, delayDays: 3, note: "미 서안 항만 혼잡" },
    { id: "us-imp-ny", region: "미국", route: "뉴욕(뉴어크) → 부산", lane: "수입", carrier: "MSC", mode: "해상", leadTimeDays: 38, baselineDays: 33, delayDays: 5, note: "파나마 운하 통항 제한 영향" },
    { id: "us-imp-air", region: "미국", route: "로스앤젤레스(LAX) → 인천(ICN)", lane: "수입", carrier: "대한항공 카고", mode: "항공", leadTimeDays: 4, baselineDays: 3, delayDays: 1 },
    { id: "us-exp-pus", region: "미국", route: "부산 → 로스앤젤레스", lane: "수출", carrier: "HMM", mode: "해상", leadTimeDays: 16, baselineDays: 14, delayDays: 2 },
    // 유럽 ↔ 대한민국
    { id: "eu-imp-pus", region: "유럽", route: "로테르담 → 부산", lane: "수입", carrier: "Maersk", mode: "해상", leadTimeDays: 34, baselineDays: 28, delayDays: 6, note: "홍해 우회로 희망봉 경유 지속" },
    { id: "eu-imp-ham", region: "유럽", route: "함부르크 → 부산", lane: "수입", carrier: "Hapag-Lloyd", mode: "해상", leadTimeDays: 35, baselineDays: 29, delayDays: 6, note: "희망봉 우회" },
    { id: "eu-imp-air", region: "유럽", route: "프랑크푸르트(FRA) → 인천(ICN)", lane: "수입", carrier: "루프트한자 카고", mode: "항공", leadTimeDays: 4, baselineDays: 3, delayDays: 1 },
    { id: "eu-exp-pus", region: "유럽", route: "부산 → 앤트워프", lane: "수출", carrier: "CMA CGM", mode: "해상", leadTimeDays: 33, baselineDays: 27, delayDays: 6, note: "희망봉 우회" },
    // 대한민국 국내
    { id: "kr-pus-ptk", region: "대한민국", route: "부산항 → 평택 (수입 내륙운송)", lane: "국내", carrier: "국내 육상운송", mode: "내륙", leadTimeDays: 2, baselineDays: 1, delayDays: 1, note: "부산항 반출 대기" },
    { id: "kr-icn-hs", region: "대한민국", route: "인천공항 → 화성 (수입 내륙운송)", lane: "국내", carrier: "국내 육상운송", mode: "내륙", leadTimeDays: 1, baselineDays: 1, delayDays: 0 },
    { id: "kr-feeder", region: "대한민국", route: "부산 → 광양 (연안 피더)", lane: "국내", carrier: "장금상선", mode: "해상", leadTimeDays: 2, baselineDays: 2, delayDays: 0 },
  ];

  return base.map((b) => {
    const status: LogisticsItem["status"] =
      b.delayDays >= 5 ? "지연 심각" : b.delayDays >= 2 ? "지연" : "정상";
    const risk: RiskLevel = b.delayDays >= 5 ? "상" : b.delayDays >= 2 ? "중" : "하";
    return { ...b, status, risk, updatedAt };
  });
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
