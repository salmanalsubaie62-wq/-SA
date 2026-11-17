"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { Markdown } from "./Markdown";
import { ConnectionBadge, EmptyState, ErrorText, Notice, TypingDots, toast } from "./ui";
import { api, downloadText, notifyConversationsChanged } from "@/lib/client/api";
import { useI18n } from "@/lib/client/i18n";
import { speech } from "@/lib/client/speech";

interface Attachment {
  id: string;
  name: string;
  kind: "text" | "image" | "unsupported";
}
interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider: string | null;
  model: string | null;
  attachments: Attachment[];
  createdAt: number;
  pending?: boolean;
  failed?: boolean;
}
interface ModelsInfo {
  modes: Array<{ id: string; label: string; description: string }>;
  capabilities: { chat: boolean; images: boolean; webSearch: boolean };
}

const PROVIDER_LABEL: Record<string, string> = { anthropic: "Claude (Anthropic)", openai: "OpenAI", google: "Gemini (Google)" };

const SUGGESTIONS_EN = [
  "Explain quantum entanglement like I'm a high-school student.",
  "Write a professional email asking a client for a project update.",
  "Solve step by step: a train leaves at 3 pm at 80 km/h…",
  "Brainstorm 10 names for a sustainable coffee brand.",
  "Create a 30-day business plan for a small online bakery.",
  "Write a Python script that renames photos by their date.",
];
const SUGGESTIONS_AR = [
  "اشرح الذكاء الاصطناعي لطالب في المرحلة الثانوية.",
  "اكتب بريدًا إلكترونيًا احترافيًا لطلب تحديث مشروع من العميل.",
  "حل خطوة بخطوة: قطار يغادر الساعة 3 عصرًا بسرعة 80 كم/س…",
  "اقترح 10 أسماء لعلامة قهوة مستدامة.",
  "أنشئ خطة عمل لمدة 30 يومًا لمخبز صغير أونلاين.",
  "اكتب سكربت بايثون يعيد تسمية الصور حسب تاريخها.",
];

