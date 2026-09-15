import RiskBadge from "@/components/RiskBadge";
import BarChart from "@/components/charts/BarChart";
import LineChart from "@/components/charts/LineChart";
import { fetchMaterialPrices, fetchExchangeRates, fetchCommodityNews } from "@/lib/data";
import { kstDateTime } from "@/lib/time";

/** 표시용 짧은 품목명: 괄호 안 설명 제거 (예: "구리 (Copper)" -> "구리") */
function shortMaterialName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, "").trim();
}

// 외부 실시간 소스(Yahoo Finance, Frankfurter, Google 뉴스)를 호출합니다.
// 하루 캐시 + 매일 08:00(KST) /api/cron/refresh 가 캐시를 무효화합니다.
export const revalidate = 86400;

export default async function MaterialsPage() {
  const [materials, fx, news] = await Promise.all([
    fetchMaterialPrices(),
    fetchExchangeRates(),
    fetchCommodityNews(),
  ]);

  // 이 페이지(캐시 스냅샷)가 생성된 시각 = 실시간 소스를 마지막으로 조회한 시각.
  const refreshedAt = kstDateTime(new Date());

  const latestMarketTime = materials
    .map((m) => m.marketTime ?? 0)
    .reduce((a, b) => Math.max(a, b), 0);

  const liveMaterials = materials.filter((m) => m.live);
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
          <span>환율 (1 USD 기준)</span>
          <span className="panel-link" style={{ cursor: "default" }}>
            {fx.live ? `ECB 기준일 ${fx.asOf}` : fx.asOf}
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th>통화</th>
              <th>환율</th>
            </tr>
          </thead>
          <tbody>
            {fx.rates.map((r) => (
              <tr key={r.currency}>
                <td>
                  {r.currency} ({r.currencyName})
                </td>
                <td>{r.rate.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {fx.live && (
          <div className="panel-footnote">
            ECB는 유럽 영업일 기준 하루 한 번(대략 CET 16:00) 고시합니다. 주말·공휴일이나 이른
            아침에는 기준일이 전 영업일로 표시되는 것이 정상이며, 실제 조회는 위 &ldquo;마지막
            갱신 시각&rdquo; 기준으로 이뤄집니다.
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">주요 원자재/지표 시세</div>
        <table>
          <thead>
            <tr>
              <th>품목</th>
              <th>현재가</th>
              <th>변동률</th>
              <th>기준시각(KST)</th>
              <th>출처</th>
              <th>리스크</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.materialName}
                  {m.note && <span className="grade-text">{m.note}</span>}
                </td>
                <td>
                  {m.live ? (
                    <>
                      {m.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                      {m.unit}
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td className={m.changeRate >= 0 ? "change-up" : "change-down"}>
                  {m.live ? `${m.changeRate >= 0 ? "+" : ""}${m.changeRate}%` : "-"}
                </td>
                <td>
                  {m.live && m.marketTime ? kstDateTime(new Date(m.marketTime * 1000)) : "-"}
                </td>
                <td>{m.source}</td>
                <td>
                  <RiskBadge risk={m.risk} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="panel-header">원자재 · 환율 관련 최신 뉴스</div>
        {news.length === 0 ? (
          <div className="panel-footnote">
            현재 수집된 뉴스가 없습니다. 다음 갱신(매일 08:00 KST) 때 다시 시도합니다.
          </div>
        ) : (
          <ul className="news-list">
            {news.map((n) => (
              <li key={n.id}>
                <a
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="news-headline"
                >
                  {n.title}
                </a>
                <div className="news-meta">
                  <span>{n.topic}</span>
                  <span className="dot">{n.source}</span>
                  <span className="dot">
                    {n.publishedAt ? kstDateTime(new Date(n.publishedAt)) : "게재시각 미상"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
