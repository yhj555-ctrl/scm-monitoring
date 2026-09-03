"use client";

import { useMemo, useState } from "react";
import { suppliers, gradeToRisk, SupplierGrade } from "@/lib/suppliers";
import RiskBadge from "./RiskBadge";

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

function fmtAmount(v: number | null) {
  if (v === null) return "-";
  return `${Math.round(v).toLocaleString()}원`;
}

function fmtPct(v: number | null) {
  if (v === null) return "-";
  return `${(v * 100).toFixed(1)}%`;
}

export default function SupplierTable() {
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState<(typeof GRADE_OPTIONS)[number]>("전체");
  const [sortDesc, setSortDesc] = useState(true);

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
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.category ?? "-"}</td>
                <td>{s.manager ?? "-"}</td>
                <td>{fmtAmount(s.contractAmount25)}</td>
                <td>{fmtPct(s.debtRatio)}</td>
                <td>{fmtPct(s.operatingMargin)}</td>
                <td>{fmtPct(s.revenueGrowth)}</td>
                <td>{s.totalScore ?? "-"}</td>
                <td>
                  <RiskBadge risk={gradeToRisk(s.grade)} />
                  <span className="grade-text">{s.grade}</span>
                </td>
                <td>{s.note ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
