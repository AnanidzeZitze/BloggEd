import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  const workspaces = await db.workspace.findMany({
    where: { clerkUserId: userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      googleRefreshToken: true,
      customGeminiKey: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      hasGoogleToken: !!w.googleRefreshToken,
      hasCustomGeminiKey: !!w.customGeminiKey,
    })),
  });
}
