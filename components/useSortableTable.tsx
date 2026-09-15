"use client";

import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

export interface SortColumn<T> {
  key: string;
  label: string;
  compare: (a: T, b: T) => number;
  /** 이 열을 처음 클릭했을 때(또는 초기 정렬 기준일 때) 적용할 방향. 기본 asc. */
  defaultDir?: SortDir;
}

/**
 * 표/리스트 열 클릭 정렬 공용 훅. 정렬 상태만 관리하고, 실제 셀 렌더링은 각 컴포넌트가 맡습니다.
 * columns 는 컴포넌트 밖(모듈 스코프)에 상수로 선언해서 매 렌더마다 재생성되지 않게 하세요.
 */
export function useSortableTable<T>(
  items: T[],
  columns: SortColumn<T>[],
  initialKey?: string
) {
  const startKey = initialKey ?? columns[0]?.key ?? "";
  const startCol = columns.find((c) => c.key === startKey);
  const [sortKey, setSortKey] = useState<string>(startKey);
  const [sortDir, setSortDir] = useState<SortDir>(startCol?.defaultDir ?? "asc");

  function toggleSort(key: string) {
    const col = columns.find((c) => c.key === key);
    if (!col) return;
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(col.defaultDir ?? "asc");
    }
  }

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return items;
    const rows = [...items];
    rows.sort((a, b) => (sortDir === "asc" ? col.compare(a, b) : -col.compare(a, b)));
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sortKey, sortDir]);

  function thProps(key: string) {
    const active = sortKey === key;
    return {
      className: "sortable-th",
      onClick: () => toggleSort(key),
      "aria-sort": (active ? (sortDir === "asc" ? "ascending" : "descending") : "none") as
        | "ascending"
        | "descending"
        | "none",
    };
  }

  function Arrow({ columnKey }: { columnKey: string }) {
    if (sortKey !== columnKey) return null;
    return <span className="sort-arrow">{sortDir === "asc" ? " ▲" : " ▼"}</span>;
  }

  return { sorted, sortKey, sortDir, toggleSort, thProps, Arrow };
}
