/**
 * "금일 주요내용 요약" 패널. 순수 서버 컴포넌트 — 각 페이지가 이미 가져온 데이터로
 * 직접 계산한 문자열 몇 줄만 받아 그대로 보여줍니다(별도 fetch·상태 없음).
 */
export default function SummaryPanel({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;

  return (
    <div className="panel summary-panel">
      <div className="panel-header">📋 금일 주요내용 요약</div>
      <ul className="summary-list">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
