"use client";

import RiskBadge from "./RiskBadge";
import { useSortableTable } from "./useSortableTable";
import type { SortColumn } from "./useSortableTable";
import type { MaterialPrice } from "@/lib/data";
import { kstDateTime } from "@/lib/time";
import { RISK_WEIGHT, compareStr, compareNum } from "@/lib/sort-utils";

const COLUMNS: SortColumn<MaterialPrice>[] = [
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
    key: "marketTime",
    label: "기준시각(KST)",
    compare: (a, b) => compareNum(a.marketTime, b.marketTime),
    defaultDir: "desc",
  },
  { key: "source", label: "출처", compare: (a, b) => compareStr(a.source, b.source) },
  {
    key: "risk",
    label: "리스크",
    compare: (a, b) => (RISK_WEIGHT[a.risk] ?? 0) - (RISK_WEIGHT[b.risk] ?? 0),
    defaultDir: "desc",
  },
];

export default function MaterialsTable({ items }: { items: MaterialPrice[] }) {
  const { sorted, thProps, Arrow } = useSortableTable(items, COLUMNS, "name");

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
          {sorted.map((m) => (
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
              <td>{m.live && m.marketTime ? kstDateTime(new Date(m.marketTime * 1000)) : "-"}</td>
              <td>{m.source}</td>
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
