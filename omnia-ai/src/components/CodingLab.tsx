"use client";

import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import { Markdown } from "./Markdown";
import { ConnectionBadge, ErrorText, PageHead, Spinner, toast } from "./ui";
import { api, downloadText } from "@/lib/client/api";

const LANGUAGES = ["javascript", "typescript", "python", "html", "css", "java", "c++", "c#", "php", "sql", "react", "next.js", "node.js"];
const ACTIONS = [
  { id: "generate", label: "Generate" },
  { id: "debug", label: "Debug" },
  { id: "explain", label: "Explain" },
  { id: "refactor", label: "Refactor" },
  { id: "tests", label: "Write tests" },
] as const;

const STARTER = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: system-ui; display: grid; place-items: center; height: 100vh; margin: 0; background: #131313; color: #eeeeee; }
      button { padding: 12px 22px; border-radius: 12px; border: 0; background: linear-gradient(135deg,#9f9f9f,#a1a1a1); color: #ffffff; font-size: 16px; cursor: pointer; }
    </style>
  </head>
  <body>
    <button id="b">Click me</button>
    <script>
      let n = 0;
      document.getElementById('b').onclick = () => { n++; event.target.textContent = 'Clicked ' + n; };
    </script>
  </body>
</html>`;

export function CodingLab({ connected }: { connected: boolean }) {
  const [language, setLanguage] = useState("html");
  const [action, setAction] = useState<(typeof ACTIONS)[number]["id"]>("generate");
  const [code, setCode] = useState(STARTER);
  const [request, setRequest] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<{ text: string; model: string; provider: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const previewable = ["html", "css", "javascript"].includes(language);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ answer: string; routing: { model: string; provider: string } }>("/api/coding", {
        body: { action, language, code, request },
      });
      setAnswer({ text: res.answer, model: res.routing.model, provider: res.routing.provider });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const srcDoc = useMemo(() => {
    if (!preview) return "";
    return preview;
  }, [preview]);

  const runPreview = () => {
    if (language === "html") setPreview(code);
    else if (language === "css") setPreview(`<!doctype html><html><head><style>${code}</style></head><body><h1>Heading</h1><p>Sample paragraph with <a href="#">a link</a>.</p><button>Button</button></body></html>`);
    else setPreview(`<!doctype html><html><body style="font-family:system-ui;background:#ffffff;color:#111111"><pre id="out"></pre><script>
      const log = (...a) => { document.getElementById('out').textContent += a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ') + '\\n'; };
      console.log = log;
      try { ${code.replace(/<\/script/gi, "<\\/script")} } catch (e) { log('Error: ' + e.message); }
    </script></body></html>`);
    toast("Preview updated", "success");
  };

  return (
    <div>
      <PageHead
        title="Coding Lab"
        subtitle="Generate, debug, explain, refactor and test code. Web code runs in an isolated preview sandbox. Other languages are analyzed, never executed on the server."
        actions={<ConnectionBadge connected={connected} label={connected ? "AI connected" : "No AI provider"} />}
      />
      <div className="card stack" style={{ marginBottom: 18 }}>
        <div className="row-between">
          <div className="row">
            <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              Language
              <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: "auto", minWidth: 160 }}>
                {LANGUAGES.map((l) => (<option key={l} value={l}>{l}</option>))}
              </select>
            </label>
          </div>
          <div className="tabs" role="tablist">
            {ACTIONS.map((a) => (
              <button key={a.id} role="tab" aria-selected={action === a.id} onClick={() => setAction(a.id)}>{a.label}</button>
            ))}
          </div>
        </div>
        <label className="field">
          What do you want? (optional for debug/explain)
          <input value={request} onChange={(e) => setRequest(e.target.value)} placeholder="A responsive pricing table with a monthly/yearly toggle" maxLength={4000} />
        </label>
      </div>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <div className="stack">
          <div className="row-between">
            <strong>Code</strong>
            <div className="row" style={{ gap: 6 }}>
              {previewable && <button className="btn btn-sm" onClick={runPreview}><Icon name="video" size={14} />Run preview</button>}
              <button className="btn btn-sm" onClick={() => downloadText(`omnia-code.${ext(language)}`, code, "text/plain")}><Icon name="download" size={14} />Download</button>
              <button className="btn btn-sm btn-primary" onClick={run} disabled={busy || !connected}>
                {busy ? <Spinner label="Working…" /> : "Run with AI"}
              </button>
            </div>
          </div>
          <textarea className="editor" value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} aria-label="Code editor" />
          <ErrorText message={error} />
          {!connected && <p className="small muted">AI actions need a connected provider. Previews work without one.</p>}
        </div>

        <div className="stack">
          {previewable && preview !== null && (
            <div className="stack">
              <strong>Preview (sandboxed, no network or access to OMNIA)</strong>
              <iframe className="frame" title="Code preview" sandbox="allow-scripts" srcDoc={srcDoc} />
            </div>
          )}
          {!previewable && (
            <div className="notice info"><Icon name="code" size={18} /><div>Server-side execution of {language} is not enabled. OMNIA can generate, debug and explain it; run it in your own environment.</div></div>
          )}
          {answer && (
            <div className="card stack">
              <div className="row-between">
                <span className="badge badge-ok"><span className="dot" />{answer.provider} · <span className="mono">{answer.model}</span></span>
                <button className="btn btn-sm" onClick={() => downloadText("omnia-answer.md", answer.text)}><Icon name="download" size={14} />Export</button>
              </div>
              <Markdown source={answer.text} />
            </div>
          )}
          {!answer && previewable && preview === null && (
            <div className="empty"><h3>Live preview</h3><p className="muted" style={{ margin: 0 }}>Press “Run preview” to render HTML, CSS or JavaScript output in an isolated frame.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

function ext(lang: string) {
  const map: Record<string, string> = { javascript: "js", typescript: "ts", python: "py", html: "html", css: "css", java: "java", "c++": "cpp", "c#": "cs", php: "php", sql: "sql", react: "jsx", "next.js": "tsx", "node.js": "js" };
  return map[lang] ?? "txt";
}
