// The local database: one file at data/jobs.db, on this computer only.
import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database } from "sql.js";
import { scoreJob, type Level, type RoleType, type ScoreDetails } from "./score";
import type { FetchedJob, SourceResult } from "./sources";

export const STAGES = ["Saved", "Applied", "Interview", "Offer", "Rejected"] as const;
export type Stage = (typeof STAGES)[number];

export type Job = {
  id: number;
  source: string;
  title: string;
  company: string;
  location: string;
  workplace: string;
  roleType: RoleType;
  level: Level;
  link: string | null;
  postedAt: string | null;
  score: number | null;
  details: ScoreDetails | null;
  stage: Stage | null;
};

export type Application = Job & {
  stage: Stage;
  appliedDate: string | null;
  nextDate: string | null;
  notes: string;
  active: boolean;
};

export type CvState = {
  fileKey: string;
  fileName: string;
  text: string;
  foundSkills: string[];
  addedSkills: string[];
  removedSkills: string[];
  education: string[];
  experience: string[];
  error: string | null;
};

export const MANUAL_SOURCE = "Added by me";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "jobs.db");

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    workplace TEXT NOT NULL,
    role_type TEXT NOT NULL,
    level TEXT NOT NULL,
    link TEXT,
    description TEXT NOT NULL,
    posted_at TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    hidden INTEGER NOT NULL DEFAULT 0,
    score INTEGER,
    details TEXT
  );
  CREATE TABLE IF NOT EXISTS applications (
    job_id INTEGER PRIMARY KEY REFERENCES jobs(id),
    stage TEXT NOT NULL,
    applied_date TEXT,
    next_date TEXT,
    notes TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

// Next.js can load this file more than once, so the database lives on globalThis.
const shared = globalThis as unknown as { jobDb?: Promise<Database> };

function getDb(): Promise<Database> {
  shared.jobDb ??= (async () => {
    const SQL = await initSqlJs({
      locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
    });
    const db = fs.existsSync(DB_FILE) ? new SQL.Database(fs.readFileSync(DB_FILE)) : new SQL.Database();
    db.run(SCHEMA);
    return db;
  })();
  return shared.jobDb;
}

function save(db: Database): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const bytes = Buffer.from(db.export());
  const temp = `${DB_FILE}.tmp`;
  fs.writeFileSync(temp, bytes);
  try {
    fs.renameSync(temp, DB_FILE);
  } catch {
    // OneDrive can lock the file for a moment.
    fs.writeFileSync(DB_FILE, bytes);
    fs.rmSync(temp, { force: true });
  }
}

type Row = Record<string, any>;

function rows(db: Database, sql: string, params: any[] = []): Row[] {
  const statement = db.prepare(sql);
  try {
    statement.bind(params);
    const result: Row[] = [];
    while (statement.step()) result.push(statement.getAsObject());
    return result;
  } finally {
    statement.free();
  }
}

function getMeta(db: Database, key: string): string | null {
  return (rows(db, "SELECT value FROM meta WHERE key = ?", [key])[0]?.value as string) ?? null;
}

function setMeta(db: Database, key: string, value: string): void {
  db.run("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [
    key,
    value,
  ]);
}

function toJob(row: Row): Job {
  return {
    id: row.id,
    source: row.source,
    title: row.title,
    company: row.company,
    location: row.location,
    workplace: row.workplace,
    roleType: row.role_type,
    level: row.level,
    link: row.link,
    postedAt: row.posted_at,
    score: row.score,
    details: row.details ? JSON.parse(row.details) : null,
    stage: row.stage ?? null,
  };
}

export function cvSkills(cv: CvState): string[] {
  const removed = new Set(cv.removedSkills.map((skill) => skill.toLowerCase()));
  const skills = [...cv.foundSkills, ...cv.addedSkills].filter((skill) => !removed.has(skill.toLowerCase()));
  return [...new Set(skills)];
}

function readCv(db: Database): CvState | null {
  const value = getMeta(db, "cv");
  return value ? (JSON.parse(value) as CvState) : null;
}

function scoreFor(cv: CvState | null, job: { title: string; description: string; roleType: RoleType; level: Level }) {
  if (!cv || cv.error) return { score: null, details: null };
  const { score, details } = scoreJob(job, {
    skills: cvSkills(cv),
    text: cv.text,
    addedSkills: cv.addedSkills,
  });
  return { score, details: JSON.stringify(details) };
}

function rescoreAll(db: Database, cv: CvState | null): void {
  for (const row of rows(db, "SELECT id, title, description, role_type, level FROM jobs")) {
    const { score, details } = scoreFor(cv, {
      title: row.title,
      description: row.description,
      roleType: row.role_type,
      level: row.level,
    });
    db.run("UPDATE jobs SET score = ?, details = ? WHERE id = ?", [score, details, row.id]);
  }
}

