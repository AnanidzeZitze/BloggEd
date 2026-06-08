import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma, TemplateType } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthenticatedWorkspace } from "@/lib/workspace-guard";

async function getAuthenticatedTemplate(templateId: string, userId: string) {
  const template = await db.template.findUnique({
    where: { id: templateId },
    include: { workspace: { select: { clerkUserId: true } } },
  });
  if (!template) return { template: null, error: "Template not found", status: 404 as const };
  if (template.workspace.clerkUserId !== userId) return { template: null, error: "Forbidden", status: 403 as const };
  return { template, error: null, status: 200 as const };
}

function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toClient(t: {
  id: string; templateType: TemplateType; name: string; description: string | null;
  proseBrief: string | null; keywordCluster: string | null;
  postRecipe: Prisma.JsonValue; htmlStyleConfig: Prisma.JsonValue; createdAt: Date;
}) {
  return {
    id: t.id,
    templateType: t.templateType,
    name: t.name,
    description: t.description ?? "",
    proseBrief: t.proseBrief ?? "",
    keywordCluster: t.keywordCluster ?? "",
    postRecipe: t.postRecipe ?? null,
    htmlStyleConfig: t.htmlStyleConfig ?? null,
    createdAt: fmt(t.createdAt),
  };
}

// GET /api/templates?workspaceId=...  optional: &type=POST|CAMPAIGN|SERIES
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { workspace, error, status } = await getAuthenticatedWorkspace(searchParams.get("workspaceId"));
  if (error || !workspace) return NextResponse.json({ success: false, error }, { status });

  const typeParam = searchParams.get("type");
  const typeFilter = typeParam && Object.values(TemplateType).includes(typeParam as TemplateType)
    ? (typeParam as TemplateType)
    : undefined;

  const templates = await db.template.findMany({
    where: { workspaceId: workspace.id, ...(typeFilter ? { templateType: typeFilter } : {}) },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ success: true, data: templates.map(toClient) });
}

// POST /api/templates?workspaceId=...
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { workspace, error, status } = await getAuthenticatedWorkspace(searchParams.get("workspaceId"));
  if (error || !workspace) return NextResponse.json({ success: false, error }, { status });

  let body: {
    templateType?: string; name?: string; description?: string;
    proseBrief?: string; keywordCluster?: string; postRecipe?: unknown; htmlStyleConfig?: unknown;
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.name?.trim()) return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });

  const templateType =
    body.templateType && Object.values(TemplateType).includes(body.templateType as TemplateType)
      ? (body.templateType as TemplateType)
      : TemplateType.POST;

  const template = await db.template.create({
    data: {
      workspaceId: workspace.id,
      templateType,
      name: body.name.trim().slice(0, 100),
      description: body.description?.trim().slice(0, 300) ?? null,
      proseBrief: body.proseBrief?.trim() ?? null,
      keywordCluster: body.keywordCluster?.trim() ?? null,
      postRecipe: (body.postRecipe as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      htmlStyleConfig: (body.htmlStyleConfig as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });

  return NextResponse.json({ success: true, data: toClient(template) }, { status: 201 });
}

// PATCH /api/templates?id=...
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });

  const { template, error, status } = await getAuthenticatedTemplate(id, userId);
  if (error || !template) return NextResponse.json({ success: false, error }, { status });

  let body: {
    name?: string; description?: string; proseBrief?: string; keywordCluster?: string;
    postRecipe?: unknown; htmlStyleConfig?: unknown;
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const updated = await db.template.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim().slice(0, 100) }),
      ...(body.description !== undefined && { description: body.description.trim().slice(0, 300) }),
      ...(body.proseBrief !== undefined && { proseBrief: body.proseBrief.trim() }),
      ...(body.keywordCluster !== undefined && { keywordCluster: body.keywordCluster.trim() }),
      ...(body.postRecipe !== undefined && { postRecipe: body.postRecipe as Prisma.InputJsonValue }),
      ...(body.htmlStyleConfig !== undefined && { htmlStyleConfig: body.htmlStyleConfig as Prisma.InputJsonValue }),
    },
  });

  return NextResponse.json({ success: true, data: toClient(updated) });
}

// DELETE /api/templates?id=...
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });

  const { template, error, status } = await getAuthenticatedTemplate(id, userId);
  if (error || !template) return NextResponse.json({ success: false, error }, { status });

  await db.template.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
