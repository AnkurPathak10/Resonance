import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

const isOrgSelectionRoute = createRouteMatcher([
  "/org-selection(.*)",
]);

export default clerkMiddleware(
  async (auth, req) => {
    const { userId, orgId } = await auth();

    // Allow public routes
    if (isPublicRoute(req)) {
      return NextResponse.next();
    }

    if (!userId) {
      await auth.protect();
    }

    if (isOrgSelectionRoute(req)) {
      return NextResponse.next();
    }

    // For every protected route, ensure org is selected
    if (userId && !orgId) {
      const orgSelection = new URL("/org-selection", req.url);
      return NextResponse.redirect(orgSelection);
    }

    return NextResponse.next();
  },
  {
    // Local machine clock is ~9s behind Clerk; default tolerance is 5s
    clockSkewInMs: process.env.NODE_ENV === "development" ? 15_000 : 5_000,
  },
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Always run for Clerk-specific frontend API routes
    '/__clerk/(.*)',
  ],
}
