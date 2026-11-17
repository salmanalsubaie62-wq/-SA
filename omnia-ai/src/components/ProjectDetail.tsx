"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "./Icon";
import { EmptyState, ErrorText, PageHead, toast } from "./ui";
import { api } from "@/lib/client/api";
import { formatDate } from "@/lib/client/api";
import { useI18n } from "@/lib/client/i18n";

interface Task {
  id: string;
  title: string;
  done: boolean;
}

interface Detail {
  project: { id: string; name: string; kind: string; description: string; notes: string; tasks: Task[]; createdAt: number };
  conversations: Array<{ id: string; title: string; updated_at: number }>;
  media: Array<{ id: string; kind: string; title: string; status: string; url: string | null; createdAt: number }>;
  activity: Array<{ action: string; detail: string; created_at: number }>;
  memories: Array<{ id: string; content: string; enabled: number }>;
}

export function ProjectDetail({ id }: { id: string }) {
  const { lang } = useI18n();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [newTask, setNewTask] = useState("");
  const [tab, setTab] = useState<"overview" | "tasks" | "chats" | "media" | "memory" | "activity">("overview");
  const [newMemory, setNewMemory] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api<Detail>(`/api/projects/${id}`);
      setData(d);
      setNotes(d.project.notes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load project.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (body: Record<string, unknown>, success?: string) => {
    try {
      await api(`/api/projects/${id}`, { method: "PATCH", body });
      if (success) toast(success, "success");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save.", "error");
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this project? Conversations stay in your history but lose the project link.")) return;
    await api(`/api/projects/${id}`, { method: "DELETE" });
    window.location.href = "/projects";
  };

  if (error) return <div className="content-narrow"><ErrorText message={error} /></div>;
  if (!data) return <div className="content-narrow"><div className="skeleton" style={{ height: 120 }} /></div>;
  const p = data.project;
  const tabs = [
    ["overview", "Overview"], ["tasks", `Tasks (${p.tasks.filter((t) => t.done).length}/${p.tasks.length})`], ["chats", `Chats (${data.conversations.length})`],
    ["media", `Media (${data.media.length})`], ["memory", `Memory (${data.memories.length})`], ["activity", "Activity"],
  ] as const;

  return (
    <div className="content-narrow">
      <PageHead
        title={p.name}
        subtitle={p.description || "Add a description to guide the assistant for this project."}
        actions={
          <>
            <Link className="btn btn-primary" href={`/chat?project=${p.id}`}><Icon name="chat" size={15} />Start chat</Link>
            <button className="btn btn-danger" onClick={remove}><Icon name="trash" size={14} />Delete</button>
          </>
        }
      />
      <div className="tabs" role="tablist" style={{ marginBottom: 20 }}>
        {tabs.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="card stack">
          <label className="field">
            Project notes (included as context in this project’s chats)
            <textarea rows={10} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={20000} placeholder="Audience, tone, constraints, decisions made so far…" />
          </label>
          <div className="row-between">
            <span className="small muted">Created {formatDate(p.createdAt, lang)}</span>
            <button className="btn btn-primary" onClick={() => patch({ notes }, "Notes saved")} disabled={notes === p.notes}>Save notes</button>
          </div>
        </div>
      )}

      {tab === "tasks" && (
        <div className="stack">
          <form className="row" onSubmit={(e) => {
            e.preventDefault();
            if (!newTask.trim()) return;
            const next = [...p.tasks, { id: crypto.randomUUID(), title: newTask.trim(), done: false }];
            setNewTask("");
            patch({ tasks: next });
          }}>
            <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add a task…" maxLength={200} style={{ flex: 1 }} aria-label="New task" />
            <button className="btn btn-primary">Add task</button>
          </form>
          {p.tasks.length === 0 && <p className="muted">No tasks yet. Break the project into concrete steps.</p>}
          {p.tasks.map((t) => (
            <div key={t.id} className={`task-row ${t.done ? "done" : ""}`}>
              <input type="checkbox" checked={t.done} onChange={() => patch({ tasks: p.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) })} aria-label={`Mark ${t.title} done`} />
              <span>{t.title}</span>
              <button className="icon-btn btn-danger" onClick={() => patch({ tasks: p.tasks.filter((x) => x.id !== t.id) })} aria-label="Delete task"><Icon name="trash" size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {tab === "chats" && (
        <div className="stack">
          {data.conversations.length === 0 && <EmptyState icon="chat" title="No chats in this project">Start a chat from this project, or move an existing chat into it from the sidebar.</EmptyState>}
          {data.conversations.map((c) => (
            <Link key={c.id} href={`/chat/${c.id}`} className="recent-row card-tight card" style={{ textDecoration: "none" }}>
              <Icon name="chat" size={16} />
              <span style={{ flex: 1 }}>{c.title}</span>
              <span className="small muted">{formatDate(c.updated_at, lang)}</span>
            </Link>
          ))}
        </div>
      )}

      {tab === "media" && (
        <div className="stack">
          {data.media.length === 0 && <EmptyState icon="image" title="No media yet">Images and video storyboards created for this project appear here.</EmptyState>}
          <div className="gallery">
            {data.media.map((m) => (
              <div key={m.id} className="gallery-item">
                {m.url ? <img src={m.url} alt={m.title} loading="lazy" /> : <div className="placeholder-art" style={{ aspectRatio: "1", padding: 12 }}>{m.kind === "video_plan" ? "Storyboard" : "—"}</div>}
                <div className="gallery-cap"><span>{m.title}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "memory" && (
        <div className="stack">
          <form className="row" onSubmit={async (e) => {
            e.preventDefault();
            if (!newMemory.trim()) return;
            await api("/api/memories", { body: { content: newMemory.trim(), enabled: true, projectId: id } });
            setNewMemory("");
            toast("Saved to project memory", "success");
            load();
          }}>
            <input value={newMemory} onChange={(e) => setNewMemory(e.target.value)} placeholder="e.g. Audience: Gulf home cooks, 25–40, bilingual" style={{ flex: 1 }} maxLength={1000} aria-label="New project memory" />
            <button className="btn btn-primary">Add</button>
          </form>
          <p className="small muted" style={{ margin: 0 }}>Project memories apply only in this project and only when memory is enabled in Settings.</p>
          {data.memories.map((m) => (
            <div key={m.id} className="task-row"><span>{m.content}</span></div>
          ))}
        </div>
      )}

      {tab === "activity" && (
        <div className="card">
          {data.activity.length === 0 && <p className="muted" style={{ margin: 0 }}>No activity yet.</p>}
          <div className="activity">
            {data.activity.map((a, i) => (
              <div key={i} className="activity-item">
                <div style={{ flex: 1 }}>
                  <div>{a.detail}</div>
                  <div className="small muted">{formatDate(a.created_at, lang)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
