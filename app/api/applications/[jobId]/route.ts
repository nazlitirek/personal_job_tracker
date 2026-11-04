import { NextResponse } from "next/server";
import { removeApplication, STAGES, updateApplication, type Stage } from "@/lib/store";

type Context = { params: Promise<{ jobId: string }> };

const date = (value: unknown) => (typeof value === "string" && value ? value : null);

export async function PATCH(request: Request, context: Context) {
  const { jobId } = await context.params;
  const body = await request.json();
  if (body.stage !== undefined && !STAGES.includes(body.stage as Stage)) {
    return NextResponse.json({ error: "Unknown stage." }, { status: 400 });
  }
  await updateApplication(Number(jobId), {
    stage: body.stage,
    appliedDate: "appliedDate" in body ? date(body.appliedDate) : undefined,
    nextDate: "nextDate" in body ? date(body.nextDate) : undefined,
    notes: typeof body.notes === "string" ? body.notes : undefined,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: Context) {
  const { jobId } = await context.params;
  await removeApplication(Number(jobId));
  return NextResponse.json({ ok: true });
}
