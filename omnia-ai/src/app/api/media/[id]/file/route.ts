import { requireUser, HttpError } from "@/lib/auth";
import { db } from "@/lib/db";
import { handler } from "@/lib/http";
import { mediaPath } from "@/lib/media";
import fs from "node:fs";

type P = { id: string };

export const GET = handler<P>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const row = db().prepare("SELECT file_path FROM media WHERE id = ? AND user_id = ?").get(id, user.id) as
    | { file_path: string | null }
    | undefined;
  if (!row?.file_path) throw new HttpError(404, "File not found.");
  const path = mediaPath(row.file_path);
  if (!fs.existsSync(path)) throw new HttpError(404, "File not found.");
  return new Response(fs.readFileSync(path), { headers: { "content-type": "image/png", "cache-control": "private, max-age=3600" } });
});
