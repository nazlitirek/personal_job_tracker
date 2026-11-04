// Sorts jobs into groups and scores them against the CV. No outside imports,
// so this file can be tested on its own.

export type RoleType =
  | "Computer vision"
  | "Product"
  | "Full stack"
  | "AI and data"
  | "Software"
  | "Other";

export type Level = "Intern" | "Junior" | "Not stated" | "Senior";

export type ScorePart = { name: string; weight: number; points: number; note: string };

export type ScoreDetails = { parts: ScorePart[]; have: string[]; missing: string[] };

/** Lowercases and removes Turkish letters so matching stays simple. */
export function plain(text: string | null | undefined): string {
  const table: Record<string, string> = {
    İ: "i", I: "i", ı: "i", Ş: "s", ş: "s", Ğ: "g", ğ: "g",
    Ü: "u", ü: "u", Ö: "o", ö: "o", Ç: "c", ç: "c",
  };
  return (text ?? "")
    .replace(/[İIıŞşĞğÜüÖöÇç]/g, (letter) => table[letter])
    .toLowerCase()
    .replace(/̇/g, "");
}

const ROLE_GROUPS: [Exclude<RoleType, "Other">, RegExp][] = [
  ["Computer vision", /computer vision|image processing|goruntu isleme/],
  ["Product", /product (manager|owner|specialist|analyst|lead)|urun (yonetici|sorumlu|uzman)/],
  ["Full stack", /full.?stack/],
  ["AI and data", /machine learning|\bml\b|\bai\b|data scien|data analy|veri (bilim|analist)|yapay zeka/],
  ["Software", /software|developer|back.?end|front.?end|\bengineer\b|yazilim|gelistirici/],
];

const NOT_WANTED =
  /sales|marketing artist|recruit|legal|content producer|business develop|developer relations|account/;

/** Returns the job's group, or null when it is outside the target jobs. */
export function classifyRole(title: string): Exclude<RoleType, "Other"> | null {
  const name = plain(title);
  if (NOT_WANTED.test(name)) return null;
  for (const [group, pattern] of ROLE_GROUPS) {
    if (pattern.test(name)) return group;
  }
  return null;
}

export function classifyLevel(title: string, seniority: string[] = []): Level {
  const name = plain(title);
  if (/\bintern\b|\binternship\b|\bcamp\b|\bstajyer\b/.test(name)) return "Intern";
  if (/junior|associate|\bjr\b|new grad|entry.level/.test(name)) return "Junior";
  if (/senior|\bsr\b|\blead\b|principal|\bstaff\b|head of|director/.test(name)) return "Senior";

  const listed = plain(seniority.join(" "));
  if (/entry/.test(listed)) return "Junior";
  if (/senior|lead|director|manager|executive/.test(listed)) return "Senior";
  return "Not stated";
}

export function isInTurkiye(location: string): boolean {
  return /turkey|turkiye|istanbul|ankara|izmir|maslak/.test(plain(location));
}

