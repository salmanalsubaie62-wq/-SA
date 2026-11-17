"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { Markdown } from "./Markdown";
import { ConnectionBadge, ErrorText, PageHead, Spinner, toast } from "./ui";
import { api, downloadText } from "@/lib/client/api";

const AGENTS = [
  { id: "researcher", name: "Researcher", desc: "Deep research with verified facts and uncertainty." },
  { id: "designer", name: "Designer", desc: "Visual concepts, palettes, layouts and design plans." },
  { id: "image_creator", name: "Image Creator", desc: "High-quality prompts for image generation." },
  { id: "video_director", name: "Video Director", desc: "Scripts, scene breakdowns and production plans." },
  { id: "programmer", name: "Programmer", desc: "Builds and debugs software with runnable code." },
  { id: "teacher", name: "Teacher", desc: "Clear, step-by-step educational explanations." },
  { id: "writer", name: "Writer", desc: "Polished professional content for any audience." },
  { id: "business_analyst", name: "Business Analyst", desc: "Market, economics, risks and a recommendation." },
  { id: "data_analyst", name: "Data Analyst", desc: "Dataset analysis, trends and chart specs." },
  { id: "project_manager", name: "Project Manager", desc: "Milestones, tasks, owners and risks." },
] as const;

type AgentId = (typeof AGENTS)[number]["id"];

interface RunResult {
  goal: string;
  steps: Array<{ agent: AgentId; name: string; output: string; provider: string; model: string }>;
  final: string;
  coordinator: { provider: string; model: string };
}

export function AgentTeam({ connected }: { connected: boolean }) {
  const [goal, setGoal] = useState("");
  const [selected, setSelected] = useState<AgentId[]>(["project_manager", "researcher", "writer"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  const toggleAgent = (id: AgentId) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) {
        toast("Choose up to 4 agents per run.", "error");
        return prev;
      }
      return [...prev, id];
    });
  };

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      // Agents run in the order they were selected, so pick the Project Manager first to plan the work.
      setResult(await api<RunResult>("/api/agents/run", { body: { goal, agents: selected } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent run failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHead
        title="AI Agents"
        subtitle="Choose up to four specialists. They work in sequence, each building on the team's previous output, and the coordinator returns one organized result."
        actions={<ConnectionBadge connected={connected} label={connected ? "AI connected" : "No AI provider"} />}
      />
      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        {AGENTS.map((a, i) => (
          <button key={a.id} className="agent-card" aria-pressed={selected.includes(a.id)} onClick={() => toggleAgent(a.id)}>
            <div className="row-between">
              <span className="agent-num">AGENT {String(i + 1).padStart(2, "0")}</span>
              {selected.includes(a.id) && <Icon name="check" size={16} />}
            </div>
            <strong>{a.name}</strong>
            <span className="small muted">{a.desc}</span>
          </button>
        ))}
      </div>
      <div className="card stack">
        <label className="field">
          Team goal
          <textarea rows={4} value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={4000} placeholder="Plan and draft a launch campaign for a Saudi-made skincare brand: market research, positioning, a 4-week content plan and the launch email." />
        </label>
        <div className="row-between">
          <span className="small muted">{selected.length} agent{selected.length === 1 ? "" : "s"} · run in click order · coordinator merges the result</span>
          <button className="btn btn-primary" disabled={busy || !connected || goal.trim().length < 10 || selected.length === 0} onClick={run} style={{ minHeight: 42 }}>
            {busy ? <Spinner label="Team is working…" /> : (<><Icon name="team" size={16} /> Run team</>)}
          </button>
        </div>
        <ErrorText message={error} />
      </div>

      {result && (
        <div className="grid grid-2" style={{ marginTop: 20, alignItems: "start" }}>
          <div className="card stack">
            <div className="row-between">
              <h2 style={{ margin: 0 }}>Final result</h2>
              <button className="btn btn-sm" onClick={() => downloadText("omnia-team-result.md", result.final)}><Icon name="download" size={14} />Export</button>
            </div>
            <span className="badge badge-ok"><span className="dot" />Coordinator · <span className="mono">{result.coordinator.model}</span></span>
            <Markdown source={result.final} />
          </div>
          <div className="card stack">
            <h2 style={{ margin: 0 }}>Team steps</h2>
            {result.steps.map((s) => (
              <div key={s.agent} className="agent-step stack" style={{ gap: 6 }}>
                <div className="row-between">
                  <strong>{s.name}</strong>
                  <span className="small muted mono">{s.model}</span>
                </div>
                <div className="small dim" style={{ maxHeight: 180, overflow: "auto" }}>
                  <Markdown source={s.output} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
