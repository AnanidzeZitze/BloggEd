import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { encrypt, safeDecrypt } from "@/lib/encrypt";
import { getAuthenticatedWorkspace } from "@/lib/workspace-guard";

// GET /api/workspace?workspaceId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  const { workspace, error, status } = await getAuthenticatedWorkspace(workspaceId);
  if (error || !workspace) {
    return NextResponse.json({ success: false, error }, { status });
  }

  return NextResponse.json({
    success: true,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      brandContext: workspace.brandContext,
      blogTemplate: workspace.blogTemplate,
      bloggerBlogId: workspace.bloggerBlogId,
      hasCustomGeminiKey: !!workspace.customGeminiKey,
      hasGoogleToken: !!workspace.googleRefreshToken,
    },
  });
}

// PATCH /api/workspace?workspaceId=...
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  const { workspace, error, status } = await getAuthenticatedWorkspace(workspaceId);
  if (error || !workspace) {
    return NextResponse.json({ success: false, error }, { status });
  }

  let body: {
    name?: string;
    brandContext?: string;
    blogTemplate?: string;
    bloggerBlogId?: string;
    customGeminiKey?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const updateData: Record<string, string | null> = {};
  if (typeof body.name === "string") updateData.name = body.name.trim().slice(0, 100);
  if (typeof body.brandContext === "string") updateData.brandContext = body.brandContext.slice(0, 5000);
  if (typeof body.blogTemplate === "string") updateData.blogTemplate = body.blogTemplate.slice(0, 10000);
  if (typeof body.bloggerBlogId === "string") updateData.bloggerBlogId = body.bloggerBlogId.trim().slice(0, 100);

  // Encrypt the Gemini key before storing; empty string clears it
  if (typeof body.customGeminiKey === "string") {
    updateData.customGeminiKey = body.customGeminiKey.trim()
      ? encrypt(body.customGeminiKey.trim())
      : null;
  }

  try {
    await db.workspace.update({ where: { id: workspace.id }, data: updateData });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[Workspace PATCH] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === "production"
          ? "Failed to save settings."
          : (err instanceof Error ? err.message : String(err)),
      },
      { status: 500 }
    );
  }
}

// POST /api/workspace — create a new workspace for the logged-in user
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  let body: { name: string; industry?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
  }

  const name = body.name.trim().slice(0, 100);
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

  try {
    const workspace = await db.workspace.create({
      data: { clerkUserId: userId, name, slug },
    });
    return NextResponse.json({ success: true, data: { id: workspace.id, name: workspace.name } }, { status: 201 });
  } catch (err: unknown) {
    console.error("[Workspace POST] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === "production"
          ? "Failed to create workspace."
          : (err instanceof Error ? err.message : String(err)),
      },
      { status: 500 }
    );
  }
}
