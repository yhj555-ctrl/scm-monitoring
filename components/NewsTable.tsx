"use client";

import { useMemo, useState } from "react";
import RiskBadge from "./RiskBadge";
import type { SupplierNewsItem } from "@/lib/data";
import { kstDateTime } from "@/lib/time";

type SortKey = "time" | "supplier" | "headline" | "source" | "risk";
type SortDir = "asc" | "desc";

const RISK_WEIGHT: Record<string, number> = { 상: 3, 중: 2, 하: 1 };

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "time", label: "게재 시각(KST)" },
  { key: "supplier", label: "공급업체" },
  { key: "headline", label: "내용" },
  { key: "source", label: "출처" },
  { key: "risk", label: "리스크" },
];

export default function NewsTable({ news }: { news: SupplierNewsItem[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "time" ? "desc" : "asc");
    }
  }

  const sorted = useMemo(() => {
    const rows = [...news];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "time":
          cmp = a.publishedTs - b.publishedTs;
          break;
        case "supplier":
          cmp = a.supplierName.localeCompare(b.supplierName, "ko");
          break;
        case "headline":
          cmp = a.headline.localeCompare(b.headline, "ko");
          break;
        case "source":
          cmp = a.sourceName.localeCompare(b.sourceName, "ko");
          break;
        case "risk":
          cmp = (RISK_WEIGHT[a.risk] ?? 0) - (RISK_WEIGHT[b.risk] ?? 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [news, sortKey, sortDir]);

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                className="sortable-th"
                onClick={() => toggleSort(c.key)}
                aria-sort={
                  sortKey === c.key ? (sortDir === "asc" ? "ascending" : "descending") : "none"
                }
              >
                {c.label}
                <span className="sort-arrow">
                  {sortKey === c.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                </span>
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
