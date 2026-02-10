import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { publishEvent } from "@/lib/events";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: "Authentication and active organization are required."
      },
      { status: 401 }
    );
  }

  const now = new Date().toISOString();

  try {
    await publishEvent({
      event_id: crypto.randomUUID(),
      event_name: "dashboard_test_event",
      occurred_at: now,
      received_at: now,
      org_id: orgId,
      user_id: userId,
      source: "webtools-dashboard",
      payload: {
        method: request.method,
        path: request.nextUrl.pathname,
        user_agent: request.headers.get("user-agent") ?? undefined
      }
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        error: "PUBLISH_FAILED",
        message: "Failed to publish event."
      },
      { status: 500 }
    );
  }
}
