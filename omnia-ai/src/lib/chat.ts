import fs from "node:fs";
import { db, newId, now } from "./db";
import { runChat, type Mode, type RunChatResult } from "./ai/gateway";
import type { ChatTurn, ImagePart } from "./ai/providers";
import { buildSystemPrompt } from "./prompts";

export interface MessageRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider: string | null;
  model: string | null;
  attachments: AttachmentRef[];
  createdAt: number;
}

export interface AttachmentRef {
  id: string;
  name: string;
  kind: "text" | "image" | "unsupported";
}

const HISTORY_LIMIT = 30;
const MAX_HISTORY_CHARS = 120_000;

export function toMessage(row: Record<string, unknown>): MessageRow {
  return {
    id: String(row.id),
    role: row.role as "user" | "assistant",
    content: String(row.content),
    provider: (row.provider as string | null) ?? null,
    model: (row.model as string | null) ?? null,
    attachments: JSON.parse(String(row.attachments ?? "[]")) as AttachmentRef[],
    createdAt: Number(row.created_at),
  };
}

/** Turns stored messages into provider turns, expanding uploaded documents and images. */
function buildTurns(conversationId: string, userId: string): ChatTurn[] {
  const rows = db()
    .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
    .all(conversationId) as Array<Record<string, unknown>>;
  const recent = rows.slice(-HISTORY_LIMIT);
  let budget = MAX_HISTORY_CHARS;
  const turns: ChatTurn[] = [];
  for (const row of recent.reverse()) {
    const msg = toMessage(row);
    let text = msg.content;
    const images: ImagePart[] = [];
    for (const att of msg.attachments) {
      const upload = db()
        .prepare("SELECT name, kind, text, file_path, mime FROM uploads WHERE id = ? AND user_id = ?")
        .get(att.id, userId) as { name: string; kind: string; text: string | null; file_path: string | null; mime: string } | undefined;
      if (!upload) continue;
      if (upload.kind === "text" && upload.text) {
        const body = upload.text.slice(0, Math.max(0, budget));
        budget -= body.length;
        text = `Attached document "${upload.name}":\n<<<DOCUMENT\n${body}\nDOCUMENT>>>\n\n${text}`;
      } else if (upload.kind === "image" && upload.file_path && fs.existsSync(upload.file_path)) {
        images.push({ mime: upload.mime, data: fs.readFileSync(upload.file_path).toString("base64") });
      }
    }
    turns.unshift({ role: msg.role, content: text, images: images.length ? images : undefined });
    // Stop once the budget is spent; older turns are dropped rather than truncated mid-message.
    if (budget <= 0) break;
  }
  // Providers expect the conversation to end with a user turn; ensure the first turn is a user turn.
  while (turns.length && turns[0].role !== "user") turns.shift();
  return turns;
}

export async function answerConversation(opts: {
  userId: string;
  conversationId: string;
  mode: Mode;
  projectId: string | null;
}): Promise<{ message: MessageRow; result: RunChatResult }> {
  const turns = buildTurns(opts.conversationId, opts.userId);
  const hasImages = turns.some((t) => t.images?.length);
  const result = await runChat({
    userId: opts.userId,
    kind: "chat",
    mode: opts.mode,
    system: buildSystemPrompt({ userId: opts.userId, projectId: opts.projectId }),
    messages: turns,
    maxTokens: 4096,
    hasImages,
  });
  const id = newId("msg_");
  const created = now();
  db()
    .prepare(
      "INSERT INTO messages (id, conversation_id, role, content, provider, model, attachments, created_at) VALUES (?, ?, 'assistant', ?, ?, ?, '[]', ?)",
    )
    .run(id, opts.conversationId, result.text, result.provider, result.model, created);
  db().prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(created, opts.conversationId);
  return {
    message: { id, role: "assistant", content: result.text, provider: result.provider, model: result.model, attachments: [], createdAt: created },
    result,
  };
}

export function attachmentRefs(userId: string, ids: string[]): AttachmentRef[] {
  if (!ids.length) return [];
  const refs: AttachmentRef[] = [];
  for (const id of ids) {
    const row = db().prepare("SELECT id, name, kind FROM uploads WHERE id = ? AND user_id = ?").get(id, userId) as
      | { id: string; name: string; kind: "text" | "image" | "unsupported" }
      | undefined;
    if (row) refs.push(row);
  }
  return refs;
}

export function deleteUploadFile(filePath: string | null) {
  if (filePath && fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
}