function upsertJob(db: Database, job: FetchedJob, cv: CvState | null): void {
  const { score, details } = scoreFor(cv, job);
  db.run(
    `INSERT INTO jobs (key, source, title, company, location, workplace, role_type, level, link,
                       description, posted_at, active, score, details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       title = excluded.title, company = excluded.company, location = excluded.location,
       workplace = excluded.workplace, role_type = excluded.role_type, level = excluded.level,
       link = excluded.link, description = excluded.description, posted_at = excluded.posted_at,
       active = 1, score = excluded.score, details = excluded.details`,
    [
      job.key, job.source, job.title, job.company, job.location, job.workplace, job.roleType,
      job.level, job.link, job.description, job.postedAt, score, details,
    ],
  );
}

/** Saves fetched jobs. A source that failed keeps the jobs it already had. */
export async function saveFetchResults(results: SourceResult[]): Promise<void> {
  const db = await getDb();
  const cv = readCv(db);
  db.run("BEGIN");
  try {
    for (const result of results) {
      if (result.error) continue;
      db.run("UPDATE jobs SET active = 0 WHERE source = ?", [result.source]);
      for (const job of result.jobs) upsertJob(db, job, cv);
    }
    setMeta(db, "lastFetch", new Date().toISOString());
    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }
  save(db);
}

export async function listJobs(): Promise<{ jobs: Job[]; lastFetch: string | null }> {
  const db = await getDb();
  const found = rows(
    db,
    `SELECT j.*, a.stage FROM jobs j LEFT JOIN applications a ON a.job_id = j.id
     WHERE j.active = 1 AND j.hidden = 0
     ORDER BY j.score IS NULL, j.score DESC, j.posted_at DESC`,
  );
  return { jobs: found.map(toJob), lastFetch: getMeta(db, "lastFetch") };
}

export async function addManualJob(input: {
  title: string;
  company: string;
  location: string;
  link: string | null;
  description: string;
  roleType: RoleType;
  level: Level;
  workplace: string;
}): Promise<void> {
  const db = await getDb();
  upsertJob(
    db,
    {
      ...input,
      key: `manual-${crypto.randomUUID()}`,
      source: MANUAL_SOURCE,
      link: input.link ?? "",
      postedAt: new Date().toISOString(),
    },
    readCv(db),
  );
  save(db);
}

export async function hideJob(id: number): Promise<void> {
  const db = await getDb();
  db.run("UPDATE jobs SET hidden = 1 WHERE id = ?", [id]);
  save(db);
}

export async function listApplications(): Promise<Application[]> {
  const db = await getDb();
  const found = rows(
    db,
    `SELECT j.*, a.stage, a.applied_date, a.next_date, a.notes
     FROM applications a JOIN jobs j ON j.id = a.job_id
     ORDER BY a.next_date IS NULL, a.next_date, j.score DESC`,
  );
  return found.map((row) => ({
    ...toJob(row),
    stage: row.stage,
    appliedDate: row.applied_date,
    nextDate: row.next_date,
    notes: row.notes,
    active: row.active === 1 || row.source === MANUAL_SOURCE,
  }));
}

export async function saveApplication(jobId: number): Promise<void> {
  const db = await getDb();
  db.run("INSERT INTO applications (job_id, stage) VALUES (?, 'Saved') ON CONFLICT(job_id) DO NOTHING", [jobId]);
  save(db);
}

export async function updateApplication(
  jobId: number,
  change: { stage?: Stage; appliedDate?: string | null; nextDate?: string | null; notes?: string },
): Promise<void> {
  const db = await getDb();
  const current = rows(db, "SELECT * FROM applications WHERE job_id = ?", [jobId])[0];
  if (!current) return;
  const stage = change.stage ?? current.stage;
  let appliedDate = change.appliedDate !== undefined ? change.appliedDate : current.applied_date;
  // Moving a job to Applied fills in today's date if none is set.
  if (change.stage === "Applied" && !appliedDate) appliedDate = new Date().toISOString().slice(0, 10);
  const nextDate = change.nextDate !== undefined ? change.nextDate : current.next_date;
  const notes = change.notes ?? current.notes;
  db.run("UPDATE applications SET stage = ?, applied_date = ?, next_date = ?, notes = ? WHERE job_id = ?", [
    stage,
    appliedDate,
    nextDate,
    notes,
    jobId,
  ]);
  save(db);
}

export async function removeApplication(jobId: number): Promise<void> {
  const db = await getDb();
  db.run("DELETE FROM applications WHERE job_id = ?", [jobId]);
  save(db);
}

export async function getCv(): Promise<CvState | null> {
  return readCv(await getDb());
}

/** Stores the CV and scores every job again. */
export async function setCv(cv: CvState | null): Promise<void> {
  const db = await getDb();
  if (cv) setMeta(db, "cv", JSON.stringify(cv));
  else db.run("DELETE FROM meta WHERE key = 'cv'");
  rescoreAll(db, cv);
  save(db);
}
