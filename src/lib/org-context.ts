import { auth } from "@clerk/nextjs/server";

import { ensureTenant } from "@/lib/ensure-tenant";

export type OrgContext = {
  orgId: string;
  userId: string;
};

export async function getOrCreateOrgContext(): Promise<OrgContext | null> {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return null;
  }

  await ensureTenant({ orgId, userId });

  return { orgId, userId };
}
