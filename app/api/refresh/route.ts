import { NextResponse } from "next/server";
import { syncCv } from "@/lib/cv";
import { fetchAllSources } from "@/lib/sources";
import { saveFetchResults } from "@/lib/store";

export async function POST() {
  await syncCv();
  const results = await fetchAllSources();
  await saveFetchResults(results);
  return NextResponse.json({
    sources: results.map(({ source, jobs, error }) => ({ source, count: jobs.length, error })),
  });
}
