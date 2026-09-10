"use client";

import { useEffect } from "react";
import type { SupplierRecord } from "@/lib/suppliers";
import { gradeToRisk } from "@/lib/suppliers";
import type { DartSupplierDisclosure } from "@/lib/data";
import RiskBadge from "./RiskBadge";
import { fmtEok, fmtWon, fmtPct, fmtNum } from "@/lib/format";

const FIN_ROWS: { key: keyof SupplierRecord["fy24"]; label: string }[] = [
  { key: "assets", label: "자산총계" },
  { key: "currentAssets", label: "유동자산" },
  { key: "equity", label: "자본총계" },
  { key: "liabilities", label: "부채총계" },
  { key: "revenue", label: "매출액" },
  { key: "operatingProfit", label: "영업이익" },
  { key: "netProfit", label: "당기순이익" },
  { key: "cashFlowOperating", label: "영업활동현금흐름" },
  { key: "cashFlowOrdinary", label: "경상활동현금흐름" },
  { key: "cashFlowInvesting", label: "투자활동현금흐름" },
];

export default function SupplierDetailModal({
  supplier,
  disclosure,
  dartConfigured,
  onClose,
}: {
  supplier: SupplierRecord;
  disclosure?: DartSupplierDisclosure;
  dartConfigured: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const sc = supplier.scoring;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="modal-title">{supplier.name}</div>
            <div className="modal-subtitle">
              {supplier.category ?? "-"} · 담당 {supplier.manager ?? "-"} · 사업자번호{" "}
              {supplier.bizNo ?? "-"}
            </div>
          </div>
          <div className="modal-header-right">
            <RiskBadge risk={gradeToRisk(supplier.grade)} />
            <button className="modal-close" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>
        </div>

        <div className="modal-body">
          <section className="modal-section">
            <h3>기본 정보</h3>
            <div className="kv-grid">
              <div className="kv"><span>최종등급</span><strong>{supplier.grade}</strong></div>
              <div className="kv"><span>종합점수</span><strong>{fmtNum(supplier.totalScore)}</strong></div>
              <div className="kv"><span>'25년 계약금액</span><strong>{fmtWon(supplier.contractAmount25)}</strong></div>
              <div className="kv"><span>거래 지속여부</span><strong>{supplier.tradeContinues ?? "-"}</strong></div>
            </div>
          </section>

          <section className="modal-section">
            <h3>재무 정보 <span className="unit-note">(단위: 억원)</span></h3>
            <table className="modal-table">
              <thead>
                <tr>
                  <th>항목</th>
                  <th>'24년</th>
                  <th>'25년</th>
                  <th>증감</th>
                </tr>
              </thead>
              <tbody>
                {FIN_ROWS.map((r) => {
                  const v24 = supplier.fy24[r.key];
                  const v25 = supplier.fy25[r.key];
                  const diff =
                    v24 !== null && v25 !== null ? v25 - v24 : null;
                  return (
                    <tr key={r.key}>
                      <td>{r.label}</td>
                      <td>{fmtEok(v24)}</td>
                      <td>{fmtEok(v25)}</td>
                      <td className={diff === null ? "" : diff >= 0 ? "change-down" : "change-up"}>
                        {diff === null ? "-" : `${diff >= 0 ? "+" : ""}${fmtEok(diff)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="modal-section">
            <h3>평가 스코어링</h3>
            <table className="modal-table">
              <thead>
                <tr>
                  <th>지표</th>
                  <th>값</th>
                  <th>배점</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>부채비율</td><td>{fmtPct(sc.debtRatio)}</td><td>{fmtNum(sc.debtScore)}</td></tr>
                <tr><td>부채 변동률</td><td>{fmtPct(sc.debtChangeRatio)}</td><td>{fmtNum(sc.debtChangeScore)}</td></tr>
                <tr><td>영업이익률</td><td>{fmtPct(sc.operatingMargin)}</td><td>{fmtNum(sc.operatingScore)}</td></tr>
                <tr><td>매출액 성장률</td><td>{fmtPct(sc.revenueGrowth)}</td><td>{fmtNum(sc.revenueGrowthScore)}</td></tr>
                <tr><td>매출액 규모</td><td>{fmtEok(sc.revenueAmount)}</td><td>{fmtNum(sc.revenueScore)}</td></tr>
                <tr><td>현금흐름</td><td>-</td><td>{fmtNum(sc.cashFlowScore)}</td></tr>
                <tr className="modal-total-row"><td>종합점수</td><td>-</td><td>{fmtNum(sc.totalScore)}</td></tr>
              </tbody>
            </table>
          </section>

          {(supplier.note || supplier.finalReview || supplier.remark) && (
            <section className="modal-section">
              <h3>비고</h3>
              {supplier.note && <p className="modal-note">참고사항: {supplier.note}</p>}
              {supplier.finalReview && <p className="modal-note">최종검토: {supplier.finalReview}</p>}
              {supplier.remark && <p className="modal-note">대체 가능 업체 등: {supplier.remark}</p>}
            </section>
          )}

          <section className="modal-section">
            <h3>
              전자공시(DART) 최근 공시
              {disclosure?.hasRecent && <span className="dart-new-dot"> 신규</span>}
            </h3>
            {!dartConfigured ? (
              <p className="modal-note">
                DART 연동이 설정되지 않았습니다. 관리자가 <code>DART_API_KEY</code> 환경변수를
                등록하면 업체별 공시 변경 내역이 표시됩니다.
              </p>
            ) : !disclosure || disclosure.filings.length === 0 ? (
              <p className="modal-note">
                최근 조회 구간에 매칭된 DART 공시가 없습니다. (비상장·비외감 업체이거나 등록
                회사명이 다를 수 있음){" "}
                {disclosure && (
                  <a href={disclosure.searchUrl} target="_blank" rel="noopener noreferrer" className="panel-link">
                    DART에서 직접 검색 →
                  </a>
                )}
              </p>
            ) : (
              <>
                <ul className="news-list modal-dart-list">
                  {disclosure.filings.map((f) => (
                    <li key={f.receiptNo}>
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="news-headline">
                        {f.reportName}
                      </a>
                      <div className="news-meta">
                        <span>{f.receiptDate}</span>
                        <span className="dot">{f.filerName}</span>
                        {f.corpName !== supplier.name && <span className="dot">DART: {f.corpName}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="modal-note">
                  <a href={disclosure.searchUrl} target="_blank" rel="noopener noreferrer" className="panel-link">
                    DART 공시검색에서 전체 보기 →
                  </a>
                </p>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
