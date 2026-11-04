"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ScoreBadge } from "@/components/ScoreBadge";
import type { Application, Stage } from "@/lib/store";

const STAGES: Stage[] = ["Saved", "Applied", "Interview", "Offer", "Rejected"];

export default function TrackerPage() {
  const [items, setItems] = useState<Application[] | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await (await fetch("/api/applications")).json();
      setItems(data.applications);
    } catch {
      setError("Could not load your applications.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function change(jobId: number, body: Record<string, unknown>) {
    const response = await fetch(`/api/applications/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) setError("Could not save that change.");
    await load();
  }

  async function remove(jobId: number) {
    await fetch(`/api/applications/${jobId}`, { method: "DELETE" });
    await load();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="head">
        <div>
          <h1>Tracker</h1>
          <div className="quiet">{items?.length ?? 0} jobs. Drag a card or change its stage.</div>
        </div>
      </div>
      {error && <div className="notice error">{error}</div>}
      {items !== null && items.length === 0 && (
        <div className="empty">
          Nothing here yet. Press Save on a job in the <Link href="/">job list</Link>.
        </div>
      )}
      <div className="board">
        {STAGES.map((stage) => {
          const cards = (items ?? []).filter((item) => item.stage === stage);
          return (
            <section
              key={stage}
              className={`column ${over === stage ? "over" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setOver(stage);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(event) => {
                event.preventDefault();
                setOver(null);
                const jobId = Number(event.dataTransfer.getData("text/plain"));
                if (jobId) change(jobId, { stage });
              }}
            >
              <h2>{stage} <span className="quiet">{cards.length}</span></h2>
              {cards.map((item) => (
                <div
                  className="card ticket"
                  key={item.id}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", String(item.id))}
                >
                  <div className="job-title">
                    {item.link ? (
                      <a href={item.link} target="_blank" rel="noreferrer">{item.title}</a>
                    ) : (
                      item.title
                    )}
                  </div>
                  <div className="quiet">{item.company}</div>
                  <div><ScoreBadge score={item.score} /></div>
                  {!item.active && <div className="due">This job may be closed.</div>}
                  <label>
                    Stage
                    <select value={item.stage} onChange={(event) => change(item.id, { stage: event.target.value })}>
                      {STAGES.map((name) => <option key={name}>{name}</option>)}
                    </select>
                  </label>
                  <label>
                    Date applied
                    <input
                      type="date"
                      value={item.appliedDate ?? ""}
                      onChange={(event) => change(item.id, { appliedDate: event.target.value })}
                    />
                  </label>
                  <label>
                    <span className={item.nextDate && item.nextDate <= today ? "due" : ""}>
                      Next step{item.nextDate && item.nextDate <= today ? " is due" : ""}
                    </span>
                    <input
                      type="date"
                      value={item.nextDate ?? ""}
                      onChange={(event) => change(item.id, { nextDate: event.target.value })}
                    />
                  </label>
                  <label>
                    Notes
                    {/* The key resets this box when saved notes change. */}
                    <textarea
                      key={item.notes}
                      defaultValue={item.notes}
                      onBlur={(event) => {
                        if (event.target.value !== item.notes) change(item.id, { notes: event.target.value });
                      }}
                    />
                  </label>
                  <div><button className="link" onClick={() => remove(item.id)}>Remove from tracker</button></div>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}
