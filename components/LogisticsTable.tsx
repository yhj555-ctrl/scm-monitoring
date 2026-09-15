"use client";

import RiskBadge from "./RiskBadge";
import { useSortableTable } from "./useSortableTable";
import type { SortColumn } from "./useSortableTable";
import type { LogisticsItem } from "@/lib/data";
import { RISK_WEIGHT, compareStr, compareNum } from "@/lib/sort-utils";

const STATUS_WEIGHT: Record<string, number> = { 정상: 1, 지연: 2, "지연 심각": 3 };

const COLUMNS: SortColumn<LogisticsItem>[] = [
  { key: "route", label: "구간", compare: (a, b) => compareStr(a.route, b.route) },
  { key: "lane", label: "방향", compare: (a, b) => compareStr(a.lane, b.lane) },
  { key: "carrier", label: "운송사", compare: (a, b) => compareStr(a.carrier, b.carrier) },
  { key: "mode", label: "모드", compare: (a, b) => compareStr(a.mode, b.mode) },
  {
    key: "leadTime",
    label: "현재 리드타임",
    compare: (a, b) => compareNum(a.leadTimeDays, b.leadTimeDays),
    defaultDir: "desc",
  },
  { key: "baseline", label: "평시", compare: (a, b) => compareNum(a.baselineDays, b.baselineDays) },
  {
    key: "delay",
    label: "평시 대비",
    compare: (a, b) => compareNum(a.delayDays, b.delayDays),
    defaultDir: "desc",
  },
  {
    key: "status",
    label: "상태",
    compare: (a, b) => (STATUS_WEIGHT[a.status] ?? 0) - (STATUS_WEIGHT[b.status] ?? 0),
    defaultDir: "desc",
  },
  {
    key: "risk",
    label: "리스크",
    compare: (a, b) => (RISK_WEIGHT[a.risk] ?? 0) - (RISK_WEIGHT[b.risk] ?? 0),
    defaultDir: "desc",
  },
];

export default function LogisticsTable({ rows }: { rows: LogisticsItem[] }) {
  const { sorted, thProps, Arrow } = useSortableTable(rows, COLUMNS, "route");

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c.key} {...thProps(c.key)}>
                {c.label}
                <Arrow columnKey={c.key} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((l) => (
            <tr key={l.id}>
              <td>
                {l.route}
                {l.note && <span className="grade-text">{l.note}</span>}
              </td>
              <td>{l.lane}</td>
              <td>{l.carrier}</td>
              <td>{l.mode}</td>
              <td>{l.leadTimeDays}일</td>
              <td>{l.baselineDays}일</td>
              <td className={l.delayDays > 0 ? "change-up" : "change-down"}>
                {l.delayDays > 0 ? `+${l.delayDays}일` : "정상"}
              </td>
              <td>{l.status}</td>
              <td>
                <RiskBadge risk={l.risk} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
