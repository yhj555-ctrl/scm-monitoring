import RiskBadge from "@/components/RiskBadge";
import { fetchMaterialPrices, fetchExchangeRates } from "@/lib/data";

// 이 페이지는 외부 실시간 소스(Yahoo Finance, Frankfurter.app)를 호출합니다.
// 매 요청마다 최대 30분 캐시된 값을 쓰고, 매일 09시(KST)에 /api/cron/refresh 가 캐시를 무효화합니다.
export const revalidate = 1800;

export default async function MaterialsPage() {
  const [materials, fx] = await Promise.all([fetchMaterialPrices(), fetchExchangeRates()]);

  return (
    <>
      <h1>원자재 · 환율 모니터링</h1>
      <p className="page-subtitle">
        Yahoo Finance / Frankfurter.app 실시간 조회 · 30분 캐시, 매일 09:00(KST) 자동 갱신
      </p>

      <div className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-header panel-header-link">
          <span>환율 (1 USD 기준)</span>
          <span className="panel-link" style={{ cursor: "default" }}>
            {fx.live ? `기준일 ${fx.asOf}` : fx.asOf}
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
      </div>

      <div className="panel">
        <div className="panel-header">주요 원자재/지표 시세</div>
        <table>
          <thead>
            <tr>
              <th>품목</th>
              <th>현재가</th>
              <th>변동률</th>
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
