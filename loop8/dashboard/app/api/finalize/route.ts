import { NextResponse } from "next/server";
import { finalizeDraft, isValidId } from "@/lib/drafts";

export async function POST(req: Request) {
  let body: { id?: string; profitPercent?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, profitPercent } = body;

  if (typeof id !== "string" || !isValidId(id)) {
    return NextResponse.json({ error: "Invalid or missing id" }, { status: 400 });
  }
  if (
    typeof profitPercent !== "number" ||
    !Number.isFinite(profitPercent) ||
    profitPercent < 0 ||
    profitPercent > 200
  ) {
    return NextResponse.json(
      { error: "profitPercent must be a number between 0 and 200" },
      { status: 400 }
    );
  }

  try {
    const result = finalizeDraft(id, profitPercent);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to finalize" },
      { status: 500 }
    );
  }
}
