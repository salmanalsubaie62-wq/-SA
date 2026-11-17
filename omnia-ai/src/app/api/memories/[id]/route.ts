import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { db, now } from "@/lib/db";
import { handler, readJson } from "@/lib/http";
import { memoryUpdateSchema } from "@/lib/schemas";

type P = { id: string };

function owned(userId: string, id: string) {
  const row = db().prepare("SELECT id FROM memories WHERE id = ? AND user_id = ?").get(id, userId);
  if (!row) throw new HttpError(404, "Memory not found.");
}

export const PATCH = handler<P>(async (request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  owned(user.id, id);
  const input = memoryUpdateSchema.parse(await readJson(request));
  if (input.content !== undefined) db().prepare("UPDATE memories SET content = ?, updated_at = ? WHERE id = ?").run(input.content, now(), id);
  if (input.enabled !== undefined) db().prepare("UPDATE memories SET enabled = ?, updated_at = ? WHERE id = ?").run(input.enabled ? 1 : 0, now(), id);
  return NextResponse.json({ ok: true });
});

export const DELETE = handler<P>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  owned(user.id, id);
  db().prepare("DELETE FROM memories WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
});
