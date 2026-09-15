"use client";

import { useMemo, useState } from "react";
import { suppliers, gradeToRisk } from "@/lib/suppliers";
import type { SupplierGrade, SupplierRecord } from "@/lib/suppliers";
import type { DartResult } from "@/lib/data";
import RiskBadge from "./RiskBadge";
import SupplierDetailModal from "./SupplierDetailModal";
import { useSortableTable } from "./useSortableTable";
import type { SortColumn } from "./useSortableTable";
import { fmtWon, fmtPct } from "@/lib/format";
import { compareStr, compareNum } from "@/lib/sort-utils";

const GRADE_OPTIONS: (SupplierGrade | "전체")[] = [
  "전체",
  "최우수 (Excellent)",
  "우수 (Good)",
  "보통 (Normal)",
  "유의 (Caution)",
  "위험 (Risk)",
  "위험 (Risk) - 과락",
  "점수 오류",
];

/** 공시정보 정렬용 가중치: 신규 > 과거 있음 > 매칭없음/미설정. */
function disclosureWeight(supplierId: string, disclosures: DartResult): number {
  if (!disclosures.configured || !disclosures.ok) return -1;
  const d = disclosures.bySupplierId[supplierId];
  if (!d || d.filings.length === 0) return 0;
  return d.hasRecent ? 2 : 1;
}

export default function SupplierTable({ disclosures }: { disclosures: DartResult }) {
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState<(typeof GRADE_OPTIONS)[number]>("전체");
  const [selected, setSelected] = useState<SupplierRecord | null>(null);

  const dartConfigured = disclosures.configured === true;

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      const matchesQuery =
        query.trim() === "" ||
        s.name.includes(query.trim()) ||
        (s.category ?? "").includes(query.trim()) ||
        (s.manager ?? "").includes(query.trim());
      const matchesGrade = grade === "전체" || s.grade === grade;
      return matchesQuery && matchesGrade;
    });
  }, [query, grade]);

  // disclosures 를 정렬 비교식에서 참조해야 해서 컴포넌트 안에서 매 렌더마다 구성합니다
  // (99개 정도 규모라 재구성 비용은 무시할 수준입니다).
  const columns: SortColumn<SupplierRecord>[] = [
    { key: "name", label: "업체명", compare: (a, b) => compareStr(a.name, b.name) },
    { key: "category", label: "유형", compare: (a, b) => compareStr(a.category ?? "", b.category ?? "") },
    { key: "manager", label: "담당 MD", compare: (a, b) => compareStr(a.manager ?? "", b.manager ?? "") },
    {
      key: "contract",
      label: "25년 계약금액",
      compare: (a, b) => compareNum(a.contractAmount25, b.contractAmount25),
      defaultDir: "desc",
    },
    {
      key: "debt",
      label: "부채비율",
      compare: (a, b) => compareNum(a.debtRatio, b.debtRatio),
      defaultDir: "desc",
    },
    {
      key: "margin",
      label: "영업이익률",
      compare: (a, b) => compareNum(a.operatingMargin, b.operatingMargin),
      defaultDir: "desc",
    },
    {
      key: "growth",
      label: "매출액 성장률",
      compare: (a, b) => compareNum(a.revenueGrowth, b.revenueGrowth),
      defaultDir: "desc",
    },
    {
      key: "score",
      label: "종합점수",
      compare: (a, b) => compareNum(a.totalScore, b.totalScore),
      defaultDir: "desc",
    },
    { key: "grade", label: "최종등급", compare: (a, b) => compareStr(a.grade, b.grade) },
    {
      key: "dart",
      label: "공시정보",
      compare: (a, b) => disclosureWeight(a.id, disclosures) - disclosureWeight(b.id, disclosures),
      defaultDir: "desc",
    },
  ];

  const { sorted, thProps, Arrow } = useSortableTable(filtered, columns, "score");

  function disclosureCell(supplierId: string) {
    if (!disclosures.configured) return <span className="dart-cell-muted">미설정</span>;
    if (!disclosures.ok) return <span className="dart-cell-muted">조회 실패</span>;
    const d = disclosures.bySupplierId[supplierId];
    if (!d || d.filings.length === 0) return <span className="dart-cell-muted">매칭 없음</span>;
    if (d.hasRecent) {
      return <span className="badge badge-high">신규 {d.filings.length}건</span>;
    }
    return (
      <span className="dart-cell-has">
        {d.filings.length}건 · {d.latestDate}
      </span>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header supplier-controls">
        <span>
          공급업체 평가 리스트 ({sorted.length}/{suppliers.length}개)
        </span>
        <div className="supplier-filters">
          <input
            className="supplier-search"
            placeholder="업체명·유형·담당MD 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="supplier-select"
            value={grade}
            onChange={(e) => setGrade(e.target.value as (typeof GRADE_OPTIONS)[number])}
          >
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="table-hint">
        열 제목을 클릭하면 정렬됩니다. 행을 클릭하면 '24 / '25년 재무·평가 상세를 볼 수 있습니다.
      </p>

      <div className="supplier-table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} {...thProps(c.key)}>
                  {c.label}
                  <Arrow columnKey={c.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.id} className="clickable-row" onClick={() => setSelected(s)}>
                <td>{s.name}</td>
                <td>{s.category ?? "-"}</td>
                <td>{s.manager ?? "-"}</td>
                <td>{fmtWon(s.contractAmount25)}</td>
                <td>{fmtPct(s.debtRatio)}</td>
                <td>{fmtPct(s.operatingMargin)}</td>
                <td>{fmtPct(s.revenueGrowth)}</td>
                <td>{s.totalScore ?? "-"}</td>
                <td>
                  <RiskBadge risk={gradeToRisk(s.grade)} />
                  <span className="grade-text">{s.grade}</span>
                </td>
                <td>{disclosureCell(s.id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <SupplierDetailModal
          supplier={selected}
          disclosure={
            disclosures.configured && disclosures.ok
              ? disclosures.bySupplierId[selected.id]
              : undefined
          }
          dartConfigured={dartConfigured}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
