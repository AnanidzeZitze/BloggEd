import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getAuthenticatedWorkspace } from "@/lib/workspace-guard";

// Verify a campaign belongs to the authenticated user
async function getAuthenticatedCampaign(campaignId: string, userId: string) {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: { workspace: { select: { clerkUserId: true } } },
  });
  if (!campaign) return { campaign: null, error: "Campaign not found", status: 404 as const };
  if (campaign.workspace.clerkUserId !== userId) return { campaign: null, error: "Forbidden", status: 403 as const };
  return { campaign, error: null, status: 200 as const };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// GET /api/campaigns?workspaceId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { workspace, error, status } = await getAuthenticatedWorkspace(searchParams.get("workspaceId"));
  if (error || !workspace) return NextResponse.json({ success: false, error }, { status });

  const campaigns = await db.campaign.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { posts: true } } },
  });

  return NextResponse.json({
    success: true,
    data: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? "",
      campaignContext: c.campaignContext ?? "",
      postsCount: c._count.posts,
      createdAt: formatDate(c.createdAt),
    })),
  });
}

// POST /api/campaigns?workspaceId=...
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { workspace, error, status } = await getAuthenticatedWorkspace(searchParams.get("workspaceId"));
  if (error || !workspace) return NextResponse.json({ success: false, error }, { status });

  let body: { name?: string; description?: string; campaignContext?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
  }

  const campaign = await db.campaign.create({
    data: {
      workspaceId: workspace.id,
      name: body.name.trim().slice(0, 200),
      description: body.description?.trim().slice(0, 500) ?? null,
      campaignContext: body.campaignContext?.trim().slice(0, 2000) ?? null,
    },
    include: { _count: { select: { posts: true } } },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description ?? "",
      campaignContext: campaign.campaignContext ?? "",
      postsCount: campaign._count.posts,
      createdAt: formatDate(campaign.createdAt),
    },
  }, { status: 201 });
}

// PATCH /api/campaigns?id=...
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });

  const { campaign, error, status } = await getAuthenticatedCampaign(id, userId);
  if (error || !campaign) return NextResponse.json({ success: false, error }, { status });

  let body: { name?: string; description?: string; campaignContext?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const updated = await db.campaign.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name.trim().slice(0, 200) }),
      ...(body.description !== undefined && { description: body.description.trim().slice(0, 500) }),
      ...(body.campaignContext !== undefined && { campaignContext: body.campaignContext.trim().slice(0, 2000) }),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/campaigns?id=...
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });

  const { campaign, error, status } = await getAuthenticatedCampaign(id, userId);
  if (error || !campaign) return NextResponse.json({ success: false, error }, { status });

  await db.campaign.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
