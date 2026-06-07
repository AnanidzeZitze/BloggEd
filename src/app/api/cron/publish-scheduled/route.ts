import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { db } from "@/lib/db";
import { getOAuth2Client } from "@/lib/google-auth";
import { safeDecrypt, encrypt } from "@/lib/encrypt";

// Vercel Cron: runs every 15 minutes (configured in vercel.json)
// Publishes posts with status=SCHEDULED where publishedAt <= now

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

interface PostSection { heading: string; paragraphs: string[] }
interface ImageMetaphor { section_index: number; scene_description: string; url?: string }
interface GeneratedPost { title: string; subtitle: string; sections: PostSection[]; image_metaphors: ImageMetaphor[] }

function compilePostToHtml(post: GeneratedPost): string {
  const parts: string[] = [];
  if (post.subtitle) {
    parts.push(
      `<p style="font-size:1.15em;color:#555;font-style:italic;border-left:3px solid #1a73e8;padding-left:14px;margin-bottom:1.5em;">${escapeHtml(post.subtitle)}</p>`
    );
  }
  const img1 = post.image_metaphors?.find((m) => m.section_index === 0);
  const img1Url = img1?.url ? sanitizeImageUrl(img1.url) : "";
  if (img1Url) {
    parts.push(
      `<div style="text-align:center;margin:1.5em 0;"><img src="${img1Url}" alt="${escapeHtml("Illustration for " + post.title)}" style="max-width:100%;height:auto;border-radius:8px;" /></div>`
    );
  }
  const totalSections = post.sections.length;
  const img2At = Math.max(1, Math.floor(totalSections / 2));
  post.sections.forEach((section, index) => {
    if (section.heading) parts.push(`<h2 style="color:#1a3c5e;margin-top:1.8em;">${escapeHtml(section.heading)}</h2>`);
    section.paragraphs.forEach((para) => parts.push(`<p>${escapeHtml(para)}</p>`));
    if (index === img2At) {
      const img2 = post.image_metaphors?.find((m) => m.section_index > 0);
      const img2Url = img2?.url ? sanitizeImageUrl(img2.url) : "";
      if (img2Url) {
        parts.push(
          `<div style="text-align:center;margin:1.5em 0;"><img src="${img2Url}" alt="${escapeHtml("Illustration for " + post.title)}" style="max-width:100%;height:auto;border-radius:8px;" /></div>`
        );
      }
    }
  });
  return `<div>${parts.join("\n\n")}</div>`.replace(/{/g, "&#123;").replace(/}/g, "&#125;");
}

export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all posts due for publishing
  const duePosts = await db.post.findMany({
    where: {
      status: "SCHEDULED",
      publishedAt: { lte: now },
    },
    include: {
      campaign: {
        include: {
          workspace: true,
        },
      },
    },
    take: 20, // process at most 20 per run to avoid timeout
  });

  const results: Array<{ postId: string; success: boolean; error?: string }> = [];

  for (const post of duePosts) {
    const workspace = post.campaign.workspace;

    try {
      if (!workspace.googleRefreshToken) {
        throw new Error("No Google token for workspace");
      }

      // Build Blogger client
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({
        access_token: safeDecrypt(workspace.googleAccessToken) ?? undefined,
        refresh_token: safeDecrypt(workspace.googleRefreshToken) ?? undefined,
        expiry_date: workspace.googleTokenExpiry?.getTime() ?? undefined,
      });
      oauth2Client.on("tokens", async (tokens) => {
        await db.workspace.update({
          where: { id: workspace.id },
          data: {
            googleAccessToken: tokens.access_token ? encrypt(tokens.access_token) : undefined,
            googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          },
        });
      });
      const blogger = google.blogger({ version: "v3", auth: oauth2Client });

      const blogId = workspace.bloggerBlogId ?? process.env.BLOG_ID ?? "";
      if (!blogId) throw new Error("No Blogger blog ID configured");

      const content = post.content as GeneratedPost | null;
      if (!content?.sections) throw new Error("Post has no content");

      const htmlContent = compilePostToHtml(content);

      const res = await blogger.posts.insert({
        blogId,
        isDraft: false,
        requestBody: {
          title: post.title,
          content: htmlContent,
          labels: ["AI Generated"],
        },
      });

      await db.post.update({
        where: { id: post.id },
        data: {
          status: "PUBLISHED",
          bloggerUrl: res.data.url ?? null,
          bloggerId: res.data.id ?? null,
          publishedAt: now,
        },
      });

      results.push({ postId: post.id, success: true });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[Cron] Failed to publish post ${post.id}:`, error);
      results.push({ postId: post.id, success: false, error });
    }
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    results,
  });
}
