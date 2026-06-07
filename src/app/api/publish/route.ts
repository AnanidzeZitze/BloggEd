import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { db } from "@/lib/db";
import { getOAuth2Client } from "@/lib/google-auth";
import { getAuthenticatedWorkspace } from "@/lib/workspace-guard";
import { safeDecrypt, encrypt } from "@/lib/encrypt";
import { publishLimiter, checkRateLimit } from "@/lib/rate-limit";

interface PostSection {
  heading: string;
  paragraphs: string[];
}

interface ImageMetaphor {
  section_index: number;
  scene_description: string;
  url?: string;
}

interface GeneratedPost {
  title: string;
  subtitle: string;
  sections: PostSection[];
  image_metaphors: ImageMetaphor[];
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeImageUrl(url: string): string {
  if (url.startsWith("https://") || url.startsWith("data:image/")) return url;
  return "";
}

function compilePostToHtml(post: GeneratedPost): string {
  const parts: string[] = [];

  if (post.subtitle) {
    parts.push(
      `<p style="font-size:1.15em;color:#555;font-style:italic;` +
      `border-left:3px solid #1a73e8;padding-left:14px;` +
      `margin-bottom:1.5em;">${escapeHtml(post.subtitle)}</p>`
    );
  }

  const img1 = post.image_metaphors.find((m) => m.section_index === 0);
  const img1Url = img1?.url ? sanitizeImageUrl(img1.url) : "";
  if (img1Url) {
    parts.push(
      `<div style="text-align:center;margin:1.5em 0;">` +
      `<img src="${img1Url}" alt="${escapeHtml("Illustration for " + post.title)}" ` +
      `style="max-width:100%;height:auto;border-radius:8px;" /></div>`
    );
  }

  const totalSections = post.sections.length;
  const img2At = Math.max(1, Math.floor(totalSections / 2));

  post.sections.forEach((section, index) => {
    if (section.heading) {
      parts.push(`<h2 style="color:#1a3c5e;margin-top:1.8em;">${escapeHtml(section.heading)}</h2>`);
    }
    section.paragraphs.forEach((para) => parts.push(`<p>${escapeHtml(para)}</p>`));

    if (index === img2At) {
      const img2 = post.image_metaphors.find((m) => m.section_index > 0);
      const img2Url = img2?.url ? sanitizeImageUrl(img2.url) : "";
      if (img2Url) {
        parts.push(
          `<div style="text-align:center;margin:1.5em 0;">` +
          `<img src="${img2Url}" alt="${escapeHtml("Illustration for " + post.title)}" ` +
          `style="max-width:100%;height:auto;border-radius:8px;" /></div>`
        );
      }
    }
  });

  return `<div>${parts.join("\n\n")}</div>`
    .replace(/{/g, "&#123;")
    .replace(/}/g, "&#125;");
}

// ---------------------------------------------------------------------------
// Blogger client (decrypts stored tokens)
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
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Auth
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  // 2. Rate limit
  const { limited } = await checkRateLimit(publishLimiter, userId);
  if (limited) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded. Try again shortly." },
      { status: 429 }
    );
  }

  // 3. Workspace ownership
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const { workspace, error: wsError, status: wsStatus } = await getAuthenticatedWorkspace(workspaceId);
  if (wsError || !workspace) {
    return NextResponse.json({ success: false, error: wsError }, { status: wsStatus });
  }

  // 4. Parse body
  let body: { post?: GeneratedPost; isDraft?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const post = body.post;
  if (!post?.title || !Array.isArray(post.sections)) {
    return NextResponse.json({ success: false, error: "Missing or invalid post content." }, { status: 400 });
  }

  const isDraft = body.isDraft !== false;

  try {
    const blogger = await getBloggerClient(workspace.id);
    const blogId = workspace.bloggerBlogId ?? process.env.BLOG_ID ?? "";

    if (!blogId) {
      return NextResponse.json(
        { success: false, error: "No Blogger blog ID configured for this workspace." },
        { status: 400 }
      );
    }

    const htmlContent = compilePostToHtml(post);

    const res = await blogger.posts.insert({
      blogId,
      isDraft,
      requestBody: {
        title: post.title,
        content: htmlContent,
        labels: ["AI Generated", "Signal & Noise"],
      },
    });

    return NextResponse.json({
      success: true,
      blogger_post: res.data,
      message: isDraft ? "Draft published to Blogger." : "Post published live to Blogger.",
    });
  } catch (err: unknown) {
    console.error("[Publish] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "production"
            ? "Publish failed. Please try again."
            : (err instanceof Error ? err.message : String(err)),
      },
      { status: 500 }
    );
  }
}
