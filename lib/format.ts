/** 표시용 숫자 포맷 (공급업체 재무/평가 데이터). */

/** 천원 단위 값 -> "12.3억" (억원). */
export function fmtEok(thousandsWon: number | null | undefined): string {
  if (thousandsWon === null || thousandsWon === undefined) return "-";
  const eok = thousandsWon / 100000;
  return `${eok.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억`;
}

/** 원 단위 값 -> "1,234,567원". */
export function fmtWon(won: number | null | undefined): string {
  if (won === null || won === undefined) return "-";
  return `${Math.round(won).toLocaleString("ko-KR")}원`;
}

/** 비율(0.123) -> "12.3%". */
export function fmtPct(ratio: number | null | undefined, digits = 1): string {
  if (ratio === null || ratio === undefined) return "-";
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** 점수/실수 -> 최대 소수 2자리. */
export function fmtNum(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined) return "-";
  return v.toLocaleString("ko-KR", { maximumFractionDigits: digits });
}

/** 긴 문자열을 "요약 요약…" 형태로 자릅니다. 요약 카드처럼 공간이 좁은 곳에 사용. */
export function truncate(s: string, max = 42): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** 표시용 짧은 품목명: 괄호 안 설명 제거 (예: "구리 (Copper)" -> "구리"). */
export function shortMaterialName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, "").trim();
}
