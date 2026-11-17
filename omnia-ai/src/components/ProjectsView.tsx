"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "./Icon";
import { EmptyState, ErrorText, PageHead, toast } from "./ui";
import { api } from "@/lib/client/api";

const KINDS: Array<{ id: string; label: string; icon: IconName }> = [
  { id: "general", label: "General", icon: "projects" },
  { id: "youtube", label: "YouTube channel", icon: "video" },
  { id: "game", label: "Game", icon: "code" },
  { id: "website", label: "Website", icon: "code" },
  { id: "business", label: "Business", icon: "team" },
  { id: "research", label: "Research", icon: "research" },
  { id: "film", label: "Film", icon: "video" },
  { id: "education", label: "Educational", icon: "chat" },
  { id: "marketing", label: "Marketing campaign", icon: "team" },
];

interface ProjectRow {
  id: string;
  name: string;
  kind: string;
  description: string;
  conversations: number;
  media: number;
  updatedAt: number;
}

export function ProjectsView() {
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("general");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const data = await api<{ projects: ProjectRow[] }>("/api/projects");
    setProjects(data.projects);
  };
  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/projects", { body: { name, kind, description } });
      setName("");
      setDescription("");
      toast("Project created", "success");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHead title="Projects" subtitle="Organize chats, images, videos, notes, tasks and memory around one goal: a YouTube channel, a game, a business or a film." />
      <div className="studio" style={{ gridTemplateColumns: "minmax(280px,340px) minmax(0,1fr)" }}>
        <form className="card stack" onSubmit={create}>
          <h2 style={{ margin: 0 }}>New project</h2>
          <label className="field">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} placeholder="Desert Cooking Channel" />
          </label>
          <label className="field">
            Type
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map((k) => (<option key={k.id} value={k.id}>{k.label}</option>))}
            </select>
          </label>
          <label className="field">
            Description
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="Weekly videos on Gulf home cooking for beginners…" />
          </label>
          <ErrorText message={error} />
          <button className="btn btn-primary" disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create project"}</button>
        </form>

        <div>
          {projects === null && <div className="grid grid-2"><div className="skeleton" style={{ height: 170 }} /><div className="skeleton" style={{ height: 170 }} /></div>}
          {projects?.length === 0 && (
            <EmptyState icon="projects" title="No projects yet">Create a project to group conversations, media and notes. Memory can be scoped to a project so context stays focused.</EmptyState>
          )}
          <div className="grid grid-2">
            {projects?.map((p) => {
              const meta = KINDS.find((k) => k.id === p.kind) ?? KINDS[0];
              return (
                <Link key={p.id} href={`/projects/${p.id}`} className="project-card">
                  <div className="row-between">
                    <div className="project-kind"><Icon name={meta.icon} size={20} /></div>
                    <span className="badge">{meta.label}</span>
                  </div>
                  <h3 style={{ margin: 0 }}>{p.name}</h3>
                  <p className="small muted" style={{ margin: 0, flex: 1 }}>{p.description || "No description yet."}</p>
                  <div className="small dim">{p.conversations} chats · {p.media} media</div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