// Each skill and the words that mean it, written in plain() form.
const SKILLS: [string, string[]][] = [
  ["Python", ["python"]],
  ["Java", ["java"]],
  ["JavaScript", ["javascript", "js"]],
  ["TypeScript", ["typescript"]],
  ["C++", ["c++", "cpp"]],
  ["C#", ["c#", "csharp"]],
  [".NET", [".net", "asp.net"]],
  ["Go", ["golang"]],
  ["Kotlin", ["kotlin"]],
  ["Rust", ["rustlang"]],
  ["PHP", ["php"]],
  ["SQL", ["sql", "mysql", "postgresql", "postgres", "t-sql"]],
  ["NoSQL", ["nosql", "mongodb", "redis", "cassandra"]],
  ["HTML/CSS", ["html", "css"]],
  ["React", ["reactjs", "react.js", "react native"]],
  ["Next.js", ["next.js", "nextjs"]],
  ["Vue", ["vue", "vuejs", "vue.js"]],
  ["Angular", ["angular"]],
  ["Node.js", ["node.js", "nodejs", "node"]],
  ["Spring", ["spring boot"]],
  ["Django", ["django"]],
  ["FastAPI", ["fastapi"]],
  ["Firebase", ["firebase"]],
  ["Vite", ["vite"]],
  ["Postman", ["postman"]],
  ["REST APIs", ["rest api", "rest apis", "restful"]],
  ["GraphQL", ["graphql"]],
  ["Git", ["git", "github", "gitlab"]],
  ["Docker", ["docker"]],
  ["Kubernetes", ["kubernetes", "k8s"]],
  ["AWS", ["aws", "amazon web services"]],
  ["Azure", ["azure"]],
  ["Google Cloud", ["gcp", "google cloud"]],
  ["Linux", ["linux"]],
  ["CI/CD", ["ci/cd", "continuous integration"]],
  ["MLOps", ["mlops", "ml ops"]],
  ["Machine learning", ["machine learning", "ml", "makine ogrenmesi"]],
  ["Deep learning", ["deep learning", "derin ogrenme", "neural network", "neural networks"]],
  ["Computer vision", ["computer vision", "image processing", "goruntu isleme"]],
  ["NLP", ["nlp", "natural language processing"]],
  ["LLMs", ["llm", "llms", "generative ai", "genai"]],
  ["Hugging Face", ["hugging face", "huggingface"]],
  ["Object detection", ["object detection", "object tracking", "image segmentation"]],
  ["PyTorch", ["pytorch"]],
  ["TensorFlow", ["tensorflow", "keras"]],
  ["OpenCV", ["opencv"]],
  ["YOLO", ["yolo", "yolov5", "yolov7", "yolov8", "yolov9", "yolov10", "yolov11", "yolo11", "yolo26"]],
  ["scikit-learn", ["scikit-learn", "sklearn"]],
  ["Pandas", ["pandas"]],
  ["NumPy", ["numpy"]],
  ["Spark", ["spark", "pyspark"]],
  ["Data analysis", ["data analysis", "data analytics", "veri analizi"]],
  ["Statistics", ["statistics", "statistical", "istatistik"]],
  ["A/B testing", ["a/b test", "a/b testing", "ab testing", "experimentation"]],
  ["Excel", ["microsoft excel", "ms excel", "advanced excel"]],
  ["Power BI", ["power bi", "powerbi"]],
  ["Tableau", ["tableau"]],
  ["Unity", ["unity", "unity3d"]],
  ["Product management", ["product management", "urun yonetimi"]],
  ["Roadmapping", ["roadmap", "roadmaps", "roadmapping"]],
  ["User research", ["user research", "user interviews"]],
  ["Figma", ["figma"]],
  ["Agile", ["agile", "scrum", "kanban"]],
  ["Jira", ["jira"]],
  ["Unit testing", ["unit test", "unit tests", "unit testing"]],
  ["Algorithms", ["algorithms", "data structures", "algoritma"]],
];

// These names are also everyday words ("react quickly", "swift response"),
// so they only count when written with a capital letter.
const CAPITALIZED_SKILLS: [string, string][] = [
  ["React", "React"],
  ["Swift", "Swift"],
  ["Spring", "Spring"],
  ["Flask", "Flask"],
  ["Rust", "Rust"],
];

function hasTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9+#.])${escaped}(?![a-z0-9+#])`).test(text);
}

/** Finds known skills in text. `extra` adds skills the user typed in themselves. */
export function findSkills(text: string, extra: string[] = []): string[] {
  const clean = plain(text);
  const found = SKILLS.filter(([, terms]) => terms.some((term) => hasTerm(clean, term))).map(
    ([name]) => name,
  );
  for (const [skill, word] of CAPITALIZED_SKILLS) {
    if (!found.includes(skill) && hasTerm(text, word)) found.push(skill);
  }
  for (const skill of extra) {
    if (!found.some((name) => plain(name) === plain(skill)) && hasTerm(clean, plain(skill))) {
      found.push(skill);
    }
  }
  return found;
}

