// Interactive follow-up chat scoped to one anomaly. Renders below the AI Diagnosis card.
// Holds conversation history in component state; each turn POSTs the full transcript so
// the server stays stateless and Claude has the full context every call.

"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/hw";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What's the next step I should take?",
  "How do I prevent this from happening again?",
  "Explain the impact in plain English.",
  "Which events are affected?",
];

export function AnomalyChat({ anomalyId }: { anomalyId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError(null);

    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setDraft("");
    setBusy(true);

    // Scroll to bottom on next paint.
    queueMicrotask(() => {
      const el = scrollerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });

    try {
      const res = await fetch(`/api/anomalies/${anomalyId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
      };
      if (!res.ok || !body.reply) {
        setError(body.error ?? `Request failed (${res.status}).`);
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: body.reply! }]);
      queueMicrotask(() => {
        const el = scrollerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setMessages([]);
    setError(null);
  }

  const hasHistory = messages.length > 0;

  return (
    <section
      style={{
        background: "var(--hf-bg-3)",
        border: "1px solid var(--hf-line)",
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* header */}
      <header
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--hf-line)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          className="hf-mono"
          style={{
            fontSize: 10,
            padding: "3px 8px",
            borderRadius: 999,
            background: "rgba(196,165,255,0.12)",
            color: "#c4a5ff",
            border: "1px solid rgba(196,165,255,0.3)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          ✦ Ask Claude
        </span>
        <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-4)" }}>
          scoped to this incident · context is replayed every turn
        </span>
        <span style={{ flex: 1 }} />
        {hasHistory && (
          <button
            type="button"
            onClick={reset}
            className="hf-mono"
            style={{
              background: "transparent",
              border: "none",
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 11,
              color: "var(--hf-ink-4)",
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            clear
          </button>
        )}
      </header>

      {/* transcript */}
      {hasHistory && (
        <div
          ref={scrollerRef}
          style={{
            padding: "18px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            maxHeight: 480,
            overflowY: "auto",
          }}
        >
          {messages.map((m, i) => (
            <ChatBubble key={i} role={m.role} content={m.content} />
          ))}
          {busy && <ThinkingDots />}
        </div>
      )}

      {/* empty state with suggested questions */}
      {!hasHistory && (
        <div
          style={{
            padding: "20px 24px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: "var(--hf-ink-3)",
              margin: 0,
              lineHeight: 1.55,
            }}
          >
            Ask follow-up questions about this incident. Claude has the full diagnosis,
            metrics, and similar prior incidents as context.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={busy}
                style={{
                  fontSize: 12,
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid var(--hf-line-2)",
                  background: "transparent",
                  color: "var(--hf-ink-2)",
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.6 : 1,
                  transition: "background-color 120ms ease, color 120ms ease",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* error */}
      {error && (
        <div
          style={{
            margin: "0 24px 16px",
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(242,154,154,0.3)",
            background: "rgba(242,154,154,0.06)",
            fontSize: 12.5,
            color: "var(--hf-ink-2)",
          }}
        >
          {error}
        </div>
      )}

      {/* composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        style={{
          padding: "14px 16px",
          borderTop: "1px solid var(--hf-line)",
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
          background: "rgba(255,255,255,0.015)",
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
          placeholder="Ask about this incident…"
          rows={1}
          disabled={busy}
          style={{
            flex: 1,
            resize: "none",
            background: "var(--hf-bg)",
            border: "1px solid var(--hf-line)",
            borderRadius: 10,
            padding: "10px 12px",
            color: "var(--hf-ink)",
            fontSize: 13.5,
            fontFamily: "inherit",
            lineHeight: 1.5,
            outline: "none",
            maxHeight: 160,
            minHeight: 38,
          }}
        />
        <button
          type="submit"
          disabled={!draft.trim() || busy}
          className="hf-btn pill"
          style={{
            opacity: !draft.trim() || busy ? 0.55 : 1,
            cursor: !draft.trim() || busy ? "not-allowed" : "pointer",
            padding: "9px 16px",
          }}
        >
          {busy ? "…" : "Send"}
        </button>
      </form>
    </section>
  );
}

function ChatBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "28px 1fr",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          marginTop: 1,
          background: isUser ? "var(--hf-bg)" : "rgba(196,165,255,0.12)",
          border: isUser
            ? "1px solid var(--hf-line)"
            : "1px solid rgba(196,165,255,0.3)",
          display: "grid",
          placeItems: "center",
          fontSize: 10.5,
          color: isUser ? "var(--hf-ink-3)" : "#c4a5ff",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          fontWeight: 600,
        }}
      >
        {isUser ? "you" : "✦"}
      </span>
      <div
        style={{
          minWidth: 0,
          fontSize: 13.5,
          color: isUser ? "var(--hf-ink)" : "var(--hf-ink-2)",
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {content}
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "28px 1fr",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          marginTop: 1,
          background: "rgba(196,165,255,0.12)",
          border: "1px solid rgba(196,165,255,0.3)",
          display: "grid",
          placeItems: "center",
          fontSize: 10.5,
          color: "#c4a5ff",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          fontWeight: 600,
        }}
      >
        ✦
      </span>
      <div
        className="hf-mono"
        style={{
          fontSize: 12,
          color: "var(--hf-ink-3)",
          letterSpacing: "0.04em",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          paddingTop: 4,
        }}
      >
        <span style={{ display: "inline-flex", gap: 3 }}>
          <Dot delay={0} />
          <Dot delay={140} />
          <Dot delay={280} />
        </span>
        <span>thinking</span>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      style={{
        width: 5,
        height: 5,
        borderRadius: 999,
        background: "#c4a5ff",
        animation: "hf-pulse 900ms ease-in-out infinite",
        animationDelay: `${delay}ms`,
      }}
    />
  );
}