export function ChatView({ conversationId, projectId }: { conversationId?: string; projectId?: string | null }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(Boolean(conversationId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("auto");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<ModelsInfo | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const threadEnd = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api<ModelsInfo>("/api/models").then(setInfo).catch(() => setInfo(null));
  }, []);

  const loadConversation = useCallback(async () => {
    if (!conversationId) return;
    try {
      const data = await api<{ conversation: { title: string; mode: string }; messages: Msg[] }>(`/api/conversations/${conversationId}`);
      setTitle(data.conversation.title);
      setMode(data.conversation.mode);
      setMessages(data.messages);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load conversation.");
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setLoading(Boolean(conversationId));
    loadConversation();
  }, [loadConversation, conversationId]);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);

  useEffect(() => () => speech.cancel(), []);

  const noProvider = info !== null && !info.capabilities.chat;

  /* ---------- Sending ---------- */

  const send = async (text: string, files: Attachment[]) => {
    const content = text.trim();
    if (!content && files.length === 0) return;
    if (busy) return;
    setBusy(true);
    setError(null);
    const tempId = `tmp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content, provider: null, model: null, attachments: files, createdAt: Date.now() },
    ]);
    setInput("");
    setAttachments([]);
    try {
      let id = conversationId;
      if (!id) {
        const created = await api<{ id: string }>("/api/conversations", { body: { mode, projectId: projectId ?? null } });
        id = created.id;
      }
      const res = await api<{
        userMessage: Msg;
        assistantMessage: Msg;
        routing: { provider: string; model: string };
      }>(`/api/conversations/${id}/messages`, {
        body: { content, mode, attachmentIds: files.map((f) => f.id) },
      });
      notifyConversationsChanged();
      if (!conversationId) {
        // A brand-new conversation: navigate to its permanent URL. The server already holds both messages.
        router.replace(`/chat/${id}`);
        return;
      }
      setMessages((prev) => [...prev.filter((m) => m.id !== tempId), res.userMessage, res.assistantMessage]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, failed: true } : m)));
      toast(message, "error");
    } finally {
      setBusy(false);
    }
  };

  const retryLast = async () => {
    if (!conversationId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/conversations/${conversationId}/regenerate`, { body: { mode } });
      await loadConversation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not regenerate.");
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async () => {
    if (!conversationId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/conversations/${conversationId}/regenerate`, { body: { mode } });
      await loadConversation();
      notifyConversationsChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not regenerate.";
      setError(message);
      toast(message, "error");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!editing || !conversationId || busy) return;
    const text = editing.text.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/conversations/${conversationId}/edit`, { body: { messageId: editing.id, content: text, mode } });
      setEditing(null);
      await loadConversation();
      notifyConversationsChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update the message.";
      setError(message);
      toast(message, "error");
    } finally {
      setBusy(false);
    }
  };

  const changeMode = async (next: string) => {
    setMode(next);
    if (conversationId) await api(`/api/conversations/${conversationId}`, { method: "PATCH", body: { mode: next } }).catch(() => undefined);
  };

  /* ---------- Attachments ---------- */

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await api<{ file: Attachment & { mime: string } }>("/api/uploads", { form });
        setAttachments((prev) => [...prev, { id: res.file.id, name: res.file.name, kind: res.file.kind }]);
      } catch (err) {
        toast(err instanceof Error ? err.message : "Upload failed", "error");
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  /* ---------- Voice ---------- */

  const toggleListening = () => {
    if (listening) {
      speech.stopListening();
      setListening(false);
      setInterim("");
      return;
    }
    if (!speech.supportsRecognition()) return toast(t("voice_input") + " — not supported in this browser", "error");
    speech.speakCancelIfAny();
    speech.listen(
      lang === "ar" ? "ar-SA" : "en-US",
      (finalText, interimText) => {
        if (finalText) setInput((prev) => (prev ? `${prev} ${finalText}` : finalText));
        setInterim(interimText);
      },
      () => {
        setListening(false);
        setInterim("");
      },
    );
    setListening(true);
  };

  const readAloud = (msg: Msg) => {
    if (speakingId === msg.id) {
      speech.cancel();
      setSpeakingId(null);
      return;
    }
    const ok = speech.speak(msg.content, lang === "ar" || /[؀-ۿ]/.test(msg.content) ? "ar-SA" : "en-US", () => setSpeakingId(null));
    if (ok) setSpeakingId(msg.id);
    else toast("Read-aloud is not supported in this browser.", "error");
  };

  /* ---------- Export & copy ---------- */

  const exportConversation = () => {
    const lines = [`# ${title || "OMNIA conversation"}`, `_Exported ${new Date().toLocaleString()}_`, ""];
    for (const m of messages) {
      lines.push(m.role === "user" ? "## You" : `## OMNIA${m.model ? ` (${m.model})` : ""}`, "", m.content, "");
    }
    downloadText(`${(title || "omnia-conversation").replace(/[^\w-]+/g, "-").slice(0, 60)}.md`, lines.join("\n"));
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(t("copied"), "success");
    } catch {
      toast("Clipboard is not available.", "error");
    }
  };

  const lastAssistantId = useMemo(() => [...messages].reverse().find((m) => m.role === "assistant" && !m.pending)?.id, [messages]);
  const lastIsUser = messages.length > 0 && messages[messages.length - 1].role === "user";

  /* ---------- Render ---------- */

  return (
    <div className="chat-wrap">
      {conversationId && (
        <div className="row-between" style={{ padding: "10px clamp(12px,3vw,28px)", borderBottom: "1px solid var(--border)" }}>
          <div className="row" style={{ minWidth: 0 }}>
            <strong style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "52vw" }}>{title || "…"}</strong>
            {projectId && <span className="badge">Project</span>}
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={exportConversation} disabled={!messages.length}>
              <Icon name="download" size={14} />
              {t("export")}
            </button>
          </div>
        </div>
      )}

      <div className="thread" aria-live="polite">
        <div className="thread-inner">
          {noProvider && (
            <Notice kind="warning" title={t("no_provider_title")}>
              {t("no_provider_body")}
            </Notice>
          )}
          {loadError && <ErrorText message={loadError} />}
          {loading && (
            <div className="stack">
              <div className="skeleton" style={{ height: 56, width: "60%" }} />
              <div className="skeleton" style={{ height: 96, width: "85%", marginInlineStart: "auto" }} />
            </div>
          )}

          {!loading && messages.length === 0 && !conversationId && (
            <div className="empty-hero">
              <div className="brand-mark" style={{ width: 56, height: 56, borderRadius: 18 }}>
                <Icon name="sparkle" size={26} />
              </div>
              <h1 className="gradient-text">{t("empty_title")}</h1>
              <p className="muted" style={{ maxWidth: "58ch", margin: 0 }}>{t("empty_sub")}</p>
              <div className="suggestions">
                {(lang === "ar" ? SUGGESTIONS_AR : SUGGESTIONS_EN).map((s) => (
                  <button key={s} className="suggestion" onClick={() => { setInput(s); textRef.current?.focus(); }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && messages.length === 0 && conversationId && (
            <EmptyState icon="chat" title={t("empty_title")}>{t("empty_sub")}</EmptyState>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`msg msg-${m.role}`}>
              {m.role === "assistant" && <div className="avatar">Ω</div>}
              <div className="bubble" style={{ minWidth: 0 }}>
                {m.role === "user" ? (
                  editing?.id === m.id ? (
                    <div className="stack" style={{ minWidth: "min(480px, 80vw)" }}>
                      <textarea value={editing.text} onChange={(e) => setEditing({ id: m.id, text: e.target.value })} autoFocus />
                      <div className="row" style={{ justifyContent: "flex-end" }}>
                        <button className="btn btn-sm" onClick={() => setEditing(null)}>{t("cancel")}</button>
                        <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={busy}>{t("save")}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {m.content && <div>{m.content}</div>}
                      <AttachmentList items={m.attachments} />
                      {m.failed && <div className="small" style={{ color: "var(--danger)", marginTop: 6 }}>Not delivered. Edit and send again.</div>}
                      {!m.pending && !m.failed && !busy && (
                        <div className="msg-actions" style={{ justifyContent: "flex-end" }}>
                          <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setEditing({ id: m.id, text: m.content })} aria-label={t("edit")} title={t("edit")}>
                            <Icon name="edit" size={14} />
                          </button>
                        </div>
                      )}
                    </>
                  )
                ) : m.pending ? (
                  <TypingDots />
                ) : (
                  <>
                    <Markdown source={m.content} />
                    <div className="msg-meta">
                      {m.provider && <span className="badge badge-ok"><span className="dot" />{PROVIDER_LABEL[m.provider] ?? m.provider}</span>}
                      {m.model && <span className="mono">{m.model}</span>}
                    </div>
                    <div className="msg-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => copy(m.content)}>
                        <Icon name="copy" size={13} />
                        {t("copy")}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => readAloud(m)} aria-pressed={speakingId === m.id}>
                        <Icon name="speaker" size={13} />
                        {speakingId === m.id ? t("stop") : t("read_aloud")}
                      </button>
                      {conversationId && m.id === lastAssistantId && (
                        <button className="btn btn-ghost btn-sm" onClick={regenerate} disabled={busy}>
                          <Icon name="refresh" size={13} />
                          {t("regenerate")}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="msg msg-assistant">
              <div className="avatar">Ω</div>
              <div className="bubble"><TypingDots /></div>
            </div>
          )}

          {error && !busy && <ErrorText message={error} />}
          {conversationId && lastIsUser && !busy && !editing && (
            <div>
              <button className="btn btn-sm" onClick={retryLast}>
                <Icon name="refresh" size={13} />
                {t("regenerate")}
              </button>
            </div>
          )}
          <div ref={threadEnd} />
        </div>
      </div>

      <div className="composer-wrap">
        <div className="composer">
          {(attachments.length > 0 || uploading) && (
            <div style={{ padding: "4px 6px 6px" }}>
              {attachments.map((a) => (
                <span key={a.id} className="attach-chip">
                  <Icon name="file" size={13} />
                  {a.name}
                  <button className="icon-btn" style={{ width: 20, height: 20 }} onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))} aria-label="Remove">
                    <Icon name="close" size={12} />
                  </button>
                </span>
              ))}
              {uploading && <span className="small muted">Uploading…</span>}
            </div>
          )}
          <textarea
            ref={textRef}
            value={listening && interim ? `${input}${input ? " " : ""}${interim}` : input}
            onChange={(e) => {
              setInput(e.target.value);
              e.currentTarget.style.height = "auto";
              e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 240)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input, attachments);
              }
            }}
            placeholder={listening ? t("listening") : t("message_placeholder")}
            rows={1}
            aria-label={t("message_placeholder")}
          />
          <div className="composer-bar">
            <input
              ref={fileRef}
              type="file"
              hidden
              multiple
              accept=".txt,.md,.csv,.tsv,.json,.pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.webp,.gif,.html,.css,.js,.ts,.py,.java,.cpp,.cs,.php,.sql"
              onChange={(e) => uploadFiles(e.target.files)}
            />
            <button className="icon-btn" onClick={() => fileRef.current?.click()} aria-label={t("attach")} title={t("attach")} disabled={uploading}>
              <Icon name="upload" size={18} />
            </button>
            <button className={`icon-btn ${listening ? "recording" : ""}`} onClick={toggleListening} aria-label={t("voice_input")} title={t("voice_input")} aria-pressed={listening}>
              <Icon name="mic" size={18} />
            </button>
            <span className="spacer" />
            <select className="mode-select" value={mode} onChange={(e) => changeMode(e.target.value)} aria-label={t("mode")}>
              {(info?.modes ?? [{ id: "auto", label: "Auto", description: "" }]).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            {busy ? (
              <button className="send-btn" disabled aria-label={t("send")} title={t("send")}>
                <span className="spinner" style={{ borderTopColor: "#ffffff", width: 16, height: 16 }} />
              </button>
            ) : (
              <button className="send-btn" onClick={() => send(input, attachments)} disabled={noProvider || (!input.trim() && attachments.length === 0)} aria-label={t("send")} title={t("send")}>
                <Icon name="send" size={18} />
              </button>
            )}
          </div>
        </div>
        <div className="row" style={{ justifyContent: "center", marginTop: 8, gap: 8 }}>
          {info && <ConnectionBadge connected={info.capabilities.chat} label={info.capabilities.chat ? "AI connected" : "No AI provider"} />}
          <span className="small muted">Enter to send · Shift+Enter for a new line</span>
        </div>
      </div>
    </div>
  );
}

function AttachmentList({ items }: { items: Attachment[] }) {
  if (!items.length) return null;
  return (
    <div>
      {items.map((a) => (
        <div key={a.id}>
          <span className="attach-chip"><Icon name="file" size={13} />{a.name}</span>
          {a.kind === "image" && <img className="attach-thumb" src={`/api/uploads/${a.id}/file`} alt={a.name} loading="lazy" />}
        </div>
      ))}
    </div>
  );
}