const OTHER_SECTIONS =
  /^(about|about me|summary|profile|projects?|skills|technical skills|languages|certifications?.*|volunteering|references|awards|publications|hakkimda|ozet|projeler|yetenekler|beceriler|diller|sertifikalar|referanslar)$/;
const EXPERIENCE_HEADING = /^((work|professional) )?experience$|^(is )?deneyim(ler)?i?$/;
const EDUCATION_HEADING = /^education$|^egitim( bilgileri)?$/;

/** Finds the education and experience lines, using the CV's own section headings. */
export function readCvSections(text: string): { education: string[]; experience: string[] } {
  const education: string[] = [];
  const experience: string[] = [];
  let section: "education" | "experience" | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s*\t\s*/g, " · ").replace(/ {2,}/g, " ").trim();
    const name = plain(line).replace(/:$/, "");
    if (EXPERIENCE_HEADING.test(name)) section = "experience";
    else if (EDUCATION_HEADING.test(name)) section = "education";
    else if (OTHER_SECTIONS.test(name)) section = null;
    else if (line.length >= 160 || line.length < 4) continue;
    else if (section === "experience" && /\b(19|20)\d{2}\b/.test(line)) experience.push(line);
    else if (
      section === "education" &&
      /\b(19|20)\d{2}\b|universit|bachelor|b\.?sc\b|m\.?sc\b|lisans|gpa/.test(name)
    ) {
      education.push(line);
    }
  }
  return { education, experience };
}

const OTHER_LANGUAGES =
  "german|french|spanish|russian|arabic|italian|dutch|portuguese|japanese|korean|chinese|mandarin";

function requiredLanguages(text: string): string[] {
  const before = new RegExp(
    `(?:fluent|fluency|native|proficien\\w*|excellent|speak\\w*)[^.\\n]{0,30}\\b(${OTHER_LANGUAGES})\\b`,
    "g",
  );
  const after = new RegExp(
    `\\b(${OTHER_LANGUAGES})\\b[^.\\n]{0,20}(?:required|speaking|speaker|fluen|proficien)`,
    "g",
  );
  const found = [...text.matchAll(before), ...text.matchAll(after)].map((match) => match[1]);
  return [...new Set(found)];
}

