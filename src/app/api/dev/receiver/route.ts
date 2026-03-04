import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const body = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = body;
  }

  const eventType =
    headers["x-hookwise-event-type"] ??
    headers["x-event-type"] ??
    "unknown";

  const preview =
    typeof parsed === "object" && parsed !== null
      ? JSON.stringify(parsed).slice(0, 200)
      : String(parsed).slice(0, 200);

  console.log(
    `\x1b[32m[dev-receiver]\x1b[0m Received delivery | type=${eventType} | preview=${preview}`
  );

  return NextResponse.json({ ok: true }, { status: 200 });
}
