import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return;
  }

  const { userId, sessionClaims } = await auth();

  if (!userId) {
    await auth.protect();
    return;
  }

  const email =
    typeof sessionClaims?.email === "string"
      ? sessionClaims.email
      : typeof sessionClaims?.primary_email_address === "string"
        ? sessionClaims.primary_email_address
        : "";

  if (!email.toLowerCase().endsWith("@shinymetal.it")) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"]
};
