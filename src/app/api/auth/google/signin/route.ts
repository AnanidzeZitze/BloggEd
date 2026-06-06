import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/lib/google-auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || "default_workspace";

  try {
    const oauth2Client = getOAuth2Client();

    // Generate consent screen auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline", // Demands a refresh token for cloud database storage
      prompt: "consent",      // Guarantees we receive a refresh token on every login
      scope: ["https://www.googleapis.com/auth/blogger"],
      state: workspaceId,     // Embeds the workspaceId to bind tokens to on redirect
    });

    console.log(`[OAuth SignIn] Redirecting to Google for workspace: ${workspaceId}`);
    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    console.error("[OAuth SignIn] Error generating auth URL:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
