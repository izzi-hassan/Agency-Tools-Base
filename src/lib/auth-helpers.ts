import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { ensureTenant } from "@/lib/ensure-tenant";

export type AuthResult =
  | { ok: true; userId: string; orgId: string }
  | { ok: false; response: NextResponse };

export async function requireAuth(options?: { ensureTenantRecord?: boolean }): Promise<AuthResult> {
  const { userId, orgId } = await auth();

  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication is required." },
        { status: 401 }
      )
    };
  }

  if (!orgId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "ORG_REQUIRED", message: "An active organization is required." },
        { status: 400 }
      )
    };
  }

  if (options?.ensureTenantRecord ?? true) {
    await ensureTenant({ orgId, userId });
  }

  return { ok: true, userId, orgId };
}
