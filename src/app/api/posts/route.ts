import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getAuthenticatedWorkspace } from "@/lib/workspace-guard";
import { Prisma } from "@prisma/client";

async function getAuthenticatedPost(postId: string, userId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
    include: {
      series: {
        include: { campaign: { include: { workspace: { select: { clerkUserId: true } } } } },
      },
    },
  });
  if (!post) return { post: null, error: "Post not found", status: 404 as const };
  if (post.series.campaign.workspace.clerkUserId !== userId)
    return { post: null, error: "Forbidden", status: 403 as const };
  return { post, error: null, status: 200 as const };
}

function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// GET /api/posts?workspaceId=...  optional: &seriesId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { workspace, error, status } = await getAuthenticatedWorkspace(searchParams.get("workspaceId"));
  if (error || !workspace) return NextResponse.json({ success: false, error }, { status });

  const seriesId = searchParams.get("seriesId");

  const posts = await db.post.findMany({
    where: {
      series: {
        campaign: { workspaceId: workspace.id },
        ...(seriesId ? { id: seriesId } : {}),
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      series: { select: { id: true, name: true, campaignId: true, campaign: { select: { name: true } } } },
    },
  });

  return NextResponse.json({
    success: true,
    data: posts.map((p) => ({
      id: p.id,
      title: p.title,
      subtitle: p.subtitle ?? "",
      seriesId: p.series.id,
      seriesName: p.series.name,
      campaignId: p.series.campaignId,
      campaignName: p.series.campaign.name,
      status: p.status,
      bloggerUrl: p.bloggerUrl ?? null,
      bloggerId: p.bloggerId ?? null,
      content: p.content ?? null,
      createdAt: fmt(p.createdAt),
      publishedAt: p.publishedAt ? fmt(p.publishedAt) : null,
    })),
  });
}

// POST /api/posts?workspaceId=...
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { workspace, error, status } = await getAuthenticatedWorkspace(searchParams.get("workspaceId"));
  if (error || !workspace) return NextResponse.json({ success: false, error }, { status });

  let body: {
    seriesId?: string;
    templateId?: string;
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

  if (!body.seriesId) return NextResponse.json({ success: false, error: "seriesId is required" }, { status: 400 });
  if (!body.title?.trim()) return NextResponse.json({ success: false, error: "title is required" }, { status: 400 });

  const series = await db.series.findFirst({
    where: { id: body.seriesId, campaign: { workspaceId: workspace.id } },
  });
  if (!series) return NextResponse.json({ success: false, error: "Series not found in this workspace" }, { status: 404 });

  const post = await db.post.create({
    data: {
      seriesId: body.seriesId,
      templateId: body.templateId ?? null,
      title: body.title.trim().slice(0, 500),
      subtitle: body.subtitle?.trim().slice(0, 500) ?? null,
      postInputContext: body.postInputContext?.trim().slice(0, 2000) ?? null,
      status: body.status ?? "DRAFT",
      content: body.content ?? Prisma.JsonNull,
      bloggerUrl: body.bloggerUrl ?? null,
      bloggerId: body.bloggerId ?? null,
      publishedAt: body.status === "PUBLISHED" ? new Date() : null,
    },
    include: {
      series: { select: { id: true, name: true, campaignId: true, campaign: { select: { name: true } } } },
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: post.id,
      title: post.title,
      seriesId: post.series.id,
      seriesName: post.series.name,
      campaignName: post.series.campaign.name,
      status: post.status,
      createdAt: fmt(post.createdAt),
    },
  }, { status: 201 });
}

// PATCH /api/posts?id=...
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });

  const { post, error, status } = await getAuthenticatedPost(id, userId);
  if (error || !post) return NextResponse.json({ success: false, error }, { status });

  let body: {
    title?: string; subtitle?: string; content?: Prisma.InputJsonValue;
    status?: string; bloggerUrl?: string; bloggerId?: string;
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
    include: {
      series: { select: { id: true, name: true, campaignId: true, campaign: { select: { name: true } } } },
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      title: updated.title,
      seriesId: updated.series.id,
      seriesName: updated.series.name,
      campaignName: updated.series.campaign.name,
      status: updated.status,
      bloggerUrl: updated.bloggerUrl ?? null,
      bloggerId: updated.bloggerId ?? null,
      content: updated.content ?? null,
      createdAt: fmt(updated.createdAt),
    },
  });
}

// DELETE /api/posts?id=...
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });

  const { post, error, status } = await getAuthenticatedPost(id, userId);
  if (error || !post) return NextResponse.json({ success: false, error }, { status });

  await db.post.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
