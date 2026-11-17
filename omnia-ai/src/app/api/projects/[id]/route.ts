import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { db, now } from "@/lib/db";
import { handler, readJson } from "@/lib/http";
import { projectUpdateSchema } from "@/lib/schemas";
import { logActivity } from "@/lib/guards";

type P = { id: string };

function owned(userId: string, id: string) {
  const row = db().prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?").get(id, userId) as
    | Record<string, unknown>
    | undefined;
  if (!row) throw new HttpError(404, "Project not found.");
  return row;
}

export const GET = handler<P>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const p = owned(user.id, id);
  const conversations = db()
    .prepare("SELECT id, title, updated_at FROM conversations WHERE project_id = ? AND user_id = ? ORDER BY updated_at DESC LIMIT 50")
    .all(id, user.id);
  const media = db()
    .prepare("SELECT id, kind, title, status, file_path, created_at FROM media WHERE project_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 100")
    .all(id, user.id) as Array<Record<string, unknown>>;
  const activity = db()
    .prepare("SELECT action, detail, created_at FROM project_activity WHERE project_id = ? ORDER BY created_at DESC LIMIT 50")
    .all(id);
  const memories = db()
    .prepare("SELECT id, content, enabled FROM memories WHERE project_id = ? AND user_id = ? ORDER BY updated_at DESC")
    .all(id, user.id);
  return NextResponse.json({
    project: {
      id: p.id,
      name: p.name,
      kind: p.kind,
      description: p.description,
      notes: p.notes,
      tasks: JSON.parse(String(p.tasks)),
      createdAt: p.created_at,
    },
    conversations,
    media: media.map((m) => ({
      id: m.id,
      kind: m.kind,
      title: m.title,
      status: m.status,
      url: m.file_path ? `/api/media/${m.id}/file` : null,
      createdAt: m.created_at,
    })),
    activity,
    memories,
  });
});

export const PATCH = handler<P>(async (request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const p = owned(user.id, id);
  const input = projectUpdateSchema.parse(await readJson(request));
  const changes: string[] = [];
  if (input.name !== undefined) db().prepare("UPDATE projects SET name = ? WHERE id = ?").run(input.name, id);
  if (input.kind !== undefined) db().prepare("UPDATE projects SET kind = ? WHERE id = ?").run(input.kind, id);
  if (input.description !== undefined) db().prepare("UPDATE projects SET description = ? WHERE id = ?").run(input.description, id);
  if (input.notes !== undefined) {
    db().prepare("UPDATE projects SET notes = ? WHERE id = ?").run(input.notes, id);
    changes.push("notes updated");
  }
  if (input.tasks !== undefined) {
    db().prepare("UPDATE projects SET tasks = ? WHERE id = ?").run(JSON.stringify(input.tasks), id);
    const before = JSON.parse(String(p.tasks)) as Array<{ done: boolean }>;
    const done = input.tasks.filter((t) => t.done).length;
    changes.push(`tasks: ${done}/${input.tasks.length} done (was ${before.filter((t) => t.done).length})`);
  }
  if (input.name !== undefined || input.description !== undefined || input.kind !== undefined) changes.push("details updated");
  db().prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(now(), id);
  if (changes.length) logActivity(id, user.id, "updated", changes.join("; "));
  return NextResponse.json({ ok: true });
});

export const DELETE = handler<P>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  owned(user.id, id);
  db().prepare("DELETE FROM projects WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
});
