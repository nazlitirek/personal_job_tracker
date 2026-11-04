// Fetches jobs from free job feeds and company job boards.
import { classifyLevel, classifyRole, isInTurkiye, type Level, type RoleType } from "./score";

export type FetchedJob = {
  key: string;
  source: string;
  title: string;
  company: string;
  location: string;
  workplace: string;
  roleType: RoleType;
  level: Level;
  link: string;
  description: string;
  postedAt: string | null;
};

type BoardKind = "lever" | "greenhouse" | "ashby";

const BOARDS: [string, BoardKind, string][] = [
  ["Good Job Games", "greenhouse", "goodjobgames"],
  ["Trendyol", "lever", "trendyol"],
  ["Dream Games", "lever", "dreamgames"],
  ["BiggerGames", "ashby", "biggergames"],
  ["Codeway", "ashby", "codeway"],
  ["Spyke Games", "lever", "spyke-games"],
  ["Commencis", "lever", "commencis"],
  ["iyzico", "lever", "iyzico"],
];

const HIMALAYAS_SEARCHES = [
  "product manager",
  "full stack",
  "computer vision",
  "software engineer",
  "ai engineer",
  "machine learning engineer",
];
const HIMALAYAS_PAGES = 2;
const MAX_DESCRIPTION = 20000;

async function getJson(url: string): Promise<any> {
  const response = await fetch(url, {
    headers: { "User-Agent": "personal-job-tracker" },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function decode(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

/** Turns HTML into plain text. Job text is only ever shown as plain text. */
export function toText(html: string | null | undefined): string {
  const source = html ?? "";
  const unescaped = source.includes("&lt;") ? decode(source) : source;
  const text = unescaped
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/?(p|div|li|ul|ol|br|h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decode(text)
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim()
    .slice(0, MAX_DESCRIPTION);
}

function workplaceName(value: string | null | undefined): string {
  const name = (value ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (name === "remote") return "Remote";
  if (name === "hybrid") return "Hybrid";
  if (name === "onsite") return "On-site";
  return "Not stated";
}

function toDate(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

type RawBoardJob = Pick<
  FetchedJob,
  "title" | "location" | "workplace" | "link" | "description" | "postedAt"
>;

async function readBoard(kind: BoardKind, board: string): Promise<RawBoardJob[]> {
  if (kind === "lever") {
    const data = await getJson(`https://api.lever.co/v0/postings/${board}?mode=json`);
    return data.map((job: any) => ({
      title: job.text,
      location: job.categories?.location ?? "",
      workplace: workplaceName(job.workplaceType),
      link: job.hostedUrl,
      description: [
        job.descriptionPlain,
        ...(job.lists ?? []).flatMap((list: any) => [list.text, toText(list.content)]),
        job.additionalPlain,
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, MAX_DESCRIPTION),
      postedAt: toDate(job.createdAt),
    }));
  }
  if (kind === "greenhouse") {
    const data = await getJson(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`);
    return data.jobs.map((job: any) => ({
      title: job.title,
      location: job.location?.name ?? "",
      workplace: "Not stated",
      link: job.absolute_url,
      description: toText(job.content),
      postedAt: toDate(job.first_published ?? job.updated_at),
    }));
  }
  const data = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${board}`);
  return data.jobs
    .filter((job: any) => job.isListed !== false)
    .map((job: any) => ({
      title: job.title,
      location: job.location ?? "",
      workplace: job.isRemote ? "Remote" : workplaceName(job.workplaceType),
      link: job.jobUrl,
      description: job.descriptionPlain ?? toText(job.descriptionHtml),
      postedAt: toDate(job.publishedAt),
    }));
}

async function fetchBoard(company: string, kind: BoardKind, board: string): Promise<FetchedJob[]> {
  const jobs: FetchedJob[] = [];
  for (const job of await readBoard(kind, board)) {
    const roleType = classifyRole(job.title);
    if (!roleType || !isInTurkiye(job.location)) continue;
    jobs.push({
      ...job,
      title: job.title.trim(),
      key: job.link,
      source: company,
      company,
      roleType,
      level: classifyLevel(job.title),
    });
  }
  return jobs;
}

/** Remote jobs open to people in Turkiye. Himalayas asks us to credit it and use its apply links. */
async function fetchHimalayas(): Promise<FetchedJob[]> {
  const jobs = new Map<string, FetchedJob>();
  for (const search of HIMALAYAS_SEARCHES) {
    for (let page = 1; page <= HIMALAYAS_PAGES; page++) {
      const query = new URLSearchParams({ q: search, country: "Turkey", page: String(page) });
      const data = await getJson(`https://himalayas.app/jobs/api/search?${query}`);
      for (const job of data.jobs ?? []) {
        const roleType = classifyRole(job.title);
        if (!roleType || !job.applicationLink) continue;
        const key = job.guid ?? job.applicationLink;
        jobs.set(key, {
          key,
          source: "Himalayas",
          title: job.title.trim(),
          company: job.companyName ?? "",
          location: "Remote, open to Türkiye",
          workplace: "Remote",
          roleType,
          level: classifyLevel(job.title, job.seniority ?? []),
          link: job.applicationLink,
          description: toText(job.description),
          postedAt: job.pubDate ? toDate(job.pubDate * 1000) : null,
        });
      }
    }
  }
  return [...jobs.values()];
}

export type SourceResult = { source: string; jobs: FetchedJob[]; error?: string };

/** One broken source never stops the others. */
export async function fetchAllSources(): Promise<SourceResult[]> {
  const run = async (source: string, read: () => Promise<FetchedJob[]>): Promise<SourceResult> => {
    try {
      return { source, jobs: await read() };
    } catch (error) {
      return { source, jobs: [], error: error instanceof Error ? error.message : String(error) };
    }
  };
  return Promise.all([
    ...BOARDS.map(([company, kind, board]) => run(company, () => fetchBoard(company, kind, board))),
    run("Himalayas", fetchHimalayas),
  ]);
}
