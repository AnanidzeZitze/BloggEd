import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getAuthenticatedWorkspace } from "@/lib/workspace-guard";
import { Prisma } from "@prisma/client";

// Verify a post belongs to the authenticated user (through campaign → workspace)
async function getAuthenticatedPost(postId: string, userId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
    include: {
      campaign: {
        include: { workspace: { select: { clerkUserId: true } } },
      },
    },
  });
  if (!post) return { post: null, error: "Post not found", status: 404 as const };
  if (post.campaign.workspace.clerkUserId !== userId) return { post: null, error: "Forbidden", status: 403 as const };
  return { post, error: null, status: 200 as const };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// GET /api/posts?workspaceId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { workspace, error, status } = await getAuthenticatedWorkspace(searchParams.get("workspaceId"));
  if (error || !workspace) return NextResponse.json({ success: false, error }, { status });

  const campaignId = searchParams.get("campaignId");

  const posts = await db.post.findMany({
    where: {
      campaign: {
        workspaceId: workspace.id,
        ...(campaignId ? { id: campaignId } : {}),
      },
    },
    orderBy: { createdAt: "desc" },
    include: { campaign: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    success: true,
    data: posts.map((p) => ({
      id: p.id,
      title: p.title,
      subtitle: p.subtitle ?? "",
      campaignId: p.campaign.id,
      campaignName: p.campaign.name,
      status: p.status,
      bloggerUrl: p.bloggerUrl ?? null,
      bloggerId: p.bloggerId ?? null,
      content: p.content ?? null,
      createdAt: formatDate(p.createdAt),
      publishedAt: p.publishedAt ? formatDate(p.publishedAt) : null,
    })),
  });
}

// POST /api/posts?workspaceId=...  — create a new draft post
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { workspace, error, status } = await getAuthenticatedWorkspace(searchParams.get("workspaceId"));
  if (error || !workspace) return NextResponse.json({ success: false, error }, { status });

  let body: {
    campaignId?: string;
    title?: string;
    subtitle?: string;
    content?: Prisma.InputJsonValue;
    postInputContext?: string;
    status?: string;
    bloggerUrl?: string;
    bloggerId?: string;
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.campaignId) return NextResponse.json({ success: false, error: "campaignId is required" }, { status: 400 });
  if (!body.title?.trim()) return NextResponse.json({ success: false, error: "title is required" }, { status: 400 });

  // Verify the campaign belongs to this workspace
  const campaign = await db.campaign.findFirst({
    where: { id: body.campaignId, workspaceId: workspace.id },
  });
  if (!campaign) return NextResponse.json({ success: false, error: "Campaign not found in this workspace" }, { status: 404 });

  const post = await db.post.create({
    data: {
      campaignId: body.campaignId,
      title: body.title.trim().slice(0, 500),
      subtitle: body.subtitle?.trim().slice(0, 500) ?? null,
      postInputContext: body.postInputContext?.trim().slice(0, 2000) ?? null,
      status: body.status ?? "DRAFT",
      content: body.content ?? Prisma.JsonNull,
      bloggerUrl: body.bloggerUrl ?? null,
      bloggerId: body.bloggerId ?? null,
      publishedAt: body.status === "PUBLISHED" ? new Date() : null,
    },
    include: { campaign: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: post.id,
      title: post.title,
      subtitle: post.subtitle ?? "",
      campaignId: post.campaign.id,
      campaignName: post.campaign.name,
      status: post.status,
      bloggerUrl: post.bloggerUrl ?? null,
      bloggerId: post.bloggerId ?? null,
      content: post.content ?? null,
      createdAt: formatDate(post.createdAt),
    },
  }, { status: 201 });
}

// PATCH /api/posts?id=...  — update title/subtitle/content/status/bloggerUrl
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });

  const { post, error, status } = await getAuthenticatedPost(id, userId);
  if (error || !post) return NextResponse.json({ success: false, error }, { status });

  let body: {
    title?: string;
    subtitle?: string;
    content?: Prisma.InputJsonValue;
    status?: string;
    bloggerUrl?: string;
    bloggerId?: string;
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const isPublishing = body.status === "PUBLISHED" && post.status !== "PUBLISHED";

  const updated = await db.post.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title.trim().slice(0, 500) }),
      ...(body.subtitle !== undefined && { subtitle: body.subtitle.trim().slice(0, 500) }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.bloggerUrl !== undefined && { bloggerUrl: body.bloggerUrl }),
      ...(body.bloggerId !== undefined && { bloggerId: body.bloggerId }),
      ...(isPublishing && { publishedAt: new Date() }),
    },
    include: { campaign: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      title: updated.title,
      subtitle: updated.subtitle ?? "",
      campaignId: updated.campaign.id,
      campaignName: updated.campaign.name,
      status: updated.status,
      bloggerUrl: updated.bloggerUrl ?? null,
      bloggerId: updated.bloggerId ?? null,
      content: updated.content ?? null,
      createdAt: formatDate(updated.createdAt),
    },
  });
}

// DELETE /api/posts?id=...
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });

  const { post, error, status } = await getAuthenticatedPost(id, userId);
  if (error || !post) return NextResponse.json({ success: false, error }, { status });

  await db.post.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
