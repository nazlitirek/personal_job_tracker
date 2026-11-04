// Reads the CV (a PDF or Word file in the project folder). The file is never uploaded anywhere.
import fs from "node:fs";
import path from "node:path";
import mammoth from "mammoth";
// The package's main file runs a debug check on import, so load this one directly.
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { findSkills, readCvSections } from "./score";
import { getCv, setCv, type CvState } from "./store";

function findCvFile(): { name: string; full: string; key: string } | null {
  const folder = process.env.CV_DIR || process.cwd();
  const files = fs
    .readdirSync(folder, { withFileTypes: true })
    // Word keeps a hidden "~$" file beside any document that is open.
    .filter((entry) => entry.isFile() && /\.(pdf|docx)$/i.test(entry.name) && !entry.name.startsWith("~$"))
    .map((entry) => {
      const full = path.join(folder, entry.name);
      const info = fs.statSync(full);
      return { name: entry.name, full, time: info.mtimeMs, key: `${entry.name}:${info.size}:${info.mtimeMs}` };
    })
    .sort((a, b) => b.time - a.time);
  return files[0] ?? null;
}

async function readText(file: string): Promise<string> {
  if (file.toLowerCase().endsWith(".docx")) {
    return (await mammoth.extractRawText({ path: file })).value;
  }
  return (await pdfParse(fs.readFileSync(file))).text;
}

// Next.js can load this file more than once, so this lives on globalThis.
const shared = globalThis as unknown as { cvChecked?: boolean };

let running: Promise<CvState | null> | null = null;

/** Reads the CV again only if the file changed, then scores all jobs again. */
export function syncCv(): Promise<CvState | null> {
  running ??= doSync().finally(() => {
    running = null;
  });
  return running;
}

async function doSync(): Promise<CvState | null> {
  const current = await getCv();
  const file = findCvFile();

  if (!file) {
    if (current) await setCv(null);
    return null;
  }
  // Read once after each start too, so changes to the skills list reach the scores.
  const firstCheck = !shared.cvChecked;
  shared.cvChecked = true;
  if (current?.fileKey === file.key && !firstCheck) return current;

  // Skills you added or removed by hand carry over to a new CV file.
  const next: CvState = {
    fileKey: file.key,
    fileName: file.name,
    text: "",
    foundSkills: [],
    addedSkills: current?.addedSkills ?? [],
    removedSkills: current?.removedSkills ?? [],
    education: [],
    experience: [],
    error: null,
  };

  try {
    const text = await readText(file.full);
    next.text = text;
    if (text.trim().length < 50) {
      next.error = "This file has almost no readable text. It may be a scanned image.";
    } else {
      next.foundSkills = findSkills(text);
      Object.assign(next, readCvSections(text));
    }
  } catch {
    next.error = "Could not read this file. Try saving it again as a new PDF.";
  }

  await setCv(next);
  return next;
}
