import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOAuth2Client } from "@/lib/google-auth";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ success: false, error: "workspaceId is required" }, { status: 400 });
  }

  try {
    const csrfToken = randomBytes(16).toString("hex");
    const statePayload = Buffer.from(
      JSON.stringify({ workspaceId, userId, csrfToken })
    ).toString("base64url");

    const oauth2Client = getOAuth2Client();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/blogger"],
      state: statePayload,
    });

    const response = NextResponse.redirect(authUrl);
    response.cookies.set("oauth_csrf", csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 300,
      path: "/api/auth/google/callback",
    });
    return response;
  } catch (err: unknown) {
    console.error("[OAuth SignIn] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to initiate OAuth flow" }, { status: 500 });
  }
}
