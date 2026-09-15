"use client";

import { useSortableTable } from "./useSortableTable";
import type { SortColumn } from "./useSortableTable";
import type { FxRate } from "@/lib/data";
import { compareStr, compareNum } from "@/lib/sort-utils";

const COLUMNS: SortColumn<FxRate>[] = [
  { key: "currency", label: "통화", compare: (a, b) => compareStr(a.currency, b.currency) },
  { key: "rate", label: "환율", compare: (a, b) => compareNum(a.rate, b.rate) },
];

// 초기값은 어떤 컬럼과도 일치하지 않는 키를 줘서, 클릭 전까지는 API가 내려준 순서
// (원화 우선)를 그대로 보여줍니다 — useSortableTable 은 일치하는 컬럼이 없으면 원본 순서를 반환합니다.
export default function FxTable({ rates }: { rates: FxRate[] }) {
  const { sorted, thProps, Arrow } = useSortableTable(rates, COLUMNS, "__none__");

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
          {sorted.map((r) => (
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
  );
}
