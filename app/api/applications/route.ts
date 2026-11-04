import { NextResponse } from "next/server";
import { listApplications, saveApplication } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ applications: await listApplications() });
}

export async function POST(request: Request) {
  const { jobId } = await request.json();
  await saveApplication(Number(jobId));
  return NextResponse.json({ ok: true });
}
