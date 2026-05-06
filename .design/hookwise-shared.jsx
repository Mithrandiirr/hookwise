/* Shared primitives for HookWise screens */

const Logo = ({ size = 24 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="hw-logo-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a5b4fc" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="6" fill="url(#hw-logo-grad)" />
      <path d="M7.5 8.5v7M16.5 8.5v7M7.5 12h9" stroke="#0a0d14" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.6" fill="#0a0d14" />
    </svg>
    <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>HookWise</span>
  </div>
);

const Dot = ({ tone = "green", quiet = false }) => (
  <span className={`hw-dot ${tone} ${quiet ? "quiet" : ""}`} />
);

const Chip = ({ tone, children, style }) => (
  <span className={`hw-chip ${tone || ""}`} style={style}>{children}</span>
);

const ProviderMark = ({ provider = "stripe", size = 18 }) => {
  const map = {
    stripe:  { bg: "#635bff", fg: "#fff", txt: "S" },
    shopify: { bg: "#95bf47", fg: "#0a0d14", txt: "S" },
    github:  { bg: "#1f2937", fg: "#e7ecf2", txt: "G" },
  };
  const c = map[provider] || map.stripe;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size, height: size, borderRadius: 5,
      background: c.bg, color: c.fg,
      fontFamily: "Geist Mono, monospace",
      fontSize: Math.round(size * 0.55), fontWeight: 700,
      flexShrink: 0,
    }}>{c.txt}</span>
  );
};

