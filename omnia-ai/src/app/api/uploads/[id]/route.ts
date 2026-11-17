import { NextResponse } from "next/server";
import fs from "node:fs";
import { requireUser, HttpError } from "@/lib/auth";
import { db } from "@/lib/db";
import { handler } from "@/lib/http";

type P = { id: string };

export const DELETE = handler<P>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const row = db().prepare("SELECT file_path FROM uploads WHERE id = ? AND user_id = ?").get(id, user.id) as
    | { file_path: string | null }
    | undefined;
  if (!row) throw new HttpError(404, "File not found.");
  if (row.file_path && fs.existsSync(row.file_path)) fs.rmSync(row.file_path, { force: true });
  db().prepare("DELETE FROM uploads WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
});
