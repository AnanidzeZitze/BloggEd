import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getAuthenticatedWorkspace } from "@/lib/workspace-guard";

async function getAuthenticatedCampaign(campaignId: string, userId: string) {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: { workspace: { select: { clerkUserId: true } } },
  });
  if (!campaign) return { campaign: null, error: "Campaign not found", status: 404 as const };
  if (campaign.workspace.clerkUserId !== userId) return { campaign: null, error: "Forbidden", status: 403 as const };
  return { campaign, error: null, status: 200 as const };
}

function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// GET /api/campaigns?workspaceId=...  OR  ?id=...&workspaceId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { workspace, error, status } = await getAuthenticatedWorkspace(searchParams.get("workspaceId"));
  if (error || !workspace) return NextResponse.json({ success: false, error }, { status });

  const id = searchParams.get("id");

  if (id) {
    const campaign = await db.campaign.findFirst({
      where: { id, workspaceId: workspace.id },
      include: { _count: { select: { series: true } } },
    });
    if (!campaign) return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 });
    return NextResponse.json({
      success: true,
      data: {
        id: campaign.id,
        templateId: campaign.templateId ?? null,
        name: campaign.name,
        description: campaign.description ?? "",
        campaignContext: campaign.campaignContext ?? "",
        keywordCluster: campaign.keywordCluster ?? "",
        seriesCount: campaign._count.series,
        createdAt: fmt(campaign.createdAt),
      },
    });
  }

  const campaigns = await db.campaign.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { series: true } } },
  });

  return NextResponse.json({
    success: true,
    data: campaigns.map((c) => ({
      id: c.id,
      templateId: c.templateId ?? null,
      name: c.name,
      description: c.description ?? "",
      campaignContext: c.campaignContext ?? "",
      keywordCluster: c.keywordCluster ?? "",
      seriesCount: c._count.series,
      createdAt: fmt(c.createdAt),
    })),
  });
}

// POST /api/campaigns?workspaceId=...
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { workspace, error, status } = await getAuthenticatedWorkspace(searchParams.get("workspaceId"));
  if (error || !workspace) return NextResponse.json({ success: false, error }, { status });

  let body: { name?: string; description?: string; campaignContext?: string; keywordCluster?: string; templateId?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name?.trim())
    return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });

  // Pre-fill from template if provided
  let contextDefault = body.campaignContext?.trim() ?? null;
  let keywordsDefault = body.keywordCluster?.trim() ?? null;
  if (body.templateId) {
    const tpl = await db.template.findFirst({
      where: { id: body.templateId, workspaceId: workspace.id, templateType: "CAMPAIGN" },
    });
    if (tpl) {
      if (!contextDefault && tpl.proseBrief) contextDefault = tpl.proseBrief;
      if (!keywordsDefault && tpl.keywordCluster) keywordsDefault = tpl.keywordCluster;
    }
  }

  const campaign = await db.campaign.create({
    data: {
      workspaceId: workspace.id,
      templateId: body.templateId ?? null,
      name: body.name.trim().slice(0, 200),
      description: body.description?.trim().slice(0, 500) ?? null,
      campaignContext: contextDefault?.slice(0, 2000) ?? null,
      keywordCluster: keywordsDefault?.slice(0, 1000) ?? null,
    },
    include: { _count: { select: { series: true } } },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: campaign.id,
      templateId: campaign.templateId ?? null,
      name: campaign.name,
      description: campaign.description ?? "",
      campaignContext: campaign.campaignContext ?? "",
      keywordCluster: campaign.keywordCluster ?? "",
      seriesCount: campaign._count.series,
      createdAt: fmt(campaign.createdAt),
    },
  }, { status: 201 });
}

// PATCH /api/campaigns?id=...
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });

  const { campaign, error, status } = await getAuthenticatedCampaign(id, userId);
  if (error || !campaign) return NextResponse.json({ success: false, error }, { status });

  let body: { name?: string; description?: string; campaignContext?: string; keywordCluster?: string; templateId?: string | null };
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const updated = await db.campaign.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name.trim().slice(0, 200) }),
      ...(body.description !== undefined && { description: body.description.trim().slice(0, 500) }),
      ...(body.campaignContext !== undefined && { campaignContext: body.campaignContext.trim().slice(0, 2000) }),
      ...(body.keywordCluster !== undefined && { keywordCluster: body.keywordCluster.trim().slice(0, 1000) }),
      ...(body.templateId !== undefined && { templateId: body.templateId }),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/campaigns?id=...
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });

  const { campaign, error, status } = await getAuthenticatedCampaign(id, userId);
  if (error || !campaign) return NextResponse.json({ success: false, error }, { status });

  await db.campaign.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
