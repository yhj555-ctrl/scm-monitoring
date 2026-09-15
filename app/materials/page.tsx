import BarChart from "@/components/charts/BarChart";
import LineChart from "@/components/charts/LineChart";
import MaterialsTable from "@/components/MaterialsTable";
import FxTable from "@/components/FxTable";
import SortableNewsList from "@/components/SortableNewsList";
import SummaryPanel from "@/components/SummaryPanel";
import {
  fetchMaterialPrices,
  fetchSemiconductorPrices,
  fetchExchangeRates,
  fetchCommodityNews,
} from "@/lib/data";
import { kstDateTime } from "@/lib/time";
import { shortMaterialName } from "@/lib/format";

// 외부 실시간 소스(Yahoo Finance, Frankfurter, Google 뉴스)를 호출합니다.
// 하루 캐시 + 매일 08:00(KST) /api/cron/refresh 가 캐시를 무효화합니다.
export const revalidate = 86400;

export default async function MaterialsPage() {
  const [materials, chips, fx, news] = await Promise.all([
    fetchMaterialPrices(),
    fetchSemiconductorPrices(),
    fetchExchangeRates(),
    fetchCommodityNews(),
  ]);

  // 이 페이지(캐시 스냅샷)가 생성된 시각 = 실시간 소스를 마지막으로 조회한 시각.
  const refreshedAt = kstDateTime(new Date());

  const latestMarketTime = [...materials, ...chips]
    .map((m) => m.marketTime ?? 0)
    .reduce((a, b) => Math.max(a, b), 0);

  const liveMaterials = materials.filter((m) => m.live);
  const materialsHighRisk = materials.filter((m) => m.risk === "상").length;
  const topMover =
    liveMaterials.length > 0
      ? liveMaterials.reduce((a, b) => (Math.abs(b.changeRate) > Math.abs(a.changeRate) ? b : a))
      : null;
  const krw = fx.rates.find((r) => r.currency === "KRW");

  const summaryLines = [
    topMover
      ? `${shortMaterialName(topMover.materialName)}가 ${topMover.changeRate >= 0 ? "+" : ""}${topMover.changeRate}%로 변동폭이 가장 큼.`
      : "원자재 실시간 변동 데이터가 없습니다.",
    `원자재 · 반도체 관련주 중 리스크 [상] ${materialsHighRisk}개.`,
    krw
      ? `원/달러 환율 ${krw.rate.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}원 (${fx.live ? `ECB 기준일 ${fx.asOf}` : fx.asOf}).`
      : "환율 데이터가 없습니다.",
    `원자재 · 환율 관련 뉴스 ${news.length}건 수집.`,
  ];

  const changeBarData = liveMaterials.map((m) => ({
    label: shortMaterialName(m.materialName),
    value: m.changeRate,
    color: m.changeRate >= 0 ? "var(--danger)" : "var(--accent)",
  }));
  const trendSeries = liveMaterials.map((m) => ({
    label: shortMaterialName(m.materialName),
    color: m.changeRate >= 0 ? "var(--danger)" : "var(--accent)",
    points: [0, m.changeRate],
  }));

  return (
    <>
      <h1>원자재 · 환율 모니터링</h1>
      <p className="page-subtitle">
        Yahoo Finance / Frankfurter / Google 뉴스 · 매일 08:00(KST) 자동 갱신
      </p>
      <p className="page-meta">
        마지막 갱신 시각(KST): <strong>{refreshedAt}</strong>
        {latestMarketTime > 0 && (
          <> · 시세 기준: {kstDateTime(new Date(latestMarketTime * 1000))}</>
        )}
      </p>

      <SummaryPanel lines={summaryLines} />

      <div className="panel">
        <div className="panel-header">원자재 변동률 시각화</div>
        <div className="chart-panel-body chart-row">
          <div>
            <div className="chart-subtitle">품목별 전일 대비 변동률</div>
            <BarChart data={changeBarData} orientation="horizontal" unit="%" />
          </div>
          <div>
            <div className="chart-subtitle">전일 → 현재 변동률 추이</div>
            <LineChart xLabels={["전일", "현재"]} series={trendSeries} valueFormatter={(v) => `${v}%`} />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header panel-header-link">
          <span>환율 (1 USD 기준, 열 클릭 시 정렬)</span>
          <span className="panel-link" style={{ cursor: "default" }}>
            {fx.live ? `ECB 기준일 ${fx.asOf}` : fx.asOf}
          </span>
        </div>
        <FxTable rates={fx.rates} />
        {fx.live && (
          <div className="panel-footnote">
            원화(KRW)를 맨 위에 표시합니다. ECB는 유럽 영업일 기준 하루 한 번(대략 CET 16:00)
            고시합니다. 주말·공휴일이나 이른 아침에는 기준일이 전 영업일로 표시되는 것이 정상이며,
            실제 조회는 위 &ldquo;마지막 갱신 시각&rdquo; 기준으로 이뤄집니다.
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">주요 원자재/지표 시세 (열 클릭 시 정렬)</div>
        <MaterialsTable items={materials} />
      </div>

      <div className="panel">
        <div className="panel-header">메모리(DDR) · 주요 칩셋 가격 추이 (열 클릭 시 정렬)</div>
        <MaterialsTable items={chips} />
        <div className="panel-footnote">
          DDR4/DDR5/NAND 현물가는 TrendForce·DRAMeXchange 등 유료 구독 소스가 대부분이라 무료
          공개 API로 직접 연동할 수 없어 아직 미연동입니다(자리만 마련). 대신 삼성전자·SK하이닉스·
          Micron·TSMC 주가를 메모리/파운드리 관련주 대리 지표로 함께 보여드립니다 — 실제 칩
          현물가와는 다른 수치입니다.
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">원자재 · 환율 관련 최신 뉴스</div>
        <SortableNewsList items={news} metaKey="topic" />
      </div>
    </>
  );
}
