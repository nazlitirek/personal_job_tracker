import { NextResponse } from "next/server";
import { hideJob } from "@/lib/store";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await hideJob(Number(id));
  return NextResponse.json({ ok: true });
}
