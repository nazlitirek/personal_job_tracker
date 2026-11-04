import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyLevel, classifyRole, findSkills, isInTurkiye, plain, readCvSections, scoreJob } from "./score.ts";

const cv = { skills: ["Python", "Machine learning", "SQL"], text: "Computer Engineering, English" };

test("plain removes Turkish letters", () => {
  assert.equal(plain("İSTANBUL Sarıyer Yazılım"), "istanbul sariyer yazilim");
});

test("classifyRole keeps target jobs and drops others", () => {
  assert.equal(classifyRole("Computer Vision Engineer"), "Computer vision");
  assert.equal(classifyRole("Product Manager"), "Product");
  assert.equal(classifyRole("Full-Stack AI Engineer"), "Full stack");
  assert.equal(classifyRole("Yazılım Geliştirici"), "Software");
  assert.equal(classifyRole("Business Developer"), null);
  assert.equal(classifyRole("Product Marketing Lead"), null);
  assert.equal(classifyRole("2D Animator"), null);
  assert.equal(classifyRole("Amazon Account / Product Manager"), null);
});

test("classifyLevel reads the title first", () => {
  assert.equal(classifyLevel("Software Engineer (New Grad)"), "Junior");
  assert.equal(classifyLevel("Senior Data Scientist"), "Senior");
  assert.equal(classifyLevel("Internal Tools Engineer"), "Not stated");
  assert.equal(classifyLevel("Product Manager"), "Not stated");
  assert.equal(classifyLevel("Engineer", ["Entry-level"]), "Junior");
});

test("readCvSections keeps lines in the right section", () => {
  const text = [
    "Experience",
    "Example Co | Software Intern\tJul 2025 – Oct 2025",
    "Built a website for the team.",
    "Education",
    "Example University\tIstanbul",
    "B.Sc. Software Engineering\tSep 2022 – Present",
    "Coursework includes Machine Learning.",
    "Volunteering",
    "Student Club\tSep 2024 – Jun 2025",
  ].join("\n");
  assert.deepEqual(readCvSections(text), {
    experience: ["Example Co | Software Intern · Jul 2025 – Oct 2025"],
    education: ["Example University · Istanbul", "B.Sc. Software Engineering · Sep 2022 – Present"],
  });
});

test("readCvSections reads capital and Turkish headings", () => {
  const { education, experience } = readCvSections("DENEYİM\nŞirket 2024 - 2025\nEĞİTİM\nÖrnek Üniversitesi");
  assert.deepEqual(experience, ["Şirket 2024 - 2025"]);
  assert.deepEqual(education, ["Örnek Üniversitesi"]);
});

test("isInTurkiye handles Turkish spelling", () => {
  assert.ok(isInTurkiye("Sarıyer, İstanbul"));
  assert.ok(isInTurkiye("Türkiye"));
  assert.ok(!isInTurkiye("Dubai"));
});

test("findSkills matches whole terms and aliases", () => {
  assert.deepEqual(findSkills("We use ML and PostgreSQL"), ["SQL", "Machine learning"]);
  assert.deepEqual(findSkills("JavaScript only"), ["JavaScript"]);
  assert.deepEqual(findSkills("a good community"), []);
  assert.deepEqual(findSkills("Experience with Blender", ["Blender"]), ["Blender"]);
  assert.deepEqual(findSkills("You react quickly in a swift team"), []);
  assert.deepEqual(findSkills("Built with React"), ["React"]);
  assert.deepEqual(findSkills("Trained YOLOv8 and YOLO26"), ["YOLO"]);
  assert.deepEqual(findSkills("reactjs and FastAPI"), ["React", "FastAPI"]);
});

test("a junior job with matching skills scores high", () => {
  const { score, details } = scoreJob(
    {
      title: "Software Engineer (New Grad)",
      description: "Python and SQL required",
      roleType: "Software",
      level: "Junior",
    },
    cv,
  );
  assert.equal(score, 80); // 36 + 14 + 20 + 10
  assert.deepEqual(details.have, ["Python", "SQL"]);
  assert.deepEqual(details.missing, []);
});

test("a senior job with missing skills scores low", () => {
  const { score, details } = scoreJob(
    {
      title: "Senior Software Engineer",
      description: "Go, Kubernetes and AWS. Golang daily.",
      roleType: "Software",
      level: "Senior",
    },
    cv,
  );
  assert.equal(score, 32); // 6 + 14 + 2 + 10
  assert.deepEqual(details.missing, ["Go", "Kubernetes", "AWS"]);
});

test("one matching skill is not a perfect skills score", () => {
  const { details } = scoreJob(
    { title: "Software Engineer", description: "Python.", roleType: "Software", level: "Not stated" },
    cv,
  );
  assert.equal(details.parts[0].points, 30);
});

test("a senior job is limited to 40% even with matching skills", () => {
  const { score, details } = scoreJob(
    {
      title: "Lead Python Engineer",
      description: "Python, SQL and machine learning.",
      roleType: "Software",
      level: "Senior",
    },
    cv,
  );
  assert.equal(score, 40);
  assert.match(details.parts[2].note, /limited to 40%/);
});

test("AI and machine learning jobs get full role points", () => {
  const score = (title: string) =>
    scoreJob({ title, description: "", roleType: "AI and data", level: "Not stated" }, cv).details.parts[1].points;
  assert.equal(score("AI Engineer"), 20);
  assert.equal(score("Machine Learning Engineer"), 20);
  assert.equal(score("Data Scientist"), 16);
  assert.equal(score("Data Analyst"), 12);
});

test("years of experience lower the level part", () => {
  const { details } = scoreJob(
    {
      title: "Product Manager",
      description: "At least 5+ years of experience in games.",
      roleType: "Product",
      level: "Not stated",
    },
    cv,
  );
  const part = details.parts.find((item) => item.name === "Experience level");
  assert.equal(part?.points, 2);
  assert.match(part?.note ?? "", /5 years/);
});

test("a job with no known skills gets a low skills part", () => {
  const { details } = scoreJob(
    { title: "Software Engineer", description: "Great team.", roleType: "Software", level: "Not stated" },
    cv,
  );
  assert.equal(details.parts[0].points, 17);
});

test("a required language the CV lacks lowers the last part", () => {
  const { details } = scoreJob(
    {
      title: "Senior Project Manager - Russian Speaking",
      description: "Fluent in Russian.",
      roleType: "Other",
      level: "Senior",
    },
    cv,
  );
  assert.equal(details.parts[3].points, 4);
  assert.match(details.parts[3].note, /Russian/);
});
