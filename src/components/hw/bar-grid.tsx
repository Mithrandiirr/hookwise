export function BarGrid({
  data,
  width = 600,
  height = 60,
  barColor = "#818cf8",
  failColor = "#f87171",
}: {
  data: { total: number; fail?: number }[];
  width?: number;
  height?: number;
  barColor?: string;
  failColor?: string;
}) {
  if (!data || data.length === 0) return null;
  const gap = 2;
  const barW = (width - gap * (data.length - 1)) / data.length;
  const max = Math.max(...data.map((d) => d.total || 0), 1);
  return (
    <svg width={width} height={height} className="block">
      {data.map((d, i) => {
        const x = i * (barW + gap);
        const totalH = (d.total / max) * height;
        const failH = ((d.fail || 0) / max) * height;
        return (
          <g key={i}>
            <rect
              x={x}
              y={height - totalH}
              width={barW}
              height={totalH}
              fill={barColor}
              opacity="0.35"
              rx="1"
            />
            {failH > 0 && (
              <rect
                x={x}
                y={height - failH}
                width={barW}
                height={failH}
                fill={failColor}
                rx="1"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
