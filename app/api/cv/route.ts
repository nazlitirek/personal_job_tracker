import { NextResponse } from "next/server";
import { syncCv } from "@/lib/cv";
import { cvSkills, setCv } from "@/lib/store";

function view(cv: NonNullable<Awaited<ReturnType<typeof syncCv>>>) {
  return {
    fileName: cv.fileName,
    error: cv.error,
    skills: cvSkills(cv),
    education: cv.education,
    experience: cv.experience,
  };
}

export async function GET() {
  const cv = await syncCv();
  return NextResponse.json({ cv: cv ? view(cv) : null });
}

/** Adds or removes one skill by hand. */
export async function PATCH(request: Request) {
  const { add, remove } = await request.json();
  const cv = await syncCv();
  if (!cv) return NextResponse.json({ error: "No CV found." }, { status: 400 });

  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  if (typeof add === "string" && add.trim()) {
    const skill = add.trim();
    cv.removedSkills = cv.removedSkills.filter((item) => !same(item, skill));
    if (!cvSkills(cv).some((item) => same(item, skill))) cv.addedSkills.push(skill);
  }
  if (typeof remove === "string" && remove) {
    cv.addedSkills = cv.addedSkills.filter((item) => !same(item, remove));
    if (cv.foundSkills.some((item) => same(item, remove))) cv.removedSkills.push(remove);
  }
  await setCv(cv);
  return NextResponse.json({ cv: view(cv) });
}
