import LogisticsTable from "@/components/LogisticsTable";
import GroupedBarChart from "@/components/charts/GroupedBarChart";
import DonutChart from "@/components/charts/DonutChart";
import SummaryPanel from "@/components/SummaryPanel";
import { fetchLogisticsStatus } from "@/lib/data";
import type { LogisticsRegion, LogisticsItem } from "@/lib/data";
import { kstDateTime } from "@/lib/time";
import { REGION_COLOR } from "@/lib/chart-colors";

// 매일 08:00(KST) 기준 스냅샷. 하루 캐시 + /api/cron/refresh 로 갱신.
export const revalidate = 86400;

const REGION_ORDER: LogisticsRegion[] = ["중국", "대만", "미국", "유럽", "대한민국"];
const STATUS_ORDER: { status: LogisticsItem["status"]; color: string }[] = [
  { status: "정상", color: "var(--low)" },
  { status: "지연", color: "var(--mid)" },
  { status: "지연 심각", color: "var(--danger)" },
];

function avg(rows: LogisticsItem[], key: "leadTimeDays" | "baselineDays"): number {
  const sum = rows.reduce((s, r) => s + r[key], 0);
  return Math.round((sum / rows.length) * 10) / 10;
}

export default async function LogisticsPage() {
  const shipments = await fetchLogisticsStatus();
  const refreshedAt = kstDateTime(new Date());

  const grouped = REGION_ORDER.map((region) => ({
    region,
    rows: shipments.filter((s) => s.region === region),
  })).filter((g) => g.rows.length > 0);

  const regionLeadTimeGroups = grouped.map((g) => ({
    label: g.region,
    a: avg(g.rows, "leadTimeDays"),
    b: avg(g.rows, "baselineDays"),
  }));

  const statusDonutData = STATUS_ORDER.map(({ status, color }) => ({
    label: status,
    value: shipments.filter((s) => s.status === status).length,
    color,
  }));

  const severeCount = shipments.filter((s) => s.status === "지연 심각").length;
  const delayedCount = shipments.filter((s) => s.status === "지연").length;
  const worst =
    shipments.length > 0
      ? shipments.reduce((a, b) => (b.leadTimeDays - b.baselineDays > a.leadTimeDays - a.baselineDays ? b : a))
      : null;
  const overallAvgLead = shipments.length > 0 ? avg(shipments, "leadTimeDays") : 0;
  const overallAvgBaseline = shipments.length > 0 ? avg(shipments, "baselineDays") : 0;

  const summaryLines = [
    `전체 ${shipments.length}개 구간 중 지연 심각 ${severeCount}건 · 지연 ${delayedCount}건.`,
    worst
      ? `지연 폭이 가장 큰 구간: ${worst.region} ${worst.route} (평시 대비 +${(worst.leadTimeDays - worst.baselineDays).toFixed(1)}일, 현재 ${worst.status}).`
      : "구간별 지연 데이터가 없습니다.",
    `전체 구간 평균 리드타임 ${overallAvgLead}일 (평시 ${overallAvgBaseline}일).`,
    `스냅샷 기준일 ${shipments[0]?.updatedAt ?? "-"} · 매일 08:00(KST) 갱신.`,
  ];

  return (
    <>
      <h1>물류 리드타임 모니터링</h1>
      <p className="page-subtitle">
        대한민국 기준 중국 · 대만 · 미국 · 유럽 · 국내 구간의 리드타임·지연 리스크 (매일 08:00 KST 갱신)
      </p>
      <p className="page-meta">
        마지막 갱신 시각(KST): <strong>{refreshedAt}</strong> · 스냅샷 기준일{" "}
        {shipments[0]?.updatedAt ?? "-"} · 리드타임은 모두 대한민국 문전 기준
      </p>

      <SummaryPanel lines={summaryLines} />

      <div className="panel">
        <div className="panel-header">구간별 리드타임 시각화</div>
        <div className="chart-panel-body chart-row">
          <div>
            <div className="chart-subtitle">지역 평균 리드타임: 현재 vs 평시(일)</div>
            <GroupedBarChart
              groups={regionLeadTimeGroups}
              aLabel="현재"
              bLabel="평시"
              aColorFor={(label) => REGION_COLOR[label as LogisticsRegion] ?? "var(--accent)"}
              unit="일"
            />
          </div>
          <div>
            <div className="chart-subtitle">전체 구간 상태 구성</div>
            <DonutChart data={statusDonutData} centerLabel="전체 구간" centerValue={`${shipments.length}건`} />
          </div>
        </div>
      </div>

      {grouped.map((g) => (
        <div className="panel" key={g.region}>
          <div className="panel-header">
            <span className="region-dot" style={{ background: REGION_COLOR[g.region] }} />
            {g.region === "대한민국" ? "대한민국 국내" : `${g.region} ↔ 대한민국`} 구간 (열 클릭
            시 정렬)
          </div>
          <LogisticsTable rows={g.rows} />
        </div>
      ))}

      <div className="panel">
        <div className="panel-footnote">
          현재 화면은 목업 스냅샷입니다. 실제 연동 시 선사·포워더 스케줄 API, Freightos/Drewry
          운임지수, 미국·유럽 항만 대기 데이터, 관세청 통관 정보를 `lib/data.ts` 의
          `fetchLogisticsStatus` 에 연결하세요.
        </div>
      </div>
    </>
  );
}
