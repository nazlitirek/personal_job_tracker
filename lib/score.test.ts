import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyLevel, classifyRole, findSkills, isInTurkiye, plain, scoreJob } from "./score.ts";

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
});

test("classifyLevel reads the title first", () => {
  assert.equal(classifyLevel("Software Engineer (New Grad)"), "Junior");
  assert.equal(classifyLevel("Senior Data Scientist"), "Senior");
  assert.equal(classifyLevel("Internal Tools Engineer"), "Not stated");
  assert.equal(classifyLevel("Product Manager"), "Not stated");
  assert.equal(classifyLevel("Engineer", ["Entry-level"]), "Junior");
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
  assert.equal(score, 82); // 38 + 14 + 20 + 10
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
  assert.equal(score, 36); // 10 + 14 + 2 + 10
  assert.deepEqual(details.missing, ["Go", "Kubernetes", "AWS"]);
});

test("one matching skill is not a perfect skills score", () => {
  const { details } = scoreJob(
    { title: "Software Engineer", description: "Python.", roleType: "Software", level: "Not stated" },
    cv,
  );
  assert.equal(details.parts[0].points, 33);
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

test("a job with no known skills gets a neutral skills part", () => {
  const { details } = scoreJob(
    { title: "Software Engineer", description: "Great team.", roleType: "Software", level: "Not stated" },
    cv,
  );
  assert.equal(details.parts[0].points, 25);
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
  assert.match(details.parts[3].note, /russian/);
});
