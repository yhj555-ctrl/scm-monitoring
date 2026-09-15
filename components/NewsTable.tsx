"use client";

import RiskBadge from "./RiskBadge";
import { useSortableTable } from "./useSortableTable";
import type { SortColumn } from "./useSortableTable";
import type { SupplierNewsItem } from "@/lib/data";
import { kstDateTime } from "@/lib/time";
import { RISK_WEIGHT, compareStr, compareNum } from "@/lib/sort-utils";

const COLUMNS: SortColumn<SupplierNewsItem>[] = [
  { key: "time", label: "게재 시각(KST)", compare: (a, b) => compareNum(a.publishedTs, b.publishedTs), defaultDir: "desc" },
  { key: "supplier", label: "공급업체", compare: (a, b) => compareStr(a.supplierName, b.supplierName) },
  { key: "headline", label: "내용", compare: (a, b) => compareStr(a.headline, b.headline) },
  { key: "source", label: "출처", compare: (a, b) => compareStr(a.sourceName, b.sourceName) },
  {
    key: "risk",
    label: "리스크",
    compare: (a, b) => (RISK_WEIGHT[a.risk] ?? 0) - (RISK_WEIGHT[b.risk] ?? 0),
  },
];

export default function NewsTable({ news }: { news: SupplierNewsItem[] }) {
  const { sorted, thProps, Arrow } = useSortableTable(news, COLUMNS, "time");

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
          {sorted.map((n) => (
            <tr key={n.id}>
              <td>
                {n.publishedAt && n.publishedAt !== "-"
                  ? kstDateTime(new Date(n.publishedAt))
                  : "-"}
              </td>
              <td>{n.supplierName}</td>
              <td>
                {n.link ? (
                  <a
                    href={n.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="panel-link"
                  >
                    {n.headline}
                  </a>
                ) : (
                  n.headline
                )}
              </td>
              <td>{n.sourceName}</td>
              <td>
                <RiskBadge risk={n.risk} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
