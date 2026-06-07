import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api/generate(.*)",
  "/api/publish(.*)",
  "/api/workspace(.*)",
  "/api/auth/google/signin(.*)",
  "/api/auth/google/callback(.*)",
]);

const isAuthPage = createRouteMatcher(["/sign-in", "/sign-up"]);

// Never protect these — Clerk needs them to complete OAuth flows
const isClerkCallback = createRouteMatcher([
  "/sign-in/sso-callback(.*)",
  "/sign-up/sso-callback(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Always allow Clerk's SSO callback pages through
  if (isClerkCallback(req)) return NextResponse.next();

  const { userId } = await auth();

  // Redirect already-authenticated users away from auth pages
  if (isAuthPage(req) && userId) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html|css|js|gif|svg|png|webp|jpg|jpeg|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
