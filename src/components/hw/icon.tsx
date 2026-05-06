import type { CSSProperties } from "react";

export type IconName =
  | "arrow-up-right"
  | "arrow-right"
  | "activity"
  | "bolt"
  | "shield"
  | "search"
  | "alert"
  | "plug"
  | "reload"
  | "replay"
  | "copy"
  | "check"
  | "x"
  | "clock"
  | "brain"
  | "dashboard"
  | "globe"
  | "settings"
  | "bell"
  | "chart"
  | "tag"
  | "refresh"
  | "dollar"
  | "eye"
  | "zap"
  | "chevron-right"
  | "chevron-down"
  | "filter"
  | "cpu"
  | "database"
  | "stopwatch"
  | "terminal";

export function Icon({
  name,
  size = 16,
  color = "currentColor",
  style,
  className,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: CSSProperties;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style,
    className,
  };
  switch (name) {
    case "arrow-up-right":
      return (<svg {...common}><path d="M7 17L17 7M9 7h8v8" /></svg>);
    case "arrow-right":
      return (<svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
    case "activity":
      return (<svg {...common}><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>);
    case "bolt":
      return (<svg {...common}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>);
    case "shield":
      return (<svg {...common}><path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" /></svg>);
    case "search":
      return (<svg {...common}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>);
    case "alert":
      return (<svg {...common}><path d="M12 9v4m0 4h.01M10.3 3.7L2.6 17a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 3.7a2 2 0 00-3.4 0z" /></svg>);
    case "plug":
      return (<svg {...common}><path d="M9 2v6M15 2v6M5 10h14v4a5 5 0 01-5 5h-4a5 5 0 01-5-5v-4zM12 19v3" /></svg>);
    case "reload":
    case "replay":
      return (<svg {...common}><path d="M3 12a9 9 0 109-9v4M3 3v5h5" /></svg>);
    case "copy":
      return (<svg {...common}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>);
    case "check":
      return (<svg {...common}><path d="M5 13l4 4 10-10" /></svg>);
    case "x":
      return (<svg {...common}><path d="M6 6l12 12M6 18L18 6" /></svg>);
    case "clock":
      return (<svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
    case "brain":
      return (<svg {...common}><path d="M9 4a3 3 0 013 3v10a3 3 0 11-6 0 3 3 0 01-3-3V10a3 3 0 013-3 3 3 0 013-3zM15 4a3 3 0 00-3 3v10a3 3 0 106 0 3 3 0 003-3V10a3 3 0 00-3-3 3 3 0 00-3-3z" /></svg>);
    case "dashboard":
      return (<svg {...common}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>);
    case "globe":
      return (<svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" /></svg>);
    case "settings":
      return (<svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1A2 2 0 114.3 17l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1A2 2 0 117 4.3l.1.1a1.7 1.7 0 001.8.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>);
    case "bell":
      return (<svg {...common}><path d="M6 8a6 6 0 1112 0c0 7 3 7 3 9H3c0-2 3-2 3-9zM10 21a2 2 0 004 0" /></svg>);
    case "chart":
      return (<svg {...common}><path d="M3 3v18h18" /><path d="M7 14l3-3 4 4 5-7" /></svg>);
    case "tag":
      return (<svg {...common}><path d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z" /><circle cx="7.5" cy="7.5" r="1" fill={color} /></svg>);
    case "refresh":
      return (<svg {...common}><path d="M3 12a9 9 0 019-9c2.5 0 4.8 1 6.5 2.8L21 8M21 3v5h-5M21 12a9 9 0 01-9 9c-2.5 0-4.8-1-6.5-2.8L3 16M3 21v-5h5" /></svg>);
    case "dollar":
      return (<svg {...common}><path d="M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>);
    case "eye":
      return (<svg {...common}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>);
    case "zap":
      return (<svg {...common}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>);
    case "chevron-right":
      return (<svg {...common}><path d="M9 6l6 6-6 6" /></svg>);
    case "chevron-down":
      return (<svg {...common}><path d="M6 9l6 6 6-6" /></svg>);
    case "filter":
      return (<svg {...common}><path d="M3 4h18l-7 9v6l-4-2v-4L3 4z" /></svg>);
    case "cpu":
      return (<svg {...common}><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6" height="6" rx="1" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" /></svg>);
    case "database":
      return (<svg {...common}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6" /></svg>);
    case "stopwatch":
      return (<svg {...common}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6M12 2v3" /></svg>);
    case "terminal":
      return (<svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l3 3-3 3M13 15h4" /></svg>);
    default:
      return (<svg {...common}><circle cx="12" cy="12" r="8" /></svg>);
  }
}
