import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { db, newId, now } from "@/lib/db";
import { handler, readJson } from "@/lib/http";
import { sendMessageSchema } from "@/lib/schemas";
import { answerConversation, attachmentRefs, toMessage } from "@/lib/chat";
import { rateLimit } from "@/lib/rate-limit";

type P = { id: string };

/** Sends a user message and returns the assistant reply, recording the model that actually answered. */
export const POST = handler<P>(async (request, { params }) => {
  const user = await requireUser();
  rateLimit(`chat:${user.id}`, 30);
  const { id } = await params;
  const conv = db().prepare("SELECT id, project_id, title FROM conversations WHERE id = ? AND user_id = ?").get(id, user.id) as
    | { id: string; project_id: string | null; title: string }
    | undefined;
  if (!conv) throw new HttpError(404, "Conversation not found.");
  const input = sendMessageSchema.parse(await readJson(request));
  if (!input.content.trim() && input.attachmentIds.length === 0) throw new HttpError(400, "Write a message or attach a file.");

  const refs = attachmentRefs(user.id, input.attachmentIds);
  const userMsgId = newId("msg_");
  const created = now();
  db()
    .prepare("INSERT INTO messages (id, conversation_id, role, content, attachments, created_at) VALUES (?, ?, 'user', ?, ?, ?)")
    .run(userMsgId, id, input.content, JSON.stringify(refs), created);
  if (conv.title === "New conversation" && input.content.trim()) {
    db().prepare("UPDATE conversations SET title = ? WHERE id = ?").run(input.content.trim().slice(0, 60), id);
  }
  // If the provider fails, the user's message stays saved so nothing is lost; the client offers a retry.
  const { message, result } = await answerConversation({
    userId: user.id,
    conversationId: id,
    mode: input.mode,
    projectId: conv.project_id,
  });
  return NextResponse.json({
    userMessage: toMessage(db().prepare("SELECT * FROM messages WHERE id = ?").get(userMsgId) as Record<string, unknown>),
    assistantMessage: message,
    routing: { mode: result.mode, routedBy: result.routedBy, reason: result.routeReason, provider: result.provider, model: result.model },
  });
});
