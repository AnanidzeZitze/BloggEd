import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/lib/google-auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const rawState = searchParams.get("state");

  if (!code || !rawState) {
    return NextResponse.json({ success: false, error: "Missing authorization code or state" }, { status: 400 });
  }

  // Decode and validate state payload
  let stateData: { workspaceId: string; userId: string; csrfToken: string };
  try {
    stateData = JSON.parse(Buffer.from(rawState, "base64url").toString("utf-8"));
  } catch {
    return NextResponse.json({ success: false, error: "Malformed state parameter" }, { status: 400 });
  }

  if (!stateData.workspaceId || !stateData.userId || !stateData.csrfToken) {
    return NextResponse.json({ success: false, error: "Incomplete state parameter" }, { status: 400 });
  }

  // Verify CSRF token from HttpOnly cookie — this proves the callback originates
  // from the same browser that started the OAuth flow on our server.
  const cookieCsrf = req.cookies.get("oauth_csrf")?.value;
  if (!cookieCsrf || cookieCsrf !== stateData.csrfToken) {
    return NextResponse.json({ success: false, error: "CSRF token invalid" }, { status: 403 });
  }

  // Verify workspace ownership using the userId embedded in the state at flow-initiation time
  const workspace = await db.workspace.findUnique({ where: { id: stateData.workspaceId } });
  if (!workspace || workspace.clerkUserId !== stateData.userId) {
    return NextResponse.json({ success: false, error: "Workspace not found or access denied" }, { status: 403 });
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    await db.workspace.update({
      where: { id: stateData.workspaceId },
      data: {
        googleAccessToken: tokens.access_token ? encrypt(tokens.access_token) : undefined,
        googleRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
    });

    const redirectUrl = new URL("/dashboard/settings", req.url);
    redirectUrl.searchParams.set("google_connected", "true");
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete("oauth_csrf");
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[OAuth Callback] Token exchange error:", err);
    return NextResponse.json(
      { success: false, error: "OAuth exchange failed", detail: message },
      { status: 500 }
    );
  }
}
