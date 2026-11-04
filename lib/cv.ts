// Reads the CV (a PDF in the project folder). The file is never uploaded anywhere.
import fs from "node:fs";
import path from "node:path";
// The package's main file runs a debug check on import, so load this one directly.
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { findSkills } from "./score";
import { getCv, setCv, type CvState } from "./store";

function findCvFile(): { name: string; full: string; key: string } | null {
  const folder = process.env.CV_DIR || process.cwd();
  const files = fs
    .readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
    .map((entry) => {
      const full = path.join(folder, entry.name);
      const info = fs.statSync(full);
      return { name: entry.name, full, time: info.mtimeMs, key: `${entry.name}:${info.size}:${info.mtimeMs}` };
    })
    .sort((a, b) => b.time - a.time);
  return files[0] ?? null;
}

function matchingLines(text: string, pattern: RegExp, limit: number): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 3 && line.length < 160 && pattern.test(line));
  return [...new Set(lines)].slice(0, limit);
}

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
  if (current?.fileKey === file.key) return current;

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
    const { text } = await pdfParse(fs.readFileSync(file.full));
    next.text = text;
    if (text.trim().length < 50) {
      next.error = "This PDF has almost no readable text. It may be a scanned image.";
    } else {
      next.foundSkills = findSkills(text);
      next.education = matchingLines(
        text,
        /universit|üniversite|bachelor|b\.?sc\b|m\.?sc\b|degree|gpa|lisans|engineering student/i,
        4,
      );
      next.experience = matchingLines(text, /\b(19|20)\d{2}\b.*(-|–|—|present|now|current|günümüz|devam)/i, 8);
    }
  } catch {
    next.error = "Could not read this PDF. Try saving it again as a new PDF.";
  }

  await setCv(next);
  return next;
}
