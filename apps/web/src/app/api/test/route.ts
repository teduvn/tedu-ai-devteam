import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Test API endpoint working",
    timestamp: new Date().toISOString(),
    status: "ok"
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({
      received: body,
      message: "Data received successfully",
      status: "ok"
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
}