function yearsAsked(text: string): number | null {
  const pattern =
    /(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?(?:years?|yrs?)\b[^.\n]{0,40}experience|experience[^.\n]{0,20}?(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b|(\d{1,2})\s*\+?\s*yil\b/g;
  const years = [...text.matchAll(pattern)]
    .map((match) => Number(match[1] ?? match[2] ?? match[3]))
    .filter((value) => value <= 20);
  return years.length ? Math.max(...years) : null;
}

const ROLE_FIT: Record<RoleType, number> = {
  "Computer vision": 1,
  Product: 1,
  "Full stack": 1,
  Software: 0.7,
  "AI and data": 0.8,
  Other: 0.2,
};

// AI and machine learning jobs are target jobs. Other data jobs are close to them.
const AI_TITLE = /machine learning|\bml\b|\bai\b|yapay zeka/;

// Data analyst work is further from the CV than AI and machine learning work.
const DATA_ANALYST_FIT = 0.6;

const TOO_SENIOR_FIT = 0.1;
const TOO_SENIOR_MAX_SCORE = 40;

type JobInput = { title: string; description: string; roleType: RoleType; level: Level };
type CvInput = { skills: string[]; text: string; addedSkills?: string[] };

export function scoreJob(job: JobInput, cv: CvInput): { score: number; details: ScoreDetails } {
  const jobText = plain(`${job.title}\n${job.description}`);
  const cvText = plain(cv.text);

  // Skills: 50%
  const jobSkills = findSkills(`${job.title}
${job.description}`, cv.addedSkills);
  const mine = new Set(cv.skills.map(plain));
  const have = jobSkills.filter((skill) => mine.has(plain(skill)));
  const missing = jobSkills.filter((skill) => !mine.has(plain(skill)));
  // Starts low: a job with little evidence should not beat one with real matches.
  const skillFit = (have.length + 0.5) / (jobSkills.length + 1.5);
  const skillNote = jobSkills.length
    ? `You have ${have.length} of the ${jobSkills.length} skills found in this job`
    : "No known skills found in the job text, so this part stays low";

  // Field and role: 20%
  const titleWords = plain(job.title);
  const roleFit = /data analy|veri analist/.test(titleWords)
    ? DATA_ANALYST_FIT
    : AI_TITLE.test(titleWords)
      ? 1
      : ROLE_FIT[job.roleType];
  const roleNote =
    job.roleType === "Other"
      ? "Outside your target jobs"
      : `${job.roleType} job, compared with your target jobs`;

  // Experience level: 20%
  let levelFit: number;
  let levelNote: string;
  const years = yearsAsked(jobText);
  if (job.level === "Intern" || job.level === "Junior") {
    levelFit = 1;
    levelNote = "Entry-level job, a good fit for a new graduate";
  } else if (job.level === "Senior") {
    levelFit = 0.1;
    levelNote = "Senior job; you are a new graduate";
  } else if (years === null) {
    levelFit = 0.7;
    levelNote = "No level or years of experience stated";
  } else {
    levelFit = years <= 1 ? 1 : years === 2 ? 0.7 : years === 3 ? 0.5 : years === 4 ? 0.3 : 0.1;
    levelNote = `Asks for ${years} years of experience`;
  }

  // Education and language: 10%
  let schoolFit = 1;
  const schoolNotes: string[] = [];
  const wantsPhd = /ph\.?d[^.\n]{0,30}(required|must)|(required|must)[^.\n]{0,30}ph\.?d/.test(jobText);
  const wantsMasters = /master'?s?[^.\n]{0,30}(required|must)|(required|must)[^.\n]{0,30}master'?s/.test(jobText);
  if (wantsPhd && !/ph\.?d|doctora/.test(cvText)) {
    schoolFit *= 0.3;
    schoolNotes.push("asks for a PhD");
  } else if (wantsMasters && !/master|m\.?sc|yuksek lisans/.test(cvText)) {
    schoolFit *= 0.5;
    schoolNotes.push("asks for a master's degree");
  }
  const languages = requiredLanguages(jobText).filter((language) => !cvText.includes(language));
  if (languages.length) {
    schoolFit *= 0.4;
    const names = languages.map((name) => name[0].toUpperCase() + name.slice(1));
    schoolNotes.push(`asks for ${names.join(", ")}`);
  }

  const part = (name: string, weight: number, fit: number, note: string): ScorePart => ({
    name,
    weight,
    points: Math.round(weight * fit),
    note,
  });

  const parts = [
    part("Skills", 50, skillFit, skillNote),
    part("Field and role", 20, roleFit, roleNote),
    part("Experience level", 20, levelFit, levelNote),
    part(
      "Education and language",
      10,
      schoolFit,
      schoolNotes.length ? `This job ${schoolNotes.join(" and ")}` : "No special requirement found",
    ),
  ];

  // Good skills cannot make up for a job far above a new graduate's level.
  const total = parts.reduce((sum, item) => sum + item.points, 0);
  const tooSenior = levelFit <= TOO_SENIOR_FIT;
  if (tooSenior && total > TOO_SENIOR_MAX_SCORE) parts[2].note += `, so the score is limited to ${TOO_SENIOR_MAX_SCORE}%`;

  return {
    score: tooSenior ? Math.min(total, TOO_SENIOR_MAX_SCORE) : total,
    details: { parts, have, missing },
  };
}
