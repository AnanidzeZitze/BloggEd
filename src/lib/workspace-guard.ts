import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { Workspace } from "@prisma/client";

type GuardResult =
  | { workspace: Workspace; error: null; status: 200 }
  | { workspace: null; error: string; status: 400 | 401 | 403 | 404 };

export async function getAuthenticatedWorkspace(workspaceId: string | null): Promise<GuardResult> {
  const { userId } = await auth();

  if (!userId) {
    return { workspace: null, error: "Unauthenticated", status: 401 };
  }

  if (!workspaceId) {
    return { workspace: null, error: "workspaceId is required", status: 400 };
  }

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });

  if (!workspace) {
    return { workspace: null, error: "Workspace not found", status: 404 };
  }

  if (workspace.clerkUserId !== userId) {
    return { workspace: null, error: "Forbidden", status: 403 };
  }

  return { workspace, error: null, status: 200 };
}
