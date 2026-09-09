/** 한국시각(KST) 포맷 유틸. 서버 컴포넌트(Node)에서 사용합니다. */

const KST = "Asia/Seoul";

/** KST 기준 연·월·일·시·분을 숫자로 분해 */
function kstParts(date: Date) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const p of f.formatToParts(date)) map[p.type] = p.value;
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour === "24" ? "00" : map.hour,
    minute: map.minute,
  };
}

/** "2026.09.09 08:00" */
export function kstDateTime(date: Date): string {
  if (Number.isNaN(date.getTime())) return "-";
  const p = kstParts(date);
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`;
}

/** "2026.09.09" */
export function kstDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return "-";
  const p = kstParts(date);
  return `${p.year}.${p.month}.${p.day}`;
}

/** 뉴스 게재시각처럼 epoch ms 값을 KST 표기로. 값이 없으면 dash. */
export function kstFromTs(ts: number | null | undefined): string {
  if (!ts) return "-";
  return kstDateTime(new Date(ts));
}

/** 오늘(KST) 08:00 시점의 Date. 물류 등 "매일 아침 갱신" 스냅샷 표기에 사용. */
export function kstTodayEightAM(): Date {
  const now = new Date();
  const p = kstParts(now);
  return new Date(`${p.year}-${p.month}-${p.day}T08:00:00+09:00`);
}
