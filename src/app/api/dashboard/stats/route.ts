import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedWorkspace } from "@/lib/workspace-guard";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { workspace, error, status } = await getAuthenticatedWorkspace(searchParams.get("workspaceId"));
  if (error || !workspace) return NextResponse.json({ success: false, error }, { status });

  const wid = workspace.id;

  const [campaigns, statusGroups, recentPosts, campaignPostCounts] = await Promise.all([
    // Total campaign count
    db.campaign.count({ where: { workspaceId: wid } }),

    // Post counts by status
    db.post.groupBy({
      by: ["status"],
      where: { campaign: { workspaceId: wid } },
      _count: { status: true },
    }),

    // 5 most recent posts with campaign name
    db.post.findMany({
      where: { campaign: { workspaceId: wid } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { campaign: { select: { name: true } } },
    }),

    // All campaigns with published/total post counts for progress bars
    db.campaign.findMany({
      where: { workspaceId: wid },
      include: {
        _count: { select: { posts: true } },
        posts: {
          where: { status: "PUBLISHED" },
          select: { id: true },
        },
      },
    }),
  ]);

  const counts = Object.fromEntries(statusGroups.map((g) => [g.status, g._count.status]));

  return NextResponse.json({
    success: true,
    data: {
      activeCampaigns: campaigns,
      draftPosts: counts["DRAFT"] ?? 0,
      publishedPosts: counts["PUBLISHED"] ?? 0,
      scheduledPosts: counts["SCHEDULED"] ?? 0,
      recentPosts: recentPosts.map((p) => ({
        id: p.id,
        title: p.title,
        campaign: p.campaign.name,
        status: p.status,
        date: p.publishedAt ? formatDate(p.publishedAt) : formatDate(p.createdAt),
        bloggerUrl: p.bloggerUrl ?? null,
      })),
      campaignProgress: campaignPostCounts.map((c) => ({
        id: c.id,
        name: c.name,
        totalPosts: c._count.posts,
        publishedPosts: c.posts.length,
        progress: c._count.posts > 0 ? Math.round((c.posts.length / c._count.posts) * 100) : 0,
      })),
    },
  });
}
