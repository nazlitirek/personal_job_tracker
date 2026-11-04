"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScoreBadge } from "@/components/ScoreBadge";
import type { Job } from "@/lib/store";

const REFRESH_AFTER_HOURS = 6;
const LEVELS = ["Intern", "Junior", "Not stated", "Senior"];
const TYPES = ["Computer vision", "Product", "Full stack", "AI and data", "Software", "Other"];

function ago(date: string | null): string {
  if (!date) return "date not stated";
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return "today";
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [cvReady, setCvReady] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [filters, setFilters] = useState({ workplace: "", type: "", level: "", days: "", min: "0", place: "" });
  const started = useRef(false);

  const load = useCallback(async () => {
    const data = await (await fetch("/api/jobs")).json();
    setJobs(data.jobs);
    setLastFetch(data.lastFetch);
    setCvReady(data.cvReady);
    return data as { lastFetch: string | null };
  }, []);

  const refresh = useCallback(async () => {
    setFetching(true);
    setMessage(null);
    try {
      const response = await fetch("/api/refresh", { method: "POST" });
      if (!response.ok) throw new Error();
      const { sources } = await response.json();
      const failed = sources.filter((item: { error?: string }) => item.error);
      if (failed.length) {
        setMessage(`Could not reach: ${failed.map((item: { source: string }) => item.source).join(", ")}. Their older jobs stay in the list.`);
      }
      await load();
    } catch {
      setMessage("Could not fetch new jobs. Check your internet connection and try again.");
    } finally {
      setFetching(false);
    }
  }, [load]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    load()
      .then((data) => {
        const age = data.lastFetch ? Date.now() - new Date(data.lastFetch).getTime() : Infinity;
        if (age > REFRESH_AFTER_HOURS * 3600000) return refresh();
      })
      .catch(() => setMessage("Could not load jobs."));
  }, [load, refresh]);

  const shown = useMemo(() => {
    const place = filters.place.trim().toLowerCase();
    const days = Number(filters.days);
    return (jobs ?? []).filter((job) => {
      if (filters.workplace === "Remote" && job.workplace !== "Remote") return false;
      if (filters.workplace === "Office" && job.workplace === "Remote") return false;
      if (filters.type && job.roleType !== filters.type) return false;
      if (filters.level && job.level !== filters.level) return false;
      if (place && !job.location.toLowerCase().includes(place)) return false;
      if (days && (!job.postedAt || Date.now() - new Date(job.postedAt).getTime() > days * 86400000)) return false;
      if (Number(filters.min) > 0 && (job.score ?? 0) < Number(filters.min)) return false;
      return true;
    });
  }, [jobs, filters]);

  const set = (key: keyof typeof filters) => (event: { target: { value: string } }) =>
    setFilters((old) => ({ ...old, [key]: event.target.value }));

  async function save(job: Job) {
    await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.id }),
    });
    await load();
  }

  async function hide(job: Job) {
    await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
    await load();
  }

  async function addJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    if (!response.ok) {
      setMessage((await response.json()).error);
      return;
    }
    form.reset();
    await load();
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>Jobs</h1>
          <div className="quiet">
            {shown.length} of {jobs?.length ?? 0} jobs
            {lastFetch ? ` · updated ${ago(lastFetch)}` : ""}
          </div>
        </div>
        <button className="main" onClick={refresh} disabled={fetching}>
          {fetching ? "Fetching jobs…" : "Fetch new jobs"}
        </button>
      </div>

      {!cvReady && (
        <div className="notice">
          No match percentages yet. <Link href="/cv">Add your CV</Link> to see them.
        </div>
      )}
      {message && <div className="notice error">{message}</div>}

      <div className="filters">
        <label>
          Where
          <select value={filters.workplace} onChange={set("workplace")}>
            <option value="">All</option>
            <option value="Remote">Remote</option>
            <option value="Office">On-site or hybrid</option>
          </select>
        </label>
        <label>
          Location
          <input value={filters.place} onChange={set("place")} placeholder="Istanbul" />
        </label>
        <label>
          Job type
          <select value={filters.type} onChange={set("type")}>
            <option value="">All</option>
            {TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label>
          Level
          <select value={filters.level} onChange={set("level")}>
            <option value="">All</option>
            {LEVELS.map((level) => <option key={level}>{level}</option>)}
          </select>
        </label>
        <label>
          Posted
          <select value={filters.days} onChange={set("days")}>
            <option value="">Any time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
        <label>
          Minimum match
          <select value={filters.min} onChange={set("min")} disabled={!cvReady}>
            <option value="0">Any</option>
            <option value="50">50%</option>
            <option value="70">70%</option>
            <option value="85">85%</option>
          </select>
        </label>
      </div>

      <details className="add card">
        <summary>Add a job by hand, for example from LinkedIn</summary>
        <form className="form" onSubmit={addJob}>
          <input name="title" placeholder="Job title" required />
          <input name="company" placeholder="Company" />
          <input name="location" placeholder="Location" />
          <input name="link" type="url" placeholder="Link to the job" />
          <textarea name="description" placeholder="Paste the job text here" required />
          <div>
            <button className="main">Add job</button>
          </div>
        </form>
      </details>

      {jobs === null || (fetching && jobs.length === 0) ? (
        <div className="empty">Loading jobs…</div>
      ) : shown.length === 0 ? (
        <div className="empty">No jobs match these filters.</div>
      ) : (
        <div className="list">
          {shown.map((job) => (
            <article className="card job" key={job.id}>
              <ScoreBadge score={job.score} />
              <div>
                <div className="job-title">
                  {job.link ? (
                    <a href={job.link} target="_blank" rel="noreferrer">{job.title}</a>
                  ) : (
                    job.title
                  )}
                  <span className="tag">{job.roleType}</span>
                  {job.level !== "Not stated" && <span className="tag">{job.level}</span>}
                </div>
                <div className="quiet">
                  {job.company} · {job.location}
                  {job.workplace !== "Not stated" && job.workplace !== "Remote" ? ` · ${job.workplace}` : ""}
                  {" · "}posted {ago(job.postedAt)}
                  {job.source === "Himalayas" && (
                    <> · via <a href="https://himalayas.app" target="_blank" rel="noreferrer">Himalayas</a></>
                  )}
                </div>
                {job.details && (
                  <button className="link" onClick={() => setOpen(open === job.id ? null : job.id)}>
                    {open === job.id ? "Hide reasons" : "Why this score?"}
                  </button>
                )}
              </div>
              <div className="actions">
                {job.stage ? (
                  <Link href="/tracker" className="quiet">In tracker: {job.stage}</Link>
                ) : (
                  <button onClick={() => save(job)}>Save</button>
                )}
                <button onClick={() => hide(job)} title="Never show this job again">Hide</button>
              </div>
              {open === job.id && job.details && (
                <div className="why">
                  <table>
                    <tbody>
                      {job.details.parts.map((part) => (
                        <tr key={part.name}>
                          <td><strong>{part.name}</strong></td>
                          <td>{part.points} of {part.weight}</td>
                          <td>{part.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="chips">
                    {job.details.have.map((skill) => <span className="chip have" key={skill}>Have: {skill}</span>)}
                    {job.details.missing.map((skill) => <span className="chip missing" key={skill}>Missing: {skill}</span>)}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
