export function Sparkline({
  data,
  width = 140,
  height = 36,
  color = "#818cf8",
  gradId = "hw-spark-grad",
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  gradId?: string;
}) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 0.001);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = width / (data.length - 1 || 1);
  const points = data.map<[number, number]>((v, i) => [
    i * step,
    height - ((v - min) / span) * (height - 2) - 1,
  ]);
  const linePath = points
    .map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1))
    .join(" ");
  const areaPath = linePath + ` L${width} ${height} L0 ${height} Z`;
  return (
    <svg width={width} height={height} className="block" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2={height} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
