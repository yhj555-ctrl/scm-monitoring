"use client";

import { useEffect, useState } from "react";

export interface MetricListItem {
  id: string;
  primary: string;
  secondary?: string;
  tag?: string;
  tagTone?: "default" | "danger" | "warn" | "good";
}

export default function ClickableMetricCard({
  label,
  value,
  tone = "default",
  modalTitle,
  modalSubtitle,
  items,
  emptyMessage = "표시할 세부 항목이 없습니다.",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "danger";
  modalTitle: string;
  modalSubtitle?: string;
  items: MetricListItem[];
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={`metric-card metric-card-clickable ${tone === "danger" ? "metric-card-danger" : ""}`}
        onClick={() => setOpen(true)}
      >
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
        <div className="metric-card-hint">클릭하여 세부내용 보기</div>
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div
            className="modal-card metric-modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <div className="modal-title">{modalTitle}</div>
                {modalSubtitle && <div className="modal-subtitle">{modalSubtitle}</div>}
              </div>
              <div className="modal-header-right">
                <button className="modal-close" onClick={() => setOpen(false)} aria-label="닫기">
                  ✕
                </button>
              </div>
            </div>
            <div className="modal-body">
              {items.length === 0 ? (
                <p className="modal-note">{emptyMessage}</p>
              ) : (
                <ul className="metric-modal-list">
                  {items.map((it) => (
                    <li key={it.id}>
                      <div className="metric-modal-primary">{it.primary}</div>
                      <div className="metric-modal-row">
                        {it.secondary && <span className="metric-modal-secondary">{it.secondary}</span>}
                        {it.tag && (
                          <span
                            className={`metric-modal-tag${it.tagTone ? ` metric-modal-tag-${it.tagTone}` : ""}`}
                          >
                            {it.tag}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
