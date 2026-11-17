import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { db } from "@/lib/db";
import { handler, readJson } from "@/lib/http";
import { editMessageSchema } from "@/lib/schemas";
import { answerConversation, toMessage } from "@/lib/chat";
import { rateLimit } from "@/lib/rate-limit";

type P = { id: string };

/** Edits a user message, drops everything after it, and generates a new reply. */
export const POST = handler<P>(async (request, { params }) => {
  const user = await requireUser();
  rateLimit(`chat:${user.id}`, 30);
  const { id } = await params;
  const conv = db().prepare("SELECT id, project_id FROM conversations WHERE id = ? AND user_id = ?").get(id, user.id) as
    | { id: string; project_id: string | null }
    | undefined;
  if (!conv) throw new HttpError(404, "Conversation not found.");
  const input = editMessageSchema.parse(await readJson(request));
  const target = db().prepare("SELECT * FROM messages WHERE id = ? AND conversation_id = ?").get(input.messageId, id) as
    | Record<string, unknown>
    | undefined;
  if (!target || target.role !== "user") throw new HttpError(404, "Message not found.");

  db()
    .prepare("DELETE FROM messages WHERE conversation_id = ? AND created_at > ?")
    .run(id, Number(target.created_at));
  db().prepare("DELETE FROM messages WHERE id = ? AND conversation_id = ?").run(input.messageId, id);
  const { randomUUID } = await import("node:crypto");
  const newId = `msg_${randomUUID().replace(/-/g, "")}`;
  db()
    .prepare("INSERT INTO messages (id, conversation_id, role, content, attachments, created_at) VALUES (?, ?, 'user', ?, ?, ?)")
    .run(newId, id, input.content, String(target.attachments ?? "[]"), Number(target.created_at));

  const { message, result } = await answerConversation({
    userId: user.id,
    conversationId: id,
    mode: input.mode,
    projectId: conv.project_id,
  });
  return NextResponse.json({
    userMessage: toMessage(db().prepare("SELECT * FROM messages WHERE id = ?").get(newId) as Record<string, unknown>),
    assistantMessage: message,
    routing: { mode: result.mode, routedBy: result.routedBy, reason: result.routeReason, provider: result.provider, model: result.model },
  });
});
