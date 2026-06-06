// Brand SVG marks for known providers. Falls back to a monogram tile for unknown ones.
// SVG paths are from Simple Icons (CC0). All rendered in white-on-brand-color for
// consistent contrast with the F-design dark theme.

type KnownProvider = "stripe" | "shopify" | "github" | "clerk" | "resend";
type Provider = KnownProvider | "generic";

const BRAND: Record<Provider, { bg: string; fg: string; letter?: string }> = {
  stripe:  { bg: "#635bff", fg: "#ffffff" },
  shopify: { bg: "#95bf47", fg: "#ffffff" },
  github:  { bg: "#1a1f2e", fg: "#f0f4f8" },
  clerk:   { bg: "#6c47ff", fg: "#ffffff" },
  resend:  { bg: "#0a0a0a", fg: "#ffffff" },
  generic: { bg: "#334155", fg: "#e7ecf2", letter: "H" },
};

const PATHS: Record<KnownProvider, string> = {
  // Stripe — stylized "S" glyph (Simple Icons)
  stripe:
    "M13.479 9.883c-1.626-.604-2.512-1.067-2.512-1.803 0-.622.511-.977 1.423-.977 1.667 0 3.379.643 4.558 1.224l.666-4.111c-.935-.446-2.847-1.177-5.49-1.177-1.87 0-3.425.489-4.536 1.401-1.155.954-1.752 2.335-1.752 4.005 0 3.027 1.851 4.323 4.857 5.412 1.935.689 2.579 1.178 2.579 1.934 0 .732-.629 1.155-1.762 1.155-1.444 0-3.823-.71-5.387-1.621l-.674 4.158c1.337.755 3.808 1.521 6.376 1.521 1.978 0 3.625-.467 4.74-1.342 1.244-.977 1.889-2.419 1.889-4.232 0-3.117-1.911-4.412-4.974-5.547z",
  // Shopify shopping-bag mark (Simple Icons)
  shopify:
    "M15.337 23.979L24 21.847c0-.001-3.123-21.142-3.142-21.292-.019-.149-.149-.231-.255-.241-.107-.012-2.19-.045-2.19-.045s-1.394-1.345-1.521-1.471c-.13-.127-.379-.087-.475-.063-.014.004-.252.077-.646.199-.38-1.094-1.049-2.097-2.226-2.097-.033 0-.067.001-.101.003-.335-.443-.749-.638-1.106-.638-2.733 0-4.04 3.42-4.449 5.157-1.062.33-1.819.563-1.911.594-.594.187-.61.205-.687.768C5.236 3.146 3.667 15.222 3.667 15.222l11.67 8.757zM12.84 3.962c-.69.213-1.439.444-2.184.673.42-1.602 1.205-2.376 1.892-2.668.176.443.297.998.297 1.787 0 .062 0 .128-.005.208zm-1.011-2.999c.111 0 .222.038.326.107-.913.43-1.891 1.518-2.305 3.687-.588.182-1.166.36-1.711.527.467-1.582 1.587-4.321 3.69-4.321zm.486 11.243c-.291-.156-.661-.317-1.119-.317-1.097 0-1.179.694-1.179.866 0 .941 2.461 1.302 2.461 3.51 0 1.736-1.103 2.852-2.585 2.852-1.785 0-2.694-1.107-2.694-1.107l.477-1.581s.935.806 1.726.806c.515 0 .728-.405.728-.704 0-1.222-2.018-1.276-2.018-3.299 0-1.701 1.222-3.348 3.685-3.348.951 0 1.418.273 1.418.273l-.7 2.049zm2.451-9.131c.282-.085.55-.165.81-.244.005.077.005.155.005.235 0 .755-.099 1.395-.218 1.967-.292.082-.589.165-.892.249.158-.738.296-1.382.295-2.207z",
  // GitHub octocat (Simple Icons)
  github:
    "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  // Clerk — simplified circle-arc mark (approximation; not the trademark logo)
  clerk:
    "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 110 12 6 6 0 010-12zm0 3a3 3 0 100 6 3 3 0 000-6z",
  // Resend — simplified "R" glyph
  resend:
    "M5 3h7.5a5.5 5.5 0 014.5 8.66L21 21h-4.5l-3.6-8H9v8H5V3zm4 4v3h3.5a1.5 1.5 0 100-3H9z",
};

export function ProviderMark({
  provider = "generic",
  size = 18,
}: {
  provider?: string;
  size?: number;
}) {
  const key = (PATHS[provider as KnownProvider] ? provider : "generic") as Provider;
  const { bg, fg, letter } = BRAND[key];
  const glyphSize = Math.round(size * 0.7);

  return (
    <span
      aria-label={`${key} integration`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(4, Math.round(size * 0.22)),
        background: bg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {key !== "generic" ? (
        <svg
          viewBox="0 0 24 24"
          width={glyphSize}
          height={glyphSize}
          fill={fg}
          aria-hidden
        >
          <path d={PATHS[key as KnownProvider]} />
        </svg>
      ) : (
        <span
          style={{
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: Math.round(size * 0.55),
            fontWeight: 700,
            color: fg,
            lineHeight: 1,
          }}
        >
          {letter}
        </span>
      )}
    </span>
  );
}
