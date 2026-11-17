"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { ConnectionBadge, EmptyState, ErrorText, Notice, PageHead, Spinner, toast } from "./ui";
import { api, downloadText } from "@/lib/client/api";

interface Scene {
  number: number;
  title: string;
  durationSeconds: number;
  visual: string;
  camera: string;
  narration: string;
  imagePrompt: string;
}
interface Plan {
  title: string;
  logline: string;
  style: string;
  scenes: Scene[];
}
interface SavedPlan {
  id: string;
  title: string;
  idea: string;
  status: string;
  createdAt: number;
  plan: Plan & { durationSeconds: number; aspect: string };
}

export function VideoStudio() {
  const [idea, setIdea] = useState("");
  const [duration, setDuration] = useState<5 | 10 | 15 | 30>(15);
  const [aspect, setAspect] = useState("16:9");
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<{ id: string; plan: Plan } | null>(null);
  const [renderConnected, setRenderConnected] = useState(false);
  const [history, setHistory] = useState<SavedPlan[]>([]);

  const loadHistory = async () => {
    const data = await api<{ renderConnected: boolean; plans: SavedPlan[] }>("/api/video/plan");
    setRenderConnected(data.renderConnected);
    setHistory(data.plans);
  };
  useEffect(() => {
    loadHistory().catch(() => undefined);
  }, []);

  const plan = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ id: string; plan: Plan; renderConnected: boolean }>("/api/video/plan", {
        body: { idea, durationSeconds: duration, aspect, language },
      });
      setCurrent({ id: res.id, plan: res.plan });
      setRenderConnected(res.renderConnected);
      toast("Storyboard created", "success");
      loadHistory().catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Planning failed.");
    } finally {
      setBusy(false);
    }
  };

  const exportMarkdown = (p: Plan) => {
    const lines = [`# ${p.title}`, "", `**Logline:** ${p.logline}`, `**Style:** ${p.style}`, ""];
    for (const s of p.scenes) {
      lines.push(`## Scene ${s.number}: ${s.title} (${s.durationSeconds}s)`, "", `- **Visual:** ${s.visual}`, `- **Camera:** ${s.camera}`, `- **Narration:** ${s.narration}`, "", "```text", s.imagePrompt, "```", "");
    }
    downloadText(`${p.title.replace(/[^\w-]+/g, "-").slice(0, 50) || "storyboard"}.md`, lines.join("\n"));
  };

  return (
    <div>
      <PageHead
        title="Video Studio"
        subtitle="Turn an idea into a professional script, scene breakdown and storyboard prompts. Clip rendering runs through a connected video provider."
        actions={<ConnectionBadge connected={renderConnected} label={renderConnected ? "Rendering connected" : "Rendering not connected"} />}
      />
      <div className="studio">
        <div className="stack">
          <div className="card stack">
            <label className="field">
              Video idea
              <textarea
                rows={6}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="A 15-second product ad for handmade ceramic mugs: morning light, steam rising, hands wrapping around a mug, warm and calm tone…"
                maxLength={4000}
              />
            </label>
            <div className="field">
              <span>Duration</span>
              <div className="chips">
                {([5, 10, 15, 30] as const).map((d) => (
                  <button key={d} className="chip" aria-pressed={duration === d} onClick={() => setDuration(d)}>{d} s</button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>Aspect ratio</span>
              <div className="chips">
                {["16:9", "9:16", "1:1", "4:3", "3:4"].map((a) => (
                  <button key={a} className="chip" aria-pressed={aspect === a} onClick={() => setAspect(a)}>{a}</button>
                ))}
              </div>
            </div>
            <label className="field">
              Narration language
              <select value={language} onChange={(e) => setLanguage(e.target.value as "en" | "ar")}>
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </label>
            <ErrorText message={error} />
            <button className="btn btn-primary" style={{ minHeight: 44 }} onClick={plan} disabled={busy || idea.trim().length < 10}>
              {busy ? <Spinner label="Writing the script…" /> : "Create script & storyboard"}
            </button>
          </div>

          <div className="card stack" style={{ padding: 16 }}>
            <h3 style={{ margin: 0 }}>Pipeline</h3>
            {[
              ["Understand the idea", true],
              ["Write the script", true],
              ["Split into scenes", true],
              ["Scene descriptions & image references", true],
              ["Render clips with a video provider", renderConnected],
              ["Character consistency across clips", false],
              ["Timeline assembly & download", false],
            ].map(([label, ok]) => (
              <div key={String(label)} className="row-between small">
                <span className="dim">{String(label)}</span>
                <span className={`badge ${ok ? "badge-ok" : "badge-off"}`}>{ok ? "Ready" : "Not connected"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="stack">
          {!renderConnected && current && (
            <Notice kind="info" title="Storyboard only — rendering is not connected">
              The script, scenes and image prompts below are real outputs. No video clips have been generated. Connect a video provider to render them.
            </Notice>
          )}
          {current ? (
            <div className="card stack">
              <div className="row-between">
                <div>
                  <h2 style={{ margin: 0 }}>{current.plan.title}</h2>
                  <p className="dim" style={{ margin: "4px 0 0" }}>{current.plan.logline}</p>
                  <div className="small muted">Style: {current.plan.style}</div>
                </div>
                <div className="row">
                  <button className="btn btn-sm" onClick={() => exportMarkdown(current.plan)}><Icon name="download" size={14} />Export storyboard</button>
                </div>
              </div>
              <div className="timeline">
                {current.plan.scenes.map((s) => (
                  <div key={s.number} className="scene">
                    <div className="scene-num">{s.number}</div>
                    <div>
                      <div className="scene-meta">
                        <span className="badge">{s.durationSeconds}s</span>
                        <span className="badge">{s.camera}</span>
                      </div>
                      <h3>{s.title}</h3>
                      <p className="dim" style={{ marginBottom: 8 }}>{s.visual}</p>
                      <p style={{ marginBottom: 8 }}><strong>Narration:</strong> {s.narration}</p>
                      <div className="scene-prompt">{s.imagePrompt}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon="video" title="No storyboard yet">
              Describe a video. OMNIA will write the script, split it into scenes with camera direction, and prepare a reference-image prompt for each scene.
            </EmptyState>
          )}

          {history.length > 0 && (
            <div className="card stack">
              <h3 style={{ margin: 0 }}>Previous storyboards</h3>
              {history.map((h) => (
                <button key={h.id} className="recent-row" style={{ border: 0, background: "none", font: "inherit", textAlign: "start", cursor: "pointer" }} onClick={() => setCurrent({ id: h.id, plan: h.plan })}>
                  <span className="recent-type">{h.plan.durationSeconds}s</span>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.title}</span>
                  <span className="small muted">{h.plan.aspect}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
