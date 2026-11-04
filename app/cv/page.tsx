"use client";

import { useCallback, useEffect, useState } from "react";

type CvView = {
  fileName: string;
  error: string | null;
  skills: string[];
  education: string[];
  experience: string[];
};

export default function CvPage() {
  const [cv, setCv] = useState<CvView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [newSkill, setNewSkill] = useState("");

  const load = useCallback(async () => {
    const data = await (await fetch("/api/cv")).json();
    setCv(data.cv);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function change(body: { add?: string; remove?: string }) {
    const response = await fetch("/api/cv", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setCv((await response.json()).cv);
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>CV</h1>
          {cv && <div className="quiet">Reading {cv.fileName}</div>}
        </div>
        <button onClick={load}>Check again</button>
      </div>

      {!loaded ? (
        <div className="empty">Looking for your CV…</div>
      ) : !cv ? (
        <div className="notice">
          No CV found. Put your CV as a PDF in the project folder, next to <code>README.md</code>, then press Check again.
          It stays on your computer and git ignores it.
        </div>
      ) : cv.error ? (
        <div className="notice error">{cv.fileName}: {cv.error}</div>
      ) : (
        <>
          <section className="card section">
            <h2>Skills used for scoring</h2>
            <div className="chips">
              {cv.skills.length === 0 && <span className="quiet">No known skills found. Add yours below.</span>}
              {cv.skills.map((skill) => (
                <span className="chip" key={skill}>
                  {skill}
                  <button aria-label={`Remove ${skill}`} onClick={() => change({ remove: skill })}>×</button>
                </span>
              ))}
            </div>
            <form
              className="actions"
              style={{ marginTop: 12 }}
              onSubmit={(event) => {
                event.preventDefault();
                change({ add: newSkill });
                setNewSkill("");
              }}
            >
              <input value={newSkill} onChange={(event) => setNewSkill(event.target.value)} placeholder="Add a skill" />
              <button disabled={!newSkill.trim()}>Add</button>
            </form>
          </section>
          <section className="card section">
            <h2>Education lines found</h2>
            {cv.education.length ? (
              <ul>{cv.education.map((line) => <li key={line}>{line}</li>)}</ul>
            ) : (
              <span className="quiet">None found.</span>
            )}
          </section>
          <section className="card section">
            <h2>Experience lines found</h2>
            {cv.experience.length ? (
              <ul>{cv.experience.map((line) => <li key={line}>{line}</li>)}</ul>
            ) : (
              <span className="quiet">None found.</span>
            )}
          </section>
        </>
      )}
    </>
  );
}
