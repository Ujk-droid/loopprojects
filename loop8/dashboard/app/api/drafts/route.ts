import { NextResponse } from "next/server";
import { listDrafts } from "@/lib/drafts";

export async function GET() {
  try {
    const estimates = listDrafts();
    return NextResponse.json({ estimates });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list drafts" },
      { status: 500 }
    );
  }
}
