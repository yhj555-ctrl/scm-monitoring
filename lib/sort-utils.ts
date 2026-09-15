/** 정렬 관련 공용 상수/헬퍼. 클라이언트 컴포넌트에서도 안전하게 쓸 수 있도록 순수 함수만 둡니다. */

/** 리스크 등급 정렬용 가중치 (상 > 중 > 하). */
export const RISK_WEIGHT: Record<string, number> = { 상: 3, 중: 2, 하: 1 };

/** 문자열 비교 (한국어 로케일). */
export function compareStr(a: string, b: string): number {
  return a.localeCompare(b, "ko");
}

/** 숫자 비교. null/undefined 는 가장 작은 값으로 취급합니다. */
export function compareNum(a: number | null | undefined, b: number | null | undefined): number {
  const av = a ?? -Infinity;
  const bv = b ?? -Infinity;
  return av - bv;
}