// Sparkline: takes number[] (0..1 ideally) and renders an area chart
const Sparkline = ({ data, width = 140, height = 36, color = "#818cf8", gradId = "hw-spark-grad" }) => {
  if (!data || !data.length) return null;
  const max = Math.max(...data, 0.001);
  const min = Math.min(...data, 0);
  const span = (max - min) || 1;
  const step = width / (data.length - 1 || 1);
  const points = data.map((v, i) => [i * step, height - ((v - min) / span) * (height - 2) - 1]);
  const linePath = points.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const areaPath = linePath + ` L${width} ${height} L0 ${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2={height} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

// Event/bar grid — renders a histogram of bars with optional red highlighted bars
const BarGrid = ({ data, width = 600, height = 60, barColor = "#818cf8", failColor = "#f87171" }) => {
  if (!data || !data.length) return null;
  const gap = 2;
  const barW = (width - gap * (data.length - 1)) / data.length;
  const max = Math.max(...data.map(d => (d.total || 0)), 1);
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {data.map((d, i) => {
        const x = i * (barW + gap);
        const totalH = (d.total / max) * height;
        const failH = ((d.fail || 0) / max) * height;
        return (
          <g key={i}>
            <rect x={x} y={height - totalH} width={barW} height={totalH} fill={barColor} opacity="0.35" rx="1" />
            {failH > 0 && <rect x={x} y={height - failH} width={barW} height={failH} fill={failColor} rx="1" />}
          </g>
        );
      })}
    </svg>
  );
};

// Tiny section header — kicker + title + trailing actions
const SectionHeader = ({ kicker, title, right, style }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, ...style }}>
    <div>
      {kicker && <div className="hw-label" style={{ marginBottom: 6 }}>{kicker}</div>}
      <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--hw-ink)" }}>{title}</div>
    </div>
    {right}
  </div>
);

// Tiny icon set (lucide-ish, 1.5 stroke)
const Icon = ({ name, size = 16, color = "currentColor", style }) => {
  const s = size;
  const common = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", style };
  switch (name) {
    case "arrow-up-right":
      return <svg {...common}><path d="M7 17L17 7M9 7h8v8" /></svg>;
    case "arrow-right":
      return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "activity":
      return <svg {...common}><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>;
    case "bolt":
      return <svg {...common}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>;
    case "shield":
      return <svg {...common}><path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" /></svg>;
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>;
    case "alert":
      return <svg {...common}><path d="M12 9v4m0 4h.01M10.3 3.7L2.6 17a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 3.7a2 2 0 00-3.4 0z" /></svg>;
    case "plug":
      return <svg {...common}><path d="M9 2v6M15 2v6M5 10h14v4a5 5 0 01-5 5h-4a5 5 0 01-5-5v-4zM12 19v3" /></svg>;
    case "reload":
      return <svg {...common}><path d="M3 12a9 9 0 1015.5-6.3L21 8" /><path d="M21 3v5h-5" /></svg>;
    case "replay":
      return <svg {...common}><path d="M3 12a9 9 0 109-9v4M3 3v5h5" /></svg>;
    case "copy":
      return <svg {...common}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>;
    case "check":
      return <svg {...common}><path d="M5 13l4 4 10-10" /></svg>;
    case "x":
      return <svg {...common}><path d="M6 6l12 12M6 18L18 6" /></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "brain":
      return <svg {...common}><path d="M9 4a3 3 0 013 3v10a3 3 0 11-6 0 3 3 0 01-3-3V10a3 3 0 013-3 3 3 0 013-3zM15 4a3 3 0 00-3 3v10a3 3 0 106 0 3 3 0 003-3V10a3 3 0 00-3-3 3 3 0 00-3-3z" /></svg>;
    case "dashboard":
      return <svg {...common}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>;
    case "globe":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" /></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1A2 2 0 114.3 17l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1A2 2 0 117 4.3l.1.1a1.7 1.7 0 001.8.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>;
    case "bell":
      return <svg {...common}><path d="M6 8a6 6 0 1112 0c0 7 3 7 3 9H3c0-2 3-2 3-9zM10 21a2 2 0 004 0" /></svg>;
    case "chart":
      return <svg {...common}><path d="M3 3v18h18" /><path d="M7 14l3-3 4 4 5-7" /></svg>;
    case "tag":
      return <svg {...common}><path d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z" /><circle cx="7.5" cy="7.5" r="1" fill={color} /></svg>;
    case "refresh":
      return <svg {...common}><path d="M3 12a9 9 0 019-9c2.5 0 4.8 1 6.5 2.8L21 8M21 3v5h-5M21 12a9 9 0 01-9 9c-2.5 0-4.8-1-6.5-2.8L3 16M3 21v-5h5" /></svg>;
    case "dollar":
      return <svg {...common}><path d="M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>;
    case "eye":
      return <svg {...common}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>;
    case "zap":
      return <svg {...common}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>;
    case "chevron-right":
      return <svg {...common}><path d="M9 6l6 6-6 6" /></svg>;
    case "chevron-down":
      return <svg {...common}><path d="M6 9l6 6 6-6" /></svg>;
    case "filter":
      return <svg {...common}><path d="M3 4h18l-7 9v6l-4-2v-4L3 4z" /></svg>;
    case "cpu":
      return <svg {...common}><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6" height="6" rx="1" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" /></svg>;
    case "database":
      return <svg {...common}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6" /></svg>;
    case "stopwatch":
      return <svg {...common}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6M12 2v3" /></svg>;
    case "terminal":
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l3 3-3 3M13 15h4" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
  }
};

// Sidebar for dashboard screens
const DashSidebar = ({ active = "Overview" }) => {
  const groups = [
    {
      label: "Operate",
      items: [
        { name: "Overview", icon: "dashboard" },
        { name: "Events", icon: "activity" },
        { name: "Anomalies", icon: "alert", count: 3 },
        { name: "Alerts", icon: "bell" },
      ],
    },
    {
      label: "Deliver",
      items: [
        { name: "Integrations", icon: "plug" },
        { name: "Replay", icon: "replay" },
        { name: "Reconciliation", icon: "refresh" },
      ],
    },
    {
      label: "Insight",
      items: [
        { name: "Analytics", icon: "chart" },
        { name: "Flows", icon: "zap" },
        { name: "Scanner", icon: "search" },
      ],
    },
  ];
  return (
    <aside style={{
      width: 232, flexShrink: 0,
      background: "var(--hw-bg)",
      borderRight: "1px solid var(--hw-line)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--hw-line)" }}>
        <Logo />
      </div>
      <div style={{ padding: "8px", flex: 1, display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
        {/* Org switcher */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
          border: "1px solid var(--hw-line)", borderRadius: 8,
          margin: "4px 4px 10px",
          background: "var(--hw-panel)",
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: 5,
            background: "linear-gradient(135deg,#fbbf24,#f87171)",
            fontSize: 10, fontWeight: 700, color: "#0a0d14",
            display: "grid", placeItems: "center",
          }}>AC</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--hw-ink)" }}>Acme Commerce</div>
            <div style={{ fontSize: 10, color: "var(--hw-ink-4)", fontFamily: "Geist Mono, monospace" }}>team · pro</div>
          </div>
          <Icon name="chevron-down" size={14} color="var(--hw-ink-4)" />
        </div>
        {groups.map(g => (
          <div key={g.label} style={{ padding: "6px 4px" }}>
            <div style={{
              padding: "6px 12px", fontSize: 10, fontWeight: 500,
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: "var(--hw-ink-4)", fontFamily: "Geist Mono, monospace",
            }}>{g.label}</div>
            {g.items.map(item => {
              const isActive = item.name === active;
              return (
                <div key={item.name} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "7px 12px", borderRadius: 7,
                  fontSize: 13, fontWeight: 500,
                  color: isActive ? "var(--hw-ink)" : "var(--hw-ink-3)",
                  background: isActive ? "var(--hw-panel-raised)" : "transparent",
                  boxShadow: isActive ? "inset 0 0 0 1px var(--hw-line-2)" : "none",
                  cursor: "pointer",
                  transition: "all 120ms ease",
                }}>
                  <Icon name={item.icon} size={15}
                    color={isActive ? "var(--hw-indigo-ink)" : "var(--hw-ink-4)"} />
                  <span>{item.name}</span>
                  {item.count ? (
                    <span style={{
                      marginLeft: "auto",
                      fontFamily: "Geist Mono, monospace",
                      fontSize: 10, fontWeight: 600,
                      padding: "1px 6px", borderRadius: 999,
                      background: "rgba(251,191,36,0.10)",
                      color: "var(--hw-amber)",
                      border: "1px solid rgba(251,191,36,0.25)",
                    }}>{item.count}</span>
                  ) : isActive ? (
                    <span style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: 999, background: "var(--hw-indigo)" }} />
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{
        padding: "12px 16px", borderTop: "1px solid var(--hw-line)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: "linear-gradient(135deg,#60a5fa,#818cf8)",
          display: "grid", placeItems: "center",
          fontSize: 11, fontWeight: 700, color: "#0a0d14",
        }}>MO</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500 }}>Mira Ortega</div>
          <div style={{ fontSize: 10, color: "var(--hw-ink-4)", fontFamily: "Geist Mono, monospace" }}>on-call</div>
        </div>
        <Icon name="settings" size={14} color="var(--hw-ink-4)" />
      </div>
    </aside>
  );
};

// Top utility bar for dashboard screens
const DashTopbar = ({ title, subtitle, right }) => (
  <header style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "18px 28px", borderBottom: "1px solid var(--hw-line)",
    gap: 20,
    background: "var(--hw-bg)",
  }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: 12, color: "var(--hw-ink-3)", marginTop: 2 }}>
          {subtitle}
        </div>
      )}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {right}
    </div>
  </header>
);

Object.assign(window, { Logo, Dot, Chip, ProviderMark, Sparkline, BarGrid, SectionHeader, Icon, DashSidebar, DashTopbar });
