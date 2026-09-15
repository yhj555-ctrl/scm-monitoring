// 서버 컴포넌트 SVG 선형 그래프. 각 시리즈는 xLabels 와 같은 길이의 points 를 가집니다.
export interface LineSeries {
  label: string;
  color: string;
  points: number[];
}

export default function LineChart({
  xLabels,
  series,
  height = 220,
  valueFormatter,
}: {
  xLabels: string[];
  series: LineSeries[];
  height?: number;
  valueFormatter?: (v: number) => string;
}) {
  const fmt = valueFormatter ?? ((v: number) => `${v}`);

  if (series.length === 0 || xLabels.length === 0) {
    return <div className="chart-empty">표시할 데이터가 없습니다.</div>;
  }

  const allValues = series.flatMap((s) => s.points);
  const maxV = Math.max(0, ...allValues);
  const minV = Math.min(0, ...allValues);
  const range = maxV - minV || 1;

  const padding = { top: 20, right: 96, bottom: 30, left: 44 };
  const plotW = 360;
  const width = plotW + padding.left + padding.right;
  const plotH = height - padding.top - padding.bottom;
  const xStep = xLabels.length > 1 ? plotW / (xLabels.length - 1) : 0;

  const yFor = (v: number) => padding.top + (1 - (v - minV) / range) * plotH;
  const xFor = (i: number) => padding.left + i * xStep;
  const zeroY = yFor(0);

  return (
    <div className="chart-scroll">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="선형 그래프"
        className="chart-svg"
      >
        <line
          x1={padding.left}
          y1={zeroY}
          x2={width - padding.right}
          y2={zeroY}
          stroke="var(--border-strong)"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
        {xLabels.map((label, i) => (
          <text
            key={label}
            x={xFor(i)}
            y={height - 8}
            textAnchor="middle"
            className="chart-cat-label"
          >
            {label}
          </text>
        ))}
        <text x={padding.left - 10} y={yFor(maxV)} textAnchor="end" dominantBaseline="middle" className="chart-axis-label">
          {fmt(maxV)}
        </text>
        {minV !== maxV && (
          <text x={padding.left - 10} y={yFor(minV)} textAnchor="end" dominantBaseline="middle" className="chart-axis-label">
            {fmt(minV)}
          </text>
        )}
        {series.map((s) => {
          const path = s.points
            .map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(v)}`)
            .join(" ");
          const lastIdx = s.points.length - 1;
          return (
            <g key={s.label}>
              <path d={path} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              {s.points.map((v, i) => (
                <circle key={i} cx={xFor(i)} cy={yFor(v)} r={3.5} fill={s.color}>
                  <title>{`${s.label} · ${xLabels[i]}: ${fmt(v)}`}</title>
                </circle>
              ))}
              <text
                x={xFor(lastIdx) + 9}
                y={yFor(s.points[lastIdx])}
                dominantBaseline="middle"
                className="chart-line-end-label"
                fill={s.color}
              >
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
