import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  threadId: z.string().min(1),
  approved: z.boolean(),
});

/**
 * POST /api/agent/resume/mock
 * Mock endpoint for resuming a paused graph after human review.
 * Body: { threadId: string; approved: boolean }
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { threadId, approved } = parsed.data;

  // Mock response - in a real implementation this would interact with the agent graph
  return NextResponse.json({ 
    ok: true, 
    approved,
    threadId,
    timestamp: new Date().toISOString(),
    message: approved 
      ? "Production deployment approved and scheduled" 
      : "Changes rejected, returning to coding phase",
    nextPhase: approved ? "deploying_production" : "coding"
  });
}