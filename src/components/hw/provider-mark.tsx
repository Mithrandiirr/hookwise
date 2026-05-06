type Provider = "stripe" | "shopify" | "github" | "generic";

const MAP: Record<Provider, { bg: string; fg: string; txt: string }> = {
  stripe: { bg: "#635bff", fg: "#ffffff", txt: "S" },
  shopify: { bg: "#95bf47", fg: "#0a0d14", txt: "S" },
  github: { bg: "#1f2937", fg: "#e7ecf2", txt: "G" },
  generic: { bg: "#334155", fg: "#e7ecf2", txt: "H" },
};

export function ProviderMark({
  provider = "stripe",
  size = 18,
}: {
  provider?: string;
  size?: number;
}) {
  const key = (MAP[provider as Provider] ? provider : "generic") as Provider;
  const c = MAP[key];
  return (
    <span
      className="hw-mono inline-flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: 5,
        background: c.bg,
        color: c.fg,
        fontSize: Math.round(size * 0.55),
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {c.txt}
    </span>
  );
}
