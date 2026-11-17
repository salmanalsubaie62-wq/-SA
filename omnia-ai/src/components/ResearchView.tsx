"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { Markdown } from "./Markdown";
import { ConnectionBadge, ErrorText, Notice, PageHead, Spinner } from "./ui";
import { api, downloadText } from "@/lib/client/api";

interface Source {
  index: number;
  title: string;
  url: string;
  fetched: boolean;
}
interface ResearchResponse {
  answer: string;
  sources: Source[];
  webVerified: boolean;
  provider: string;
  model: string;
  notice?: string;
}

const DEPTHS = [
  { id: "quick", label: "Quick search", desc: "Fast answer from top sources" },
  { id: "deep", label: "Deep research", desc: "Multiple sources, structured report" },
  { id: "expert", label: "Expert research", desc: "Evidence comparison & conclusions" },
] as const;

export function ResearchView({ connected }: { connected: boolean }) {
  const [question, setQuestion] = useState("");
  const [depth, setDepth] = useState<(typeof DEPTHS)[number]["id"]>("quick");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResponse | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api<ResearchResponse>("/api/research", { body: { question, depth } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed.");
    } finally {
      setBusy(false);
    }
  };

  const exportReport = () => {
    if (!result) return;
    const sources = result.sources.map((s) => `[${s.index}] ${s.title} — ${s.url}`).join("\n");
    downloadText("omnia-research.md", `# ${question}\n\n${result.answer}\n\n## Sources\n${sources || "_No web sources retrieved._"}\n`);
  };

  return (
    <div>
      <PageHead
        title="Research"
        subtitle="Search the live web, read the pages, and get a synthesized answer with numbered citations. Only sources that were actually retrieved are cited."
        actions={<ConnectionBadge connected={connected} label={connected ? "Web search connected" : "Web search not connected"} />}
      />
      {!connected && (
        <div style={{ marginBottom: 18 }}>
          <Notice kind="warning" title="Live web search is not connected">
            Add <code>BRAVE_SEARCH_API_KEY</code> to enable current, cited research. Without it, answers come from model knowledge and are labeled as unverified.
          </Notice>
        </div>
      )}
      <div className="card stack">
        <label className="field">
          Research question
          <textarea
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What are the latest findings on battery recycling costs in the EU, and how do they compare to the US?"
            maxLength={2000}
          />
        </label>
        <div className="row-between">
          <div className="tabs" role="tablist" aria-label="Research depth">
            {DEPTHS.map((d) => (
              <button key={d.id} role="tab" aria-selected={depth === d.id} title={d.desc} onClick={() => setDepth(d.id)}>
                {d.label}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={run} disabled={busy || question.trim().length < 5} style={{ minHeight: 42 }}>
            {busy ? <Spinner label="Researching…" /> : (<><Icon name="research" size={16} /> Research</>)}
          </button>
        </div>
        <p className="small muted" style={{ margin: 0 }}>{DEPTHS.find((d) => d.id === depth)?.desc}</p>
      </div>

      <div style={{ marginTop: 20 }} className="stack">
        <ErrorText message={error} />
        {result?.notice && <Notice kind={result.webVerified ? "info" : "warning"} title="Verification">{result.notice}</Notice>}
        {result && (
          <div className="studio" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(260px,340px)" }}>
            <div className="card">
              <div className="row-between" style={{ marginBottom: 8 }}>
                <span className="badge">{result.webVerified ? "Web-verified" : "Unverified"} · {result.model}</span>
                <button className="btn btn-sm" onClick={exportReport}><Icon name="download" size={14} />Export report</button>
              </div>
              <Markdown source={result.answer} />
            </div>
            <div className="card stack">
              <h3 style={{ margin: 0 }}>Sources ({result.sources.length})</h3>
              {result.sources.length === 0 && <p className="small muted">No web sources were retrieved for this answer.</p>}
              {result.sources.map((s) => (
                <div key={s.index} className="source">
                  <div className="source-index">{s.index}</div>
                  <div style={{ minWidth: 0 }}>
                    <a className="source-title" href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.title}</a>
                    <div className="source-url">{s.url}</div>
                    <div className="small muted">{s.fetched ? "Page read" : "Search snippet only"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {!result && !busy && (
        <p className="small muted" style={{ marginTop: 16 }}>
          Tip: name the time frame, region and metric you need, and ask for sources. OMNIA separates verified facts from uncertainty.
        </p>
      )}
    </div>
  );
}
