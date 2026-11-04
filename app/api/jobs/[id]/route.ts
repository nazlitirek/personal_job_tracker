import { NextResponse } from "next/server";
import { setJobHidden } from "@/lib/store";

type Context = { params: Promise<{ id: string }> };

/** Hides a job. */
export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  await setJobHidden(Number(id), true);
  return NextResponse.json({ ok: true });
}

/** Brings a hidden job back. */
export async function PATCH(_request: Request, context: Context) {
  const { id } = await context.params;
  await setJobHidden(Number(id), false);
  return NextResponse.json({ ok: true });
}
