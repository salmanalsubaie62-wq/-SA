import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { db } from "@/lib/db";
import { handler, readJson } from "@/lib/http";
import { regenerateSchema } from "@/lib/schemas";
import { answerConversation, toMessage } from "@/lib/chat";
import { rateLimit } from "@/lib/rate-limit";

type P = { id: string };

/** Replaces the latest assistant reply with a freshly generated one. */
export const POST = handler<P>(async (request, { params }) => {
  const user = await requireUser();
  rateLimit(`chat:${user.id}`, 30);
  const { id } = await params;
  const conv = db().prepare("SELECT id, project_id FROM conversations WHERE id = ? AND user_id = ?").get(id, user.id) as
    | { id: string; project_id: string | null }
    | undefined;
  if (!conv) throw new HttpError(404, "Conversation not found.");
  const input = regenerateSchema.parse(await readJson(request));
  const last = db()
    .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(id) as Record<string, unknown> | undefined;
  if (!last) throw new HttpError(400, "There is no message to answer.");
  // A trailing user message (for example after a provider failure) is simply answered again.
  const previous = last.role === "assistant" ? toMessage(last) : null;
  // Keep the old reply until the new one succeeds, so a provider error never destroys content.
  const { message, result } = await answerConversation({
    userId: user.id,
    conversationId: id,
    mode: input.mode,
    projectId: conv.project_id,
  });
  if (previous) db().prepare("DELETE FROM messages WHERE id = ?").run(previous.id);
  return NextResponse.json({
    assistantMessage: message,
    replacedId: previous?.id ?? null,
    routing: { mode: result.mode, routedBy: result.routedBy, reason: result.routeReason, provider: result.provider, model: result.model },
  });
});
