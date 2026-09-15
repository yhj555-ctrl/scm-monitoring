// 서버 컴포넌트 SVG 그룹(2계열) 막대 그래프. 지역/구간별 "현재 vs 평시" 같은 비교에 사용합니다.
export interface GroupedBarGroup {
  label: string;
  a: number;
  b: number;
}

export default function GroupedBarChart({
  groups,
  aLabel,
  bLabel,
  aColor = "var(--accent)",
  bColor = "var(--border-strong)",
  aColorFor,
  height = 200,
  unit = "",
}: {
  groups: GroupedBarGroup[];
  aLabel: string;
  bLabel: string;
  aColor?: string;
  bColor?: string;
  aColorFor?: (label: string) => string;
  height?: number;
  unit?: string;
}) {
  if (groups.length === 0) {
    return <div className="chart-empty">표시할 데이터가 없습니다.</div>;
  }

  const maxV = Math.max(1, ...groups.flatMap((g) => [g.a, g.b]));
  const barWidth = 22;
  const barGap = 6;
  const groupGap = 30;
  const bottomPad = 26;
  const topPad = 20;
  const groupWidth = barWidth * 2 + barGap;
  const width = groups.length * (groupWidth + groupGap) + groupGap;
  const plotH = height - bottomPad - topPad;
  const scale = plotH / maxV;
  const baseY = topPad + plotH;

  return (
    <div>
      <div className="chart-legend-inline">
        <span className="chart-legend-item">
          <span className="legend-swatch" style={{ background: aColor }} />
          {aLabel}
        </span>
        <span className="chart-legend-item">
          <span className="legend-swatch" style={{ background: bColor }} />
          {bLabel}
        </span>
      </div>
      <div className="chart-scroll">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="그룹 막대 그래프"
          className="chart-svg"
        >
          <line x1={0} y1={baseY} x2={width} y2={baseY} stroke="var(--border)" strokeWidth={1} />
          {groups.map((g, i) => {
            const gx = groupGap + i * (groupWidth + groupGap);
            const aH = g.a * scale;
            const bH = g.b * scale;
            const barA = aColorFor ? aColorFor(g.label) : aColor;
            return (
              <g key={g.label}>
                <rect x={gx} y={baseY - aH} width={barWidth} height={aH} rx={5} fill={barA}>
                  <title>{`${g.label} · ${aLabel}: ${g.a}${unit}`}</title>
                </rect>
                <rect x={gx + barWidth + barGap} y={baseY - bH} width={barWidth} height={bH} rx={5} fill={bColor}>
                  <title>{`${g.label} · ${bLabel}: ${g.b}${unit}`}</title>
                </rect>
                <text x={gx + groupWidth / 2} y={height - 8} textAnchor="middle" className="chart-cat-label">
                  {g.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
