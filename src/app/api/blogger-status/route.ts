import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { db } from "@/lib/db";
import { getOAuth2Client } from "@/lib/google-auth";
import { getAuthenticatedWorkspace } from "@/lib/workspace-guard";
import { safeDecrypt, encrypt } from "@/lib/encrypt";

// ---------------------------------------------------------------------------
// Blogger client
// ---------------------------------------------------------------------------

async function getBloggerClient(workspaceId: string) {
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });

  if (!workspace?.googleRefreshToken) {
    throw new Error("Google account not connected. Connect it in Settings.");
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: safeDecrypt(workspace.googleAccessToken) ?? undefined,
    refresh_token: safeDecrypt(workspace.googleRefreshToken) ?? undefined,
    expiry_date: workspace.googleTokenExpiry?.getTime() ?? undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    await db.workspace.update({
      where: { id: workspaceId },
      data: {
        googleAccessToken: tokens.access_token ? encrypt(tokens.access_token) : undefined,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
    });
  });

  return google.blogger({ version: "v3", auth: oauth2Client });
}

// ---------------------------------------------------------------------------
// GET — fetch live status from Blogger
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const bloggerId = searchParams.get("bloggerId");

  const { workspace, error: wsError, status: wsStatus } = await getAuthenticatedWorkspace(workspaceId);
  if (wsError || !workspace) {
    return NextResponse.json({ success: false, error: wsError }, { status: wsStatus });
  }

  if (!bloggerId) {
    return NextResponse.json({ success: false, error: "bloggerId is required" }, { status: 400 });
  }

  try {
    const blogger = await getBloggerClient(workspace.id);
    const blogId = workspace.bloggerBlogId ?? process.env.BLOG_ID ?? "";

    if (!blogId) {
      return NextResponse.json(
        { success: false, error: "No Blogger blog ID configured for this workspace." },
        { status: 400 }
      );
    }

    const res = await blogger.posts.get({ blogId, postId: bloggerId });

    const isLive = res.data.status === "LIVE";

    return NextResponse.json({
      success: true,
      data: {
        status: isLive ? "LIVE" : "DRAFT",
        url: res.data.url ?? null,
        title: res.data.title ?? null,
        published: res.data.published ?? null,
        updated: res.data.updated ?? null,
      },
    });
  } catch (err: unknown) {
    console.error("[BloggerStatus GET] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST — publish an existing Blogger draft to live
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const bloggerId = searchParams.get("bloggerId");
  const postDbId = searchParams.get("postDbId");

  const { workspace, error: wsError, status: wsStatus } = await getAuthenticatedWorkspace(workspaceId);
  if (wsError || !workspace) {
    return NextResponse.json({ success: false, error: wsError }, { status: wsStatus });
  }

  if (!bloggerId) {
    return NextResponse.json({ success: false, error: "bloggerId is required" }, { status: 400 });
  }

  try {
    const blogger = await getBloggerClient(workspace.id);
    const blogId = workspace.bloggerBlogId ?? process.env.BLOG_ID ?? "";

    if (!blogId) {
      return NextResponse.json(
        { success: false, error: "No Blogger blog ID configured for this workspace." },
        { status: 400 }
      );
    }

    const res = await blogger.posts.publish({ blogId, postId: bloggerId });

    const publishedUrl = res.data.url ?? null;

    // Patch the DB post if a DB id was provided
    if (postDbId) {
      try {
        const existing = await db.post.findUnique({ where: { id: postDbId } });
        await db.post.update({
          where: { id: postDbId },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
            bloggerUrl: publishedUrl ?? existing?.bloggerUrl ?? null,
          },
        });
      } catch (dbErr) {
        console.error("[BloggerStatus POST] DB patch failed:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        url: publishedUrl,
        status: "LIVE",
      },
    });
  } catch (err: unknown) {
    console.error("[BloggerStatus POST] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
