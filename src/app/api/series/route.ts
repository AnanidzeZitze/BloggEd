import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getAuthenticatedWorkspace } from "@/lib/workspace-guard";

function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function getAuthenticatedSeries(seriesId: string, userId: string) {
  const series = await db.series.findUnique({
    where: { id: seriesId },
    include: { campaign: { include: { workspace: { select: { clerkUserId: true } } } } },
  });
  if (!series) return { series: null, error: "Series not found", status: 404 as const };
  if (series.campaign.workspace.clerkUserId !== userId)
    return { series: null, error: "Forbidden", status: 403 as const };
  return { series, error: null, status: 200 as const };
}

// GET /api/series?campaignId=...  OR  ?id=...&campaignId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");
  const id = searchParams.get("id");
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });

  if (id) {
    const { series, error, status } = await getAuthenticatedSeries(id, userId);
    if (error || !series) return NextResponse.json({ success: false, error }, { status });
    return NextResponse.json({
      success: true,
      data: {
        id: series.id,
        campaignId: series.campaignId,
        templateId: series.templateId ?? null,
        name: series.name,
        description: series.description ?? "",
        seriesContext: series.seriesContext ?? "",
        keywordCluster: series.keywordCluster ?? "",
        postsCount: 0,
        createdAt: fmt(series.createdAt),
      },
    });
  }

  if (!campaignId) return NextResponse.json({ success: false, error: "campaignId is required" }, { status: 400 });

  const campaign = await db.campaign.findFirst({
    where: { id: campaignId },
    include: { workspace: { select: { clerkUserId: true } } },
  });
  if (!campaign || campaign.workspace.clerkUserId !== userId)
    return NextResponse.json({ success: false, error: "Campaign not found or forbidden" }, { status: 403 });

  const seriesList = await db.series.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { posts: true } } },
  });

  return NextResponse.json({
    success: true,
    data: seriesList.map((s) => ({
      id: s.id,
      campaignId: s.campaignId,
      templateId: s.templateId ?? null,
      name: s.name,
      description: s.description ?? "",
      seriesContext: s.seriesContext ?? "",
      keywordCluster: s.keywordCluster ?? "",
      postsCount: s._count.posts,
      createdAt: fmt(s.createdAt),
    })),
  });
}

// POST /api/series?campaignId=...
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ success: false, error: "campaignId is required" }, { status: 400 });

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });

  const campaign = await db.campaign.findFirst({
    where: { id: campaignId },
    include: { workspace: { select: { clerkUserId: true } } },
  });
  if (!campaign || campaign.workspace.clerkUserId !== userId)
    return NextResponse.json({ success: false, error: "Campaign not found or forbidden" }, { status: 403 });

  let body: { name?: string; description?: string; seriesContext?: string; keywordCluster?: string; templateId?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name?.trim())
    return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });

  // If a template is provided, use it to pre-fill missing fields
  let contextDefault = body.seriesContext?.trim() ?? null;
  let keywordsDefault = body.keywordCluster?.trim() ?? null;
  if (body.templateId) {
    const tpl = await db.template.findFirst({
      where: { id: body.templateId, workspaceId: campaign.workspaceId, templateType: "SERIES" },
    });
    if (tpl) {
      if (!contextDefault && tpl.proseBrief) contextDefault = tpl.proseBrief;
      if (!keywordsDefault && tpl.keywordCluster) keywordsDefault = tpl.keywordCluster;
    }
  }

  const series = await db.series.create({
    data: {
      campaignId,
      templateId: body.templateId ?? null,
      name: body.name.trim().slice(0, 200),
      description: body.description?.trim().slice(0, 500) ?? null,
      seriesContext: contextDefault?.slice(0, 3000) ?? null,
      keywordCluster: keywordsDefault?.slice(0, 1000) ?? null,
    },
    include: { _count: { select: { posts: true } } },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: series.id,
      campaignId: series.campaignId,
      templateId: series.templateId ?? null,
      name: series.name,
      description: series.description ?? "",
      seriesContext: series.seriesContext ?? "",
      keywordCluster: series.keywordCluster ?? "",
      postsCount: series._count.posts,
      createdAt: fmt(series.createdAt),
    },
  }, { status: 201 });
}

// PATCH /api/series?id=...
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });

  const { series, error, status } = await getAuthenticatedSeries(id, userId);
  if (error || !series) return NextResponse.json({ success: false, error }, { status });

  let body: { name?: string; description?: string; seriesContext?: string; keywordCluster?: string; templateId?: string | null };
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const updated = await db.series.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name.trim().slice(0, 200) }),
      ...(body.description !== undefined && { description: body.description.trim().slice(0, 500) }),
      ...(body.seriesContext !== undefined && { seriesContext: body.seriesContext.trim().slice(0, 3000) }),
      ...(body.keywordCluster !== undefined && { keywordCluster: body.keywordCluster.trim().slice(0, 1000) }),
      ...(body.templateId !== undefined && { templateId: body.templateId }),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/series?id=...
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });

  const { series, error, status } = await getAuthenticatedSeries(id, userId);
  if (error || !series) return NextResponse.json({ success: false, error }, { status });

  await db.series.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
