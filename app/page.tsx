import Link from "next/link";
import MetricCard from "@/components/MetricCard";
import RiskBadge from "@/components/RiskBadge";
import {
  fetchDashboardSummary,
  fetchSupplierNews,
  fetchLogisticsStatus,
  fetchMaterialPrices,
} from "@/lib/data";
import { suppliers, gradeToRisk } from "@/lib/suppliers";

export const revalidate = 1800; // 30분 캐시 + 매일 09:00(KST) /api/cron/refresh 로 강제 갱신

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

  const topRiskSuppliers = [...suppliers]
    .filter((s) => gradeToRisk(s.grade) !== "하")
    .sort((a, b) => (a.totalScore ?? 999) - (b.totalScore ?? 999))
    .slice(0, 5);

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
        <div className="panel-header panel-header-link">
          <span>업체평가 리스크 TOP 5</span>
          <Link href="/suppliers" className="panel-link">
            전체 {suppliers.length}개 보기 →
          </Link>
        </div>
        <table>
          <thead>
            <tr>
              <th>업체명</th>
              <th>유형</th>
              <th>종합점수</th>
              <th>최종등급</th>
              <th>리스크</th>
            </tr>
          </thead>
          <tbody>
            {topRiskSuppliers.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.category ?? "-"}</td>
                <td>{s.totalScore ?? "-"}</td>
                <td>{s.grade}</td>
                <td>
                  <RiskBadge risk={gradeToRisk(s.grade)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                  {m.live
                    ? `${m.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${m.unit}`
                    : "-"}
                </td>
                <td className={m.changeRate >= 0 ? "change-up" : "change-down"}>
                  {m.live ? `${m.changeRate >= 0 ? "+" : ""}${m.changeRate}%` : "-"}
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
