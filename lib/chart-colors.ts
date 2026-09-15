import type { RiskLevel, LogisticsRegion } from "./data";
import type { SupplierGrade } from "./suppliers";
import type { CompetitorCompany } from "./live/news";

/**
 * 차트 색상 팔레트. `app/globals.css` 의 CSS 변수를 그대로 참조해
 * 테마가 바뀌어도(밝은 파랑 배경 등) 표·배지 색상과 항상 일치합니다.
 */

export const RISK_COLOR: Record<RiskLevel, string> = {
  상: "var(--danger)",
  중: "var(--mid)",
  하: "var(--low)",
};

export const GRADE_COLOR: Record<SupplierGrade, string> = {
  "최우수 (Excellent)": "var(--grade-excellent)",
  "우수 (Good)": "var(--grade-good)",
  "보통 (Normal)": "var(--accent)",
  "유의 (Caution)": "var(--grade-caution)",
  "위험 (Risk)": "var(--danger)",
  "위험 (Risk) - 과락": "var(--grade-risk-fail)",
  "점수 오류": "var(--grade-unknown)",
};

export const GRADE_SHORT_LABEL: Record<SupplierGrade, string> = {
  "최우수 (Excellent)": "최우수",
  "우수 (Good)": "우수",
  "보통 (Normal)": "보통",
  "유의 (Caution)": "유의",
  "위험 (Risk)": "위험",
  "위험 (Risk) - 과락": "위험(과락)",
  "점수 오류": "점수오류",
};

export const REGION_COLOR: Record<LogisticsRegion, string> = {
  중국: "var(--accent)",
  대만: "var(--accent-2)",
  미국: "var(--grade-excellent)",
  유럽: "var(--chart-region-eu)",
  대한민국: "var(--chart-region-kr)",
};

export const COMPETITOR_COLOR: Record<CompetitorCompany, string> = {
  KT: "var(--accent)",
  "LG유플러스": "var(--accent-2)",
  "SK텔레콤": "var(--chart-region-eu)",
};
