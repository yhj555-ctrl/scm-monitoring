import Link from "next/link";
import ClickableMetricCard from "@/components/ClickableMetricCard";
import type { MetricListItem } from "@/components/ClickableMetricCard";
import SummaryPanel from "@/components/SummaryPanel";
import DonutChart from "@/components/charts/DonutChart";
import BarChart from "@/components/charts/BarChart";
import {
  TopRiskSuppliersTable,
  RecentEventsTable,
  MaterialsSummaryTable,
} from "@/components/dashboard/DashboardTables";
import {
  fetchDashboardSummary,
  fetchSupplierNews,
  fetchLogisticsStatus,
  fetchMaterialPrices,
} from "@/lib/data";
import { suppliers, gradeToRisk, riskCounts } from "@/lib/suppliers";
import { kstDateTime } from "@/lib/time";
import { shortMaterialName } from "@/lib/format";
import { RISK_COLOR, GRADE_COLOR } from "@/lib/chart-colors";

export const revalidate = 86400; // 하루 캐시 + 매일 08:00(KST) /api/cron/refresh 로 강제 갱신

export default async function DashboardPage() {
  const [summary, news, logistics, materials] = await Promise.all([
    fetchDashboardSummary(),
    fetchSupplierNews(),
    fetchLogisticsStatus(),
    fetchMaterialPrices(),
  ]);

  const allRecentEvents = [
    ...news
      .filter((n) => n.publishedTs > 0)
      .map((n) => ({
        id: n.id,
        ts: n.publishedTs,
        time: kstDateTime(new Date(n.publishedTs)),
        label: `${n.supplierName} · ${n.headline}`,
        risk: n.risk,
      })),
    ...logistics.map((l) => ({
      id: l.id,
      ts: Number.MAX_SAFE_INTEGER, // 오늘자 스냅샷 — 항상 상단
      time: l.updatedAt,
      label: `${l.route} · ${l.status}`,
      risk: l.risk,
    })),
  ].sort((a, b) => b.ts - a.ts);
  const recentEvents = allRecentEvents.slice(0, 6);

  const topRiskSuppliers = [...suppliers]
    .filter((s) => gradeToRisk(s.grade) !== "하")
    .sort((a, b) => (a.totalScore ?? 999) - (b.totalScore ?? 999))
    .slice(0, 5);

  const counts = riskCounts();
  const riskDonutData = (["상", "중", "하"] as const).map((tier) => ({
    label: `리스크 ${tier}`,
    value: counts[tier],
    color: RISK_COLOR[tier],
  }));
  const top5BarData = topRiskSuppliers.map((s) => ({
    label: s.name,
    value: s.totalScore ?? 0,
    color: GRADE_COLOR[s.grade],
  }));

  const materialsHighRisk = materials.filter((m) => m.risk === "상").length;
  const liveMaterials = materials.filter((m) => m.live);
  const topMover =
    liveMaterials.length > 0
      ? liveMaterials.reduce((a, b) => (Math.abs(b.changeRate) > Math.abs(a.changeRate) ? b : a))
      : null;
  const severeLogistics = logistics.filter((l) => l.status === "지연 심각").length;
  const delayedLogistics = logistics.filter((l) => l.status === "지연").length;

  const totalBreakdownItems: MetricListItem[] = [
    { id: "materials", primary: "원자재 · 반도체 시세", secondary: "실시간 시세 모니터링 품목", tag: `${materials.length}건` },
    { id: "news", primary: "공급업체 뉴스", secondary: "최근 1년 이내 수집 기사", tag: `${news.length}건` },
    { id: "logistics", primary: "물류 리드타임 구간", secondary: "권역별 리드타임 모니터링", tag: `${logistics.length}건` },
    { id: "suppliers", primary: "공급업체", secondary: "AI 평가기준 스코어링 대상", tag: `${suppliers.length}개` },
  ];

  const highRiskItems: MetricListItem[] = [
    ...materials
      .filter((m) => m.risk === "상")
      .map((m) => ({
        id: `mat-${m.id}`,
        primary: shortMaterialName(m.materialName),
        secondary: `원자재 · 반도체 · 변동률 ${m.changeRate >= 0 ? "+" : ""}${m.changeRate}%`,
        tag: "리스크 상",
        tagTone: "danger" as const,
      })),
    ...news
      .filter((n) => n.risk === "상")
      .map((n) => ({
        id: `news-${n.id}`,
        primary: `${n.supplierName} · ${n.headline}`,
        secondary: "공급업체 뉴스",
        tag: "리스크 상",
        tagTone: "danger" as const,
      })),
    ...logistics
      .filter((l) => l.risk === "상")
      .map((l) => ({
        id: `log-${l.id}`,
        primary: `${l.region} · ${l.route}`,
        secondary: `물류 · ${l.status}`,
        tag: "리스크 상",
        tagTone: "danger" as const,
      })),
    ...suppliers
      .filter((s) => gradeToRisk(s.grade) === "상")
      .map((s) => ({
        id: `sup-${s.id}`,
        primary: s.name,
        secondary: `공급업체 · ${s.category ?? "-"}`,
        tag: s.grade,
        tagTone: "danger" as const,
      })),
  ];

  const supplierListItems: MetricListItem[] = [...suppliers]
    .sort((a, b) => (a.totalScore ?? 999) - (b.totalScore ?? 999))
    .map((s) => ({
      id: s.id,
      primary: s.name,
      secondary: `${s.category ?? "-"} · 담당 ${s.manager ?? "-"} · 종합점수 ${s.totalScore ?? "-"}`,
      tag: s.grade,
      tagTone:
        gradeToRisk(s.grade) === "상" ? "danger" : gradeToRisk(s.grade) === "중" ? "warn" : "good",
    }));

  const recentUpdateItems: MetricListItem[] = allRecentEvents.map((e) => ({
    id: e.id,
    primary: e.label,
    secondary: e.time,
    tag: `리스크 ${e.risk}`,
    tagTone: e.risk === "상" ? "danger" : e.risk === "중" ? "warn" : "good",
  }));

  const summaryLines = [
    `오늘 총 ${summary.totalMonitoredItems}건 모니터링 중, 리스크 [상] ${summary.highRiskCount}건 발생.`,
    `공급업체 ${suppliers.length}개 중 위험 등급 ${counts["상"]}개 · 유의 등급 ${counts["중"]}개.`,
    topMover
      ? `원자재 중 ${shortMaterialName(topMover.materialName)}가 ${topMover.changeRate >= 0 ? "+" : ""}${topMover.changeRate}%로 변동폭이 가장 큼 (리스크 상 품목 ${materialsHighRisk}개).`
      : `원자재 리스크 상 품목 ${materialsHighRisk}개.`,
    `물류 ${logistics.length}개 구간 중 지연 심각 ${severeLogistics}건 · 지연 ${delayedLogistics}건.`,
  ];

  return (
    <>
      <h1>SCM 리스크 모니터링 대시보드</h1>
      <p className="page-subtitle">공급업체 · 원자재 · 환율 · 물류 통합 리스크 현황</p>
      <p className="page-meta">
        마지막 갱신 시각(KST): <strong>{kstDateTime(new Date())}</strong> · 매일 08:00(KST) 자동 갱신
      </p>

      <SummaryPanel lines={summaryLines} />

      <div className="metric-grid">
        <ClickableMetricCard
          label="총 모니터링 항목"
          value={`${summary.totalMonitoredItems}건`}
          modalTitle="총 모니터링 항목 구성"
          modalSubtitle="카테고리별 모니터링 대상 건수"
          items={totalBreakdownItems}
        />
        <ClickableMetricCard
          label="리스크 [상] 발생"
          value={`${summary.highRiskCount}건`}
          tone={summary.highRiskCount > 0 ? "danger" : "default"}
          modalTitle="리스크 [상] 발생 항목"
          modalSubtitle="원자재 · 공급업체 뉴스 · 물류 · 공급업체 평가 전체 기준"
          items={highRiskItems}
        />
        <ClickableMetricCard
          label="관리 대상 공급업체"
          value={`${summary.activeSuppliers}개`}
          modalTitle="관리 대상 공급업체 목록"
          modalSubtitle="종합점수 낮은순(고위험 우선) 정렬"
          items={supplierListItems}
        />
        <ClickableMetricCard
          label="최근 24시간 업데이트"
          value={`${summary.recentlyUpdated}건`}
          modalTitle="최근 업데이트 항목"
          modalSubtitle="공급업체 뉴스 + 물류 구간 업데이트"
          items={recentUpdateItems}
        />
      </div>

      <div className="panel">
        <div className="panel-header">리스크 한눈에 보기</div>
        <div className="chart-panel-body chart-row">
          <div>
            <div className="chart-subtitle">공급업체 리스크 등급 분포</div>
            <DonutChart data={riskDonutData} centerLabel="전체 업체" centerValue={`${suppliers.length}개`} />
          </div>
          <div>
            <div className="chart-subtitle">위험·유의 업체 TOP5 종합점수</div>
            <BarChart data={top5BarData} orientation="horizontal" />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header panel-header-link">
          <span>업체평가 리스크 TOP 5</span>
          <Link href="/suppliers" className="panel-link">
            전체 {suppliers.length}개 보기 →
          </Link>
        </div>
        <TopRiskSuppliersTable suppliers={topRiskSuppliers} />
      </div>

      <div className="panel">
        <div className="panel-header">최근 수집 이슈 (열 클릭 시 정렬)</div>
        <RecentEventsTable events={recentEvents} />
      </div>

      <div className="panel">
        <div className="panel-header panel-header-link">
          <span>주요 원자재 시세 요약</span>
          <Link href="/materials" className="panel-link">
            원자재 · 환율 전체 →
          </Link>
        </div>
        <MaterialsSummaryTable materials={materials} />
      </div>
    </>
  );
}
