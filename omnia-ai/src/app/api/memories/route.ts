import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db, newId, now } from "@/lib/db";
import { handler, readJson } from "@/lib/http";
import { memorySchema } from "@/lib/schemas";
import { assertProjectOwner } from "@/lib/guards";

export const GET = handler(async () => {
  const user = await requireUser();
  const rows = db()
    .prepare("SELECT id, content, enabled, project_id, created_at, updated_at FROM memories WHERE user_id = ? ORDER BY updated_at DESC")
    .all(user.id) as Array<Record<string, unknown>>;
  const settings = db().prepare("SELECT memory_enabled FROM users WHERE id = ?").get(user.id) as { memory_enabled: number };
  return NextResponse.json({
    memoryEnabled: Boolean(settings.memory_enabled),
    items: rows.map((r) => ({
      id: r.id,
      content: r.content,
      enabled: Boolean(r.enabled),
      projectId: r.project_id,
      updatedAt: r.updated_at,
    })),
  });
});

export const POST = handler(async (request) => {
  const user = await requireUser();
  const input = memorySchema.parse(await readJson(request));
  if (input.projectId) assertProjectOwner(user.id, input.projectId);
  const id = newId("mem_");
  const t = now();
  db()
    .prepare("INSERT INTO memories (id, user_id, project_id, content, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, user.id, input.projectId ?? null, input.content, input.enabled ? 1 : 0, t, t);
  return NextResponse.json({ id });
});
