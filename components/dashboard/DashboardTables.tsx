"use client";

import RiskBadge from "@/components/RiskBadge";
import { useSortableTable } from "@/components/useSortableTable";
import type { SortColumn } from "@/components/useSortableTable";
import { gradeToRisk } from "@/lib/suppliers";
import type { SupplierRecord } from "@/lib/suppliers";
import type { MaterialPrice, RiskLevel } from "@/lib/data";
import { RISK_WEIGHT, compareStr, compareNum } from "@/lib/sort-utils";

/* ── 업체평가 리스크 TOP5 ─────────────────────── */

const TOP_SUPPLIER_COLUMNS: SortColumn<SupplierRecord>[] = [
  { key: "name", label: "업체명", compare: (a, b) => compareStr(a.name, b.name) },
  { key: "category", label: "유형", compare: (a, b) => compareStr(a.category ?? "", b.category ?? "") },
  { key: "score", label: "종합점수", compare: (a, b) => compareNum(a.totalScore, b.totalScore), defaultDir: "desc" },
  { key: "grade", label: "최종등급", compare: (a, b) => compareStr(a.grade, b.grade) },
  {
    key: "risk",
    label: "리스크",
    compare: (a, b) => (RISK_WEIGHT[gradeToRisk(a.grade)] ?? 0) - (RISK_WEIGHT[gradeToRisk(b.grade)] ?? 0),
    defaultDir: "desc",
  },
];

export function TopRiskSuppliersTable({ suppliers }: { suppliers: SupplierRecord[] }) {
  const { sorted, thProps, Arrow } = useSortableTable(suppliers, TOP_SUPPLIER_COLUMNS, "score");
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {TOP_SUPPLIER_COLUMNS.map((c) => (
              <th key={c.key} {...thProps(c.key)}>
                {c.label}
                <Arrow columnKey={c.key} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
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
  );
}

/* ── 최근 수집 이슈 ────────────────────────────── */

export interface RecentEvent {
  id: string;
  ts: number;
  time: string;
  label: string;
  risk: RiskLevel;
}

const RECENT_EVENT_COLUMNS: SortColumn<RecentEvent>[] = [
  { key: "time", label: "시각(KST)", compare: (a, b) => compareNum(a.ts, b.ts), defaultDir: "desc" },
  { key: "label", label: "내용", compare: (a, b) => compareStr(a.label, b.label) },
  {
    key: "risk",
    label: "리스크",
    compare: (a, b) => (RISK_WEIGHT[a.risk] ?? 0) - (RISK_WEIGHT[b.risk] ?? 0),
    defaultDir: "desc",
  },
];

export function RecentEventsTable({ events }: { events: RecentEvent[] }) {
  const { sorted, thProps, Arrow } = useSortableTable(events, RECENT_EVENT_COLUMNS, "time");
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {RECENT_EVENT_COLUMNS.map((c) => (
              <th key={c.key} {...thProps(c.key)}>
                {c.label}
                <Arrow columnKey={c.key} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((e) => (
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
  );
}

/* ── 주요 원자재 시세 요약 ─────────────────────── */

const MATERIALS_SUMMARY_COLUMNS: SortColumn<MaterialPrice>[] = [
  { key: "name", label: "품목", compare: (a, b) => compareStr(a.materialName, b.materialName) },
  {
    key: "price",
    label: "현재가",
    compare: (a, b) => compareNum(a.live ? a.currentPrice : null, b.live ? b.currentPrice : null),
    defaultDir: "desc",
  },
  {
    key: "change",
    label: "변동률",
    compare: (a, b) => compareNum(a.live ? a.changeRate : null, b.live ? b.changeRate : null),
    defaultDir: "desc",
  },
  {
    key: "risk",
    label: "리스크",
    compare: (a, b) => (RISK_WEIGHT[a.risk] ?? 0) - (RISK_WEIGHT[b.risk] ?? 0),
    defaultDir: "desc",
  },
];

export function MaterialsSummaryTable({ materials }: { materials: MaterialPrice[] }) {
  const { sorted, thProps, Arrow } = useSortableTable(materials, MATERIALS_SUMMARY_COLUMNS, "name");
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {MATERIALS_SUMMARY_COLUMNS.map((c) => (
              <th key={c.key} {...thProps(c.key)}>
                {c.label}
                <Arrow columnKey={c.key} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
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
  );
}
