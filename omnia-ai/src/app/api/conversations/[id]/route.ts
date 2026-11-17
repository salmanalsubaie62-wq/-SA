import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { db } from "@/lib/db";
import { handler, readJson } from "@/lib/http";
import { updateConversationSchema } from "@/lib/schemas";
import { toMessage } from "@/lib/chat";
import { assertProjectOwner } from "@/lib/guards";

type P = { id: string };

function owned(userId: string, id: string) {
  const row = db().prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?").get(id, userId) as
    | Record<string, unknown>
    | undefined;
  if (!row) throw new HttpError(404, "Conversation not found.");
  return row;
}

export const GET = handler<P>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const conv = owned(user.id, id);
  const messages = db()
    .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
    .all(id) as Array<Record<string, unknown>>;
  return NextResponse.json({
    conversation: {
      id: conv.id,
      title: conv.title,
      mode: conv.mode,
      pinned: Boolean(conv.pinned),
      projectId: conv.project_id,
    },
    messages: messages.map(toMessage),
  });
});

export const PATCH = handler<P>(async (request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  owned(user.id, id);
  const input = updateConversationSchema.parse(await readJson(request));
  if (input.projectId) assertProjectOwner(user.id, input.projectId);
  if (input.title !== undefined) db().prepare("UPDATE conversations SET title = ? WHERE id = ?").run(input.title, id);
  if (input.pinned !== undefined) db().prepare("UPDATE conversations SET pinned = ? WHERE id = ?").run(input.pinned ? 1 : 0, id);
  if (input.mode !== undefined) db().prepare("UPDATE conversations SET mode = ? WHERE id = ?").run(input.mode, id);
  if (input.projectId !== undefined)
    db().prepare("UPDATE conversations SET project_id = ? WHERE id = ?").run(input.projectId, id);
  return NextResponse.json({ ok: true });
});

export const DELETE = handler<P>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  owned(user.id, id);
  db().prepare("DELETE FROM conversations WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
});
