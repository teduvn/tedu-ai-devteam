import { NextRequest, NextResponse } from "next/server";
import { graph } from "@tedu/agents";
import { Command } from "@langchain/langgraph";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  threadId: z.string().min(1),
  approved: z.boolean(),
});

/**
 * POST /api/agent/resume
 * Resume a paused graph after human review.
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

  try {
    const config = { configurable: { thread_id: threadId } };
    await graph.invoke(new Command({ resume: approved }), config);
    return NextResponse.json({ ok: true, approved });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
