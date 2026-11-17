"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { EmptyState, ErrorText, PageHead, toast } from "./ui";
import { api } from "@/lib/client/api";

interface Item {
  id: string;
  content: string;
  enabled: boolean;
  projectId: string | null;
  updatedAt: number;
}

export function MemoryManager() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const data = await api<{ memoryEnabled: boolean; items: Item[] }>("/api/memories");
    setEnabled(data.memoryEnabled);
    setItems(data.items);
  };
  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const toggleMemory = async (next: boolean) => {
    await api("/api/me", { method: "PATCH", body: { memoryEnabled: next } });
    setEnabled(next);
    toast(next ? "Memory is on. OMNIA will use the notes you saved." : "Memory is off. Saved notes are not used.", "success");
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/memories", { body: { content: content.trim(), enabled: true } });
      setContent("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  };

  return (
    <div>
      <PageHead
        title="Memory"
        subtitle="Optional and under your control. OMNIA only uses what you explicitly save, and only while memory is on. Review, edit, switch off or delete any item at any time."
      />
      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <div className="card stack">
          <div className="row-between">
            <div>
              <strong>Use memory in conversations</strong>
              <div className="small muted">Off by default.</div>
            </div>
            <label className="row" style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={Boolean(enabled)} disabled={enabled === null} onChange={(e) => toggleMemory(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#9f9f9f" }} aria-label="Use memory" />
            </label>
          </div>
          <form onSubmit={add} className="stack">
            <label className="field">
              Remember this
              <textarea rows={3} value={content} onChange={(e) => setContent(e.target.value)} maxLength={1000} placeholder="I prefer concise answers with bullet points. My working language is Arabic." />
            </label>
            <div className="notice info" style={{ fontSize: "0.84rem" }}>
              <Icon name="memory" size={16} />
              <div>Do not save passwords, card or bank details, national ID numbers or health information.</div>
            </div>
            <ErrorText message={error} />
            <button className="btn btn-primary" disabled={content.trim().length < 3}>Save memory</button>
          </form>
        </div>

        <div className="stack">
          {items.length === 0 && <EmptyState icon="memory" title="Nothing saved yet">Saved memories appear here. You can edit or delete any of them.</EmptyState>}
          {items.map((m) => (
            <div key={m.id} className="card-tight card stack" style={{ gap: 8 }}>
              {editing?.id === m.id ? (
                <>
                  <textarea rows={2} value={editing.text} onChange={(e) => setEditing({ id: m.id, text: e.target.value })} maxLength={1000} />
                  <div className="row" style={{ justifyContent: "flex-end" }}>
                    <button className="btn btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                    <button className="btn btn-sm btn-primary" onClick={async () => {
                      await api(`/api/memories/${m.id}`, { method: "PATCH", body: { content: editing.text.trim() } });
                      setEditing(null);
                      load();
                    }}>Save</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ opacity: m.enabled ? 1 : 0.5 }}>{m.content}</div>
                  <div className="row-between">
                    <span className="small muted">{m.projectId ? "Project memory" : "Global memory"}</span>
                    <div className="row" style={{ gap: 6 }}>
                      <label className="row small dim" style={{ gap: 6, cursor: "pointer" }}>
                        <input type="checkbox" checked={m.enabled} onChange={async (e) => { await api(`/api/memories/${m.id}`, { method: "PATCH", body: { enabled: e.target.checked } }); load(); }} style={{ accentColor: "#9f9f9f" }} />
                        Active
                      </label>
                      <button className="icon-btn" onClick={() => setEditing({ id: m.id, text: m.content })} aria-label="Edit memory"><Icon name="edit" size={14} /></button>
                      <button className="icon-btn btn-danger" onClick={async () => { if (window.confirm("Delete this memory?")) { await api(`/api/memories/${m.id}`, { method: "DELETE" }); load(); } }} aria-label="Delete memory"><Icon name="trash" size={14} /></button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
