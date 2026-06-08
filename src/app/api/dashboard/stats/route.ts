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

  // Posts belong to series → campaign → workspace, so we filter via series.campaign.workspaceId
  const postWhereWorkspace = { series: { campaign: { workspaceId: wid } } };

  const [campaignCount, statusGroups, recentPosts, campaigns] = await Promise.all([
    db.campaign.count({ where: { workspaceId: wid } }),

    db.post.groupBy({
      by: ["status"],
      where: postWhereWorkspace,
      _count: { _all: true },
    }),

    db.post.findMany({
      where: postWhereWorkspace,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        series: {
          select: { name: true, campaign: { select: { name: true } } },
        },
      },
    }),

    db.campaign.findMany({
      where: { workspaceId: wid },
      include: {
        _count: { select: { series: true } },
      },
    }),
  ]);

  const counts = Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all]));

  return NextResponse.json({
    success: true,
    data: {
      activeCampaigns: campaignCount,
      draftPosts: counts["DRAFT"] ?? 0,
      publishedPosts: counts["PUBLISHED"] ?? 0,
      scheduledPosts: counts["SCHEDULED"] ?? 0,
      recentPosts: recentPosts.map((p) => ({
        id: p.id,
        title: p.title,
        campaign: `${p.series.campaign.name} › ${p.series.name}`,
        status: p.status,
        date: p.publishedAt ? formatDate(p.publishedAt) : formatDate(p.createdAt),
        bloggerUrl: p.bloggerUrl ?? null,
      })),
      campaignProgress: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        seriesCount: c._count.series,
      })),
    },
  });
}
