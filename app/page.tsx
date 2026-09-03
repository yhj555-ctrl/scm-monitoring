import MetricCard from "@/components/MetricCard";
import RiskBadge from "@/components/RiskBadge";
import {
  fetchDashboardSummary,
  fetchSupplierNews,
  fetchLogisticsStatus,
  fetchMaterialPrices,
} from "@/lib/data";

export const revalidate = 300; // 5분마다 재검증 (실 API 연동 시 조정)

export default async function DashboardPage() {
  const [summary, news, logistics, materials] = await Promise.all([
    fetchDashboardSummary(),
    fetchSupplierNews(),
    fetchLogisticsStatus(),
    fetchMaterialPrices(),
  ]);

  const recentEvents = [
    ...news.map((n) => ({
      id: n.id,
      time: n.publishedAt,
      label: `${n.supplierName} · ${n.headline}`,
      risk: n.risk,
    })),
    ...logistics.map((l) => ({
      id: l.id,
      time: l.updatedAt,
      label: `${l.route} · ${l.status}`,
      risk: l.risk,
    })),
  ]
    .sort((a, b) => (a.time < b.time ? 1 : -1))
    .slice(0, 6);

  return (
    <>
      <h1>SCM 리스크 모니터링 대시보드</h1>
      <p className="page-subtitle">공급업체 · 원자재 · 물류 · 입찰 통합 리스크 현황</p>

      <div className="metric-grid">
        <MetricCard label="총 모니터링 항목" value={`${summary.totalMonitoredItems}건`} />
        <MetricCard
          label="리스크 [상] 발생"
          value={`${summary.highRiskCount}건`}
          tone={summary.highRiskCount > 0 ? "danger" : "default"}
        />
        <MetricCard label="관리 대상 공급업체" value={`${summary.activeSuppliers}개`} />
        <MetricCard label="최근 24시간 업데이트" value={`${summary.recentlyUpdated}건`} />
      </div>

      <div className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-header">최근 수집 이슈</div>
        <table>
          <thead>
            <tr>
              <th>시각</th>
              <th>내용</th>
              <th>리스크</th>
            </tr>
          </thead>
          <tbody>
            {recentEvents.map((e) => (
              <tr key={e.id}>
                <td>{e.time}</td>
                <td>{e.label}</td>
                <td>
                  <RiskBadge risk={e.risk} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="panel-header">주요 원자재 시세 요약</div>
        <table>
          <thead>
            <tr>
              <th>품목</th>
              <th>현재가</th>
              <th>변동률</th>
              <th>리스크</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => (
              <tr key={m.id}>
                <td>{m.materialName}</td>
                <td>
                  {m.currentPrice.toLocaleString()} {m.unit}
                </td>
                <td className={m.changeRate >= 0 ? "change-up" : "change-down"}>
                  {m.changeRate >= 0 ? "+" : ""}
                  {m.changeRate}%
                </td>
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
