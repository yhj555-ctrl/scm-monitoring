import RiskBadge from "@/components/RiskBadge";
import { fetchMaterialPrices, fetchExchangeRates } from "@/lib/data";

// 이 페이지는 외부 실시간 소스(Yahoo Finance, Frankfurter)를 호출합니다.
// 매 요청마다 최대 30분 캐시된 값을 쓰고, 매일 09시(KST)에 /api/cron/refresh 가 캐시를 무효화합니다.
export const revalidate = 1800;

function kst(date: Date): string {
  return date.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function MaterialsPage() {
  const [materials, fx] = await Promise.all([fetchMaterialPrices(), fetchExchangeRates()]);

  // 이 페이지(캐시 스냅샷)가 생성된 시각 = 실시간 소스를 마지막으로 조회한 시각.
  // 30분마다 또는 매일 09시(KST) 크론에서 갱신됩니다.
  const refreshedAt = kst(new Date());

  const latestMarketTime = materials
    .map((m) => m.marketTime ?? 0)
    .reduce((a, b) => Math.max(a, b), 0);

  return (
    <>
      <h1>원자재 · 환율 모니터링</h1>
      <p className="page-subtitle">
        Yahoo Finance / Frankfurter 실시간 조회 · 30분 캐시, 매일 09:00(KST) 자동 갱신
      </p>
      <p className="page-meta">
        마지막 갱신 시각(KST): <strong>{refreshedAt}</strong>
        {latestMarketTime > 0 && (
          <> · 시세 기준: {kst(new Date(latestMarketTime * 1000))}</>
        )}
      </p>

      <div className="panel" style={{ marginBottom: 24 }}>
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
                <td>{m.live && m.marketTime ? kst(new Date(m.marketTime * 1000)) : "-"}</td>
                <td>{m.source}</td>
                <td>
                  <RiskBadge risk={m.risk} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
