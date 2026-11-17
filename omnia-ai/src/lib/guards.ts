import { HttpError } from "./auth";
import { db, newId, now } from "./db";

export function assertProjectOwner(userId: string, projectId: string) {
  const row = db().prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?").get(projectId, userId);
  if (!row) throw new HttpError(404, "Project not found.");
}

export function logActivity(projectId: string, userId: string, action: string, detail: string) {
  db()
    .prepare("INSERT INTO project_activity (id, project_id, user_id, action, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(newId("act_"), projectId, userId, action, detail, now());
}

export function assertProjectExists(userId: string, projectId: string): boolean {
  return Boolean(db().prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?").get(projectId, userId));
}
