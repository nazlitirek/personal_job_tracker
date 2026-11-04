import { NextResponse } from "next/server";
import { syncCv } from "@/lib/cv";
import { classifyLevel, classifyRole } from "@/lib/score";
import { addManualJob, listJobs } from "@/lib/store";

export async function GET() {
  const cv = await syncCv();
  const { jobs, lastFetch } = await listJobs();
  return NextResponse.json({ jobs, lastFetch, cvReady: Boolean(cv && !cv.error) });
}

function safeLink(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export async function POST(request: Request) {
  const body = await request.json();
  const title = text(body.title);
  const description = text(body.description);
  if (!title || !description) {
    return NextResponse.json({ error: "A job title and job text are needed." }, { status: 400 });
  }
  await addManualJob({
    title,
    description,
    company: text(body.company) || "Not stated",
    location: text(body.location) || "Not stated",
    link: safeLink(body.link),
    roleType: classifyRole(title) ?? "Other",
    level: classifyLevel(title),
    workplace: /remote/i.test(text(body.location)) ? "Remote" : "Not stated",
  });
  return NextResponse.json({ ok: true });
}
