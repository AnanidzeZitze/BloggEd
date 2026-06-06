import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/lib/google-auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const workspaceId = searchParams.get("state") || "default_workspace";

  if (!code) {
    return NextResponse.json(
      { success: false, error: "Missing authorization code" },
      { status: 400 }
    );
  }

  try {
    const oauth2Client = getOAuth2Client();

    // Exchange auth code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log(`[OAuth Callback] Exchanged tokens successfully for workspace: ${workspaceId}`);

    const tokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    // Save tokens securely in the cloud database
    await db.workspace.upsert({
      where: { id: workspaceId },
      update: {
        googleAccessToken: tokens.access_token,
        // The refresh token is only sent on first consent. We preserve the old one if none returned.
        googleRefreshToken: tokens.refresh_token || undefined,
        googleTokenExpiry: tokenExpiry,
      },
      create: {
        id: workspaceId,
        name: workspaceId === "default_workspace" ? "Signal & Noise (Cloud)" : "Connected Brand Workspace",
        slug: workspaceId === "default_workspace" ? "signal-noise-cloud" : `brand-${workspaceId.substring(0, 8)}`,
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: tokenExpiry,
      }
    });

    console.log(`[OAuth Callback] Saved credentials to Workspace model in Cloud DB: ${workspaceId}`);

    // Redirect the user back to the settings panel
    const redirectUrl = new URL("/dashboard/settings", req.url);
    redirectUrl.searchParams.set("google_connected", "true");
    return NextResponse.redirect(redirectUrl);

  } catch (err: unknown) {
    console.error("[OAuth Callback] OAuth exchange error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
