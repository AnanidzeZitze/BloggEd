import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedWorkspace } from "@/lib/workspace-guard";

export async function POST(req: NextRequest) {
  let workspaceId: string | undefined;
  try {
    const body = await req.json();
    workspaceId = body.workspaceId;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { workspace, error, status } = await getAuthenticatedWorkspace(workspaceId ?? null);
  if (error || !workspace) {
    return NextResponse.json({ success: false, error }, { status });
  }

  try {
    const { db } = await import("@/lib/db");
    await db.workspace.update({
      where: { id: workspace.id },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
      },
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[Google Disconnect] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to disconnect." }, { status: 500 });
  }
}
