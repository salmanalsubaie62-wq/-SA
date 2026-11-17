"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Markdown } from "./Markdown";
import { ConnectionBadge, EmptyState, ErrorText, Notice, PageHead, Spinner, toast } from "./ui";
import { api, downloadText } from "@/lib/client/api";

interface FileRow {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: string;
  createdAt: number;
}

const TASKS = [
  { id: "summarize", label: "Summarize" },
  { id: "extract", label: "Extract key info" },
  { id: "analyze_table", label: "Analyze table" },
  { id: "explain", label: "Explain simply" },
  { id: "report", label: "Create report" },
  { id: "translate", label: "Translate" },
  { id: "question", label: "Ask a question" },
] as const;

const FORMATS = ".pdf, .docx, .xlsx, .pptx, .txt, .md, .csv, .json, code files, images";

export function DocumentsView({ connected }: { connected: boolean }) {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [task, setTask] = useState<(typeof TASKS)[number]["id"]>("summarize");
  const [question, setQuestion] = useState("");
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<{ text: string; model: string; provider: string } | null>(null);

  const load = async () => {
    const data = await api<{ files: FileRow[] }>("/api/uploads");
    setFiles(data.files);
  };
  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    setUploading(true);
    setError(null);
    for (const file of Array.from(list)) {
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await api<{ file: FileRow }>("/api/uploads", { form });
        setSelected(res.file.id);
        toast(`${res.file.name} is ready`, "success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      }
    }
    setUploading(false);
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this file?")) return;
    await api(`/api/uploads/${id}`, { method: "DELETE" }).catch(() => undefined);
    if (selected === id) setSelected(null);
    await load();
  };

  const analyze = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await api<{ answer: string; routing: { model: string; provider: string } }>(`/api/uploads/${selected}/ask`, {
        body: { task, question, language, mode: "auto" },
      });
      setAnswer({ text: res.answer, model: res.routing.model, provider: res.routing.provider });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  };

  const current = files.find((f) => f.id === selected);
  const isImage = current?.kind === "image";

  return (
    <div>
      <PageHead
        title="Document Intelligence"
        subtitle="Upload a document, spreadsheet, presentation or image. OMNIA works from the file's actual content: summaries, extraction, table analysis, translation and reports."
        actions={<ConnectionBadge connected={connected} label={connected ? "AI connected" : "No AI provider"} />}
      />
      <div className="studio">
        <div className="stack">
          <label
            className="card"
            style={{ textAlign: "center", cursor: "pointer", borderStyle: "dashed", padding: 28 }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files); }}
          >
            <div className="empty-icon" style={{ margin: "0 auto 12px" }}><Icon name="upload" size={24} /></div>
            <strong>{uploading ? "Reading file…" : "Drop a file or click to upload"}</strong>
            <div className="small muted" style={{ marginTop: 6 }}>Up to 15 MB · {FORMATS}</div>
            <input type="file" multiple hidden accept=".pdf,.docx,.xlsx,.pptx,.txt,.md,.csv,.tsv,.json,.html,.css,.js,.ts,.py,.java,.cpp,.cs,.php,.sql,.png,.jpg,.jpeg,.webp,.gif" onChange={(e) => upload(e.target.files)} disabled={uploading} />
          </label>

          <div className="card stack" style={{ padding: 14 }}>
            <h3 style={{ margin: 0 }}>Your files</h3>
            {files.length === 0 && <p className="small muted" style={{ margin: 0 }}>No files yet.</p>}
            {files.map((f) => (
              <div key={f.id} className="row-between" style={{ padding: "8px 10px", borderRadius: 12, background: selected === f.id ? "var(--surface-3)" : "transparent", border: "1px solid " + (selected === f.id ? "var(--border-strong)" : "transparent") }}>
                <button onClick={() => { setSelected(f.id); setAnswer(null); }} style={{ all: "unset", cursor: "pointer", minWidth: 0, flex: 1 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.9rem" }}>{f.name}</div>
                  <div className="small muted">{(f.size / 1024).toFixed(0)} KB · {f.kind}</div>
                </button>
                <button className="icon-btn btn-danger" onClick={() => remove(f.id)} aria-label="Delete file"><Icon name="trash" size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="stack">
          {!selected || !current ? (
            <EmptyState icon="docs" title="Select a file to analyze">
              OMNIA extracts the text from PDFs, Word, Excel and PowerPoint files and sends it to your connected model along with your request.
            </EmptyState>
          ) : (
            <div className="card stack">
              <div className="row-between">
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{current.name}</h2>
                  <div className="small muted">{current.mime} · {(current.size / 1024).toFixed(0)} KB</div>
                </div>
              </div>
              {isImage ? (
                <div className="stack">
                  <img src={`/api/uploads/${current.id}/file`} alt={current.name} style={{ maxHeight: 360, objectFit: "contain", borderRadius: 14, border: "1px solid var(--border)" }} />
                  <Notice kind="info">Image analysis (reading text in images, describing content) is done in Super Chat: attach this image there and ask your question.</Notice>
                </div>
              ) : (
                <>
                  <div className="chips" role="group" aria-label="Analysis task">
                    {TASKS.map((t) => (
                      <button key={t.id} className="chip" aria-pressed={task === t.id} onClick={() => setTask(t.id)}>{t.label}</button>
                    ))}
                  </div>
                  {(task === "question" || task === "extract") && (
                    <label className="field">
                      {task === "question" ? "Your question about the document" : "What should be extracted? (optional)"}
                      <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={2000} placeholder={task === "question" ? "What is the payment deadline?" : "Dates, amounts and responsible parties"} />
                    </label>
                  )}
                  <div className="row-between">
                    <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      Output language
                      <select value={language} onChange={(e) => setLanguage(e.target.value as "en" | "ar")} style={{ width: "auto" }}>
                        <option value="en">English</option>
                        <option value="ar">العربية</option>
                      </select>
                    </label>
                    <button className="btn btn-primary" onClick={analyze} disabled={busy || !connected || (task === "question" && !question.trim())}>
                      {busy ? <Spinner label="Analyzing…" /> : "Analyze document"}
                    </button>
                  </div>
                  {!connected && <Notice kind="warning">Connect an AI provider to analyze documents.</Notice>}
                </>
              )}
              <ErrorText message={error} />
              {answer && (
                <div className="stack">
                  <div className="row-between">
                    <span className="badge badge-ok"><span className="dot" />{answer.provider} · <span className="mono">{answer.model}</span></span>
                    <button className="btn btn-sm" onClick={() => downloadText(`${current.name}-analysis.md`, answer.text)}><Icon name="download" size={14} />Export</button>
                  </div>
                  <div className="card-tight card" style={{ background: "var(--bg-elev)" }}>
                    <Markdown source={answer.text} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
