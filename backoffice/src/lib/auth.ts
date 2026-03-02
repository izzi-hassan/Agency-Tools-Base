import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

const BACKOFFICE_DOMAIN = "@shinymetal.it";

function isAllowedEmail(email: string | null): boolean {
  return Boolean(email && email.toLowerCase().endsWith(BACKOFFICE_DOMAIN));
}

export async function requireBackofficeAuth() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const email =
    user?.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId)?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    null;

  if (!isAllowedEmail(email)) {
    redirect("/sign-in");
  }

  return { userId, email: email! };
}

export async function requireBackofficeApiAuth() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await currentUser();
  const email =
    user?.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId)?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    null;

  if (!isAllowedEmail(email)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  return null;
}
