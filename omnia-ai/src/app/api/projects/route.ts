import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db, newId, now } from "@/lib/db";
import { handler, readJson } from "@/lib/http";
import { projectSchema } from "@/lib/schemas";
import { logActivity } from "@/lib/guards";

export const GET = handler(async () => {
  const user = await requireUser();
  const rows = db()
    .prepare(
      `SELECT p.*,
        (SELECT COUNT(*) FROM conversations c WHERE c.project_id = p.id) AS conversation_count,
        (SELECT COUNT(*) FROM media m WHERE m.project_id = p.id) AS media_count
       FROM projects p WHERE p.user_id = ? ORDER BY p.updated_at DESC`,
    )
    .all(user.id) as Array<Record<string, unknown>>;
  return NextResponse.json({
    projects: rows.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      description: r.description,
      conversations: Number(r.conversation_count),
      media: Number(r.media_count),
      updatedAt: r.updated_at,
    })),
  });
});

export const POST = handler(async (request) => {
  const user = await requireUser();
  const input = projectSchema.parse(await readJson(request));
  const id = newId("prj_");
  const t = now();
  db()
    .prepare("INSERT INTO projects (id, user_id, name, kind, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, user.id, input.name, input.kind, input.description, t, t);
  logActivity(id, user.id, "created", `Project "${input.name}" created`);
  return NextResponse.json({ id });
});
