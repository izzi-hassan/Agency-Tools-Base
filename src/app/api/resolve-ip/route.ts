import { auth } from "@clerk/nextjs/server";
import { promises as dns } from "node:dns";
import { NextResponse } from "next/server";
import { z } from "zod";

const domainRegex = /^(?=.{3,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

const resolveIpSchema = z.object({
  domain: z.string().trim().toLowerCase().regex(domainRegex, "Invalid domain")
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: "Authentication is required."
      },
      { status: 401 }
    );
  }

  if (!orgId) {
    return NextResponse.json(
      {
        error: "ORG_REQUIRED",
        message: "An active organization is required."
      },
      { status: 400 }
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = resolveIpSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Invalid domain payload.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const domain = parsed.data.domain;

  const [ipv4Result, ipv6Result] = await Promise.allSettled([
    dns.resolve4(domain),
    dns.resolve6(domain)
  ]);

  const ipv4 = ipv4Result.status === "fulfilled" ? ipv4Result.value : [];
  const ipv6 = ipv6Result.status === "fulfilled" ? ipv6Result.value : [];

  if (ipv4.length === 0 && ipv6.length === 0) {
    const errors = [ipv4Result, ipv6Result]
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => (result.reason instanceof Error ? result.reason.message : String(result.reason)));

    return NextResponse.json(
      {
        error: "RESOLVE_FAILED",
        message: errors[0] ?? "Failed to resolve DNS records.",
        ipv4,
        ipv6
      },
      { status: 422 }
    );
  }

  return NextResponse.json({ ipv4, ipv6 });
}
