import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// We protect all routes starting with /dashboard and related APIs
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/api/generate(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html|css|js|gif|svg|png|webp|jpg|jpeg|webp|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
