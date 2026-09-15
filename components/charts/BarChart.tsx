// 서버 컴포넌트로 렌더되는 순수 SVG 막대 그래프 (별도 차트 라이브러리 없음, 클라이언트 JS 불필요).
export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

export default function BarChart({
  data,
  height = 200,
  unit = "",
  valueFormatter,
  orientation = "vertical",
}: {
  data: BarDatum[];
  height?: number;
  unit?: string;
  valueFormatter?: (v: number) => string;
  orientation?: "vertical" | "horizontal";
}) {
  const fmt = valueFormatter ?? ((v: number) => `${v}${unit}`);

  if (data.length === 0) {
    return <div className="chart-empty">표시할 데이터가 없습니다.</div>;
  }

  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  const hasNegative = data.some((d) => d.value < 0);

  if (orientation === "horizontal") {
    const barHeight = 24;
    const rowGap = 16;
    const topPad = 8;
    const labelWidth = 128;
    const plotWidth = 340;
    const rightPad = 64;
    const width = labelWidth + plotWidth + rightPad;
    const totalHeight = topPad * 2 + data.length * (barHeight + rowGap) - rowGap;
    const zeroX = hasNegative ? labelWidth + plotWidth / 2 : labelWidth;
    const scale = (hasNegative ? plotWidth / 2 : plotWidth) / maxAbs;

    return (
      <div className="chart-scroll">
        <svg
          width={width}
          height={totalHeight}
          viewBox={`0 0 ${width} ${totalHeight}`}
          role="img"
          aria-label="가로 막대 그래프"
          className="chart-svg"
        >
          <line
            x1={zeroX}
            y1={0}
            x2={zeroX}
            y2={totalHeight}
            stroke="var(--border)"
            strokeWidth={1}
          />
          {data.map((d, i) => {
            const y = topPad + i * (barHeight + rowGap);
            const barLen = Math.max(2, Math.abs(d.value) * scale);
            const x = d.value >= 0 ? zeroX : zeroX - barLen;
            const color = d.color ?? "var(--accent)";
            return (
              <g key={d.label}>
                <text
                  x={labelWidth - 10}
                  y={y + barHeight / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="chart-cat-label"
                >
                  {d.label}
                </text>
                <rect x={x} y={y} width={barLen} height={barHeight} rx={6} fill={color}>
                  <title>{`${d.label}: ${fmt(d.value)}`}</title>
                </rect>
                <text
                  x={d.value >= 0 ? x + barLen + 8 : x - 8}
                  y={y + barHeight / 2}
                  textAnchor={d.value >= 0 ? "start" : "end"}
                  dominantBaseline="middle"
                  className="chart-value-label"
                >
                  {fmt(d.value)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // vertical (세로 막대)
  const barWidth = 42;
  const colGap = 26;
  const bottomPad = 26;
  const topPad = 22;
  const plotH = height - bottomPad - topPad;
  const width = data.length * (barWidth + colGap) + colGap;
  const totalHeight = height;
  const zeroY = hasNegative ? topPad + plotH / 2 : topPad + plotH;
  const scale = (hasNegative ? plotH / 2 : plotH) / maxAbs;

  return (
    <div className="chart-scroll">
      <svg
        width={width}
        height={totalHeight}
        viewBox={`0 0 ${width} ${totalHeight}`}
        role="img"
        aria-label="막대 그래프"
        className="chart-svg"
      >
        <line x1={0} y1={zeroY} x2={width} y2={zeroY} stroke="var(--border)" strokeWidth={1} />
        {data.map((d, i) => {
          const x = colGap + i * (barWidth + colGap);
          const barLen = Math.max(2, Math.abs(d.value) * scale);
          const y = d.value >= 0 ? zeroY - barLen : zeroY;
          const color = d.color ?? "var(--accent)";
          return (
            <g key={d.label}>
              <rect x={x} y={y} width={barWidth} height={barLen} rx={6} fill={color}>
                <title>{`${d.label}: ${fmt(d.value)}`}</title>
              </rect>
              <text
                x={x + barWidth / 2}
                y={d.value >= 0 ? y - 8 : y + barLen + 16}
                textAnchor="middle"
                className="chart-value-label"
              >
                {fmt(d.value)}
              </text>
              <text
                x={x + barWidth / 2}
                y={totalHeight - 6}
                textAnchor="middle"
                className="chart-cat-label"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
