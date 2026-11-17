import { requireUser, HttpError } from "@/lib/auth";
import { db } from "@/lib/db";
import { handler } from "@/lib/http";
import fs from "node:fs";

type P = { id: string };

export const GET = handler<P>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const row = db().prepare("SELECT mime, kind, file_path FROM uploads WHERE id = ? AND user_id = ?").get(id, user.id) as
    | { mime: string; kind: string; file_path: string | null }
    | undefined;
  if (!row || row.kind !== "image" || !row.file_path || !fs.existsSync(row.file_path)) throw new HttpError(404, "File not found.");
  return new Response(fs.readFileSync(row.file_path), {
    headers: { "content-type": row.mime, "cache-control": "private, max-age=3600" },
  });
});
