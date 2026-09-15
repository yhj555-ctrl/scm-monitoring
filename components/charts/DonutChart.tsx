// 서버 컴포넌트 SVG 도넛(원형) 그래프. 범례를 함께 렌더링합니다.
export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

export default function DonutChart({
  data,
  size = 176,
  thickness = 26,
  centerLabel,
  centerValue,
  valueFormatter,
}: {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  valueFormatter?: (value: number, total: number) => string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const fmt = valueFormatter ?? ((v, t) => (t > 0 ? `${Math.round((v / t) * 100)}%` : "0%"));

  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  let offset = 0;
  const visible = data.filter((d) => d.value > 0);

  return (
    <div className="donut-wrap">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="원형 그래프"
        className="chart-svg"
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={thickness} />
        {total > 0 &&
          visible.map((d) => {
            const frac = d.value / total;
            const dash = frac * circumference;
            const seg = (
              <circle
                key={d.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap={visible.length > 1 ? "round" : "butt"}
                transform={`rotate(-90 ${cx} ${cy})`}
              >
                <title>{`${d.label}: ${d.value} (${fmt(d.value, total)})`}</title>
              </circle>
            );
            offset += dash;
            return seg;
          })}
        <text
          x={cx}
          y={centerLabel ? cy - 8 : cy}
          textAnchor="middle"
          dominantBaseline="middle"
          className="donut-center-value"
        >
          {centerValue ?? total}
        </text>
        {centerLabel && (
          <text x={cx} y={cy + 15} textAnchor="middle" dominantBaseline="middle" className="donut-center-label">
            {centerLabel}
          </text>
        )}
      </svg>
      <ul className="chart-legend">
        {data.map((d) => (
          <li key={d.label}>
            <span className="legend-swatch" style={{ background: d.color }} />
            <span className="legend-label">{d.label}</span>
            <span className="legend-value">
              {d.value}
              {total > 0 && ` (${fmt(d.value, total)})`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
