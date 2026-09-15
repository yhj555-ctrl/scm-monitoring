"use client";

import { useSortableTable } from "./useSortableTable";
import type { SortColumn } from "./useSortableTable";
import { kstDateTime } from "@/lib/time";
import { compareStr, compareNum } from "@/lib/sort-utils";

export interface SortableNewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  publishedTs: number;
}

/**
 * 카드형(뉴스 리스트) 컴포넌트의 정렬 UI. 표가 아니라 리스트라 클릭할 "열 머리글"이 없으므로,
 * 대신 상단에 정렬 기준 버튼(게재시각·제목·출처)을 두고 클릭할 때마다 오름/내림차순을 토글합니다.
 */
export default function SortableNewsList<T extends SortableNewsItem>({
  items,
  metaKey,
  emptyMessage = "현재 수집된 뉴스가 없습니다. 다음 갱신(매일 08:00 KST) 때 다시 시도합니다.",
}: {
  items: T[];
  /** 뉴스 메타 첫 칸에 보여줄 필드 이름 (예: "topic", "company"). 서버 컴포넌트에서
   * 클라이언트 컴포넌트로는 함수를 props 로 넘길 수 없어, 함수 대신 필드명 문자열을 받습니다. */
  metaKey: keyof T;
  emptyMessage?: string;
}) {
  const columns: SortColumn<T>[] = [
    {
      key: "time",
      label: "게재시각",
      compare: (a, b) => compareNum(a.publishedTs, b.publishedTs),
      defaultDir: "desc",
    },
    { key: "title", label: "제목", compare: (a, b) => compareStr(a.title, b.title) },
    { key: "source", label: "출처", compare: (a, b) => compareStr(a.source, b.source) },
  ];
  const { sorted, sortKey, sortDir, toggleSort } = useSortableTable(items, columns, "time");

  if (items.length === 0) {
    return <div className="panel-footnote">{emptyMessage}</div>;
  }

  return (
    <>
      <div className="list-sort-bar">
        <span>정렬</span>
        {columns.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`list-sort-btn${sortKey === c.key ? " active" : ""}`}
            onClick={() => toggleSort(c.key)}
          >
            {c.label}
            {sortKey === c.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
          </button>
        ))}
      </div>
      <ul className="news-list">
        {sorted.map((n) => (
          <li key={n.id}>
            <a href={n.link} target="_blank" rel="noopener noreferrer" className="news-headline">
              {n.title}
            </a>
            <div className="news-meta">
              <span>{String(n[metaKey])}</span>
              <span className="dot">{n.source}</span>
              <span className="dot">
                {n.publishedAt ? kstDateTime(new Date(n.publishedAt)) : "게재시각 미상"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
