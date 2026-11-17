import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { db, newId, now } from "@/lib/db";
import { handler, readJson } from "@/lib/http";
import { createConversationSchema } from "@/lib/schemas";
import { assertProjectOwner } from "@/lib/guards";

export const GET = handler(async (request) => {
  const user = await requireUser();
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const projectId = url.searchParams.get("projectId");
  const params: Array<string | null> = [user.id];
  let where = "c.user_id = ?";
  if (projectId) {
    where += " AND c.project_id = ?";
    params.push(projectId);
  }
  if (q) {
    where += " AND (c.title LIKE ? OR EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.content LIKE ?))";
    params.push(`%${q}%`, `%${q}%`);
  }
  const rows = db()
    .prepare(
      `SELECT c.id, c.title, c.mode, c.pinned, c.project_id, c.created_at, c.updated_at,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
       FROM conversations c WHERE ${where}
       ORDER BY c.pinned DESC, c.updated_at DESC LIMIT 200`,
    )
    .all(...params) as Array<Record<string, unknown>>;
  return NextResponse.json({
    conversations: rows.map((r) => ({
      id: r.id,
      title: r.title,
      mode: r.mode,
      pinned: Boolean(r.pinned),
      projectId: r.project_id,
      messageCount: Number(r.message_count),
      updatedAt: Number(r.updated_at),
    })),
  });
});

export const POST = handler(async (request) => {
  const user = await requireUser();
  const input = createConversationSchema.parse(await readJson(request));
  if (input.projectId) assertProjectOwner(user.id, input.projectId);
  const id = newId("conv_");
  const t = now();
  db()
    .prepare(
      "INSERT INTO conversations (id, user_id, project_id, title, mode, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
    )
    .run(id, user.id, input.projectId ?? null, input.title || "New conversation", input.mode, t, t);
  return NextResponse.json({ id });
});
