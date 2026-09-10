"use client";

import { useMemo, useState } from "react";
import { suppliers, gradeToRisk } from "@/lib/suppliers";
import type { SupplierGrade, SupplierRecord } from "@/lib/suppliers";
import type { DartResult } from "@/lib/data";
import RiskBadge from "./RiskBadge";
import SupplierDetailModal from "./SupplierDetailModal";
import { fmtWon, fmtPct } from "@/lib/format";

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

export default function SupplierTable({ disclosures }: { disclosures: DartResult }) {
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState<(typeof GRADE_OPTIONS)[number]>("전체");
  const [sortDesc, setSortDesc] = useState(true);
  const [selected, setSelected] = useState<SupplierRecord | null>(null);

  const dartConfigured = disclosures.configured === true;

  const filtered = useMemo(() => {
    let rows = suppliers.filter((s) => {
      const matchesQuery =
        query.trim() === "" ||
        s.name.includes(query.trim()) ||
        (s.category ?? "").includes(query.trim()) ||
        (s.manager ?? "").includes(query.trim());
      const matchesGrade = grade === "전체" || s.grade === grade;
      return matchesQuery && matchesGrade;
    });
    rows = [...rows].sort((a, b) => {
      const av = a.totalScore ?? -1;
      const bv = b.totalScore ?? -1;
      return sortDesc ? bv - av : av - bv;
    });
    return rows;
  }, [query, grade, sortDesc]);

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
          공급업체 평가 리스트 ({filtered.length}/{suppliers.length}개)
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
          <button className="supplier-sort-btn" onClick={() => setSortDesc((v) => !v)}>
            점수 {sortDesc ? "높은순" : "낮은순"}
          </button>
        </div>
      </div>

      <p className="table-hint">행을 클릭하면 '24 / '25년 재무·평가 상세를 볼 수 있습니다.</p>

      <div className="supplier-table-scroll">
        <table>
          <thead>
            <tr>
              <th>업체명</th>
              <th>유형</th>
              <th>담당 MD</th>
              <th>25년 계약금액</th>
              <th>부채비율</th>
              <th>영업이익률</th>
              <th>매출액 성장률</th>
              <th>종합점수</th>
              <th>최종등급</th>
              <th>공시정보</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
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
