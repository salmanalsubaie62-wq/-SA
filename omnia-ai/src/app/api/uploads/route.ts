import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { requireUser, HttpError } from "@/lib/auth";
import { db, newId, now, UPLOAD_DIR } from "@/lib/db";
import { handler } from "@/lib/http";
import { extractDocument, extensionOf, imageMime, MAX_UPLOAD_BYTES } from "@/lib/documents";
import { rateLimit } from "@/lib/rate-limit";

export const GET = handler(async () => {
  const user = await requireUser();
  const rows = db()
    .prepare("SELECT id, name, mime, size, kind, created_at FROM uploads WHERE user_id = ? ORDER BY created_at DESC LIMIT 200")
    .all(user.id) as Array<Record<string, unknown>>;
  return NextResponse.json({
    files: rows.map((r) => ({ id: r.id, name: r.name, mime: r.mime, size: r.size, kind: r.kind, createdAt: r.created_at })),
  });
});

export const POST = handler(async (request) => {
  const user = await requireUser();
  rateLimit(`upload:${user.id}`, 20);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Choose a file to upload.");
  if (file.size === 0) throw new HttpError(400, "The file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "File is larger than 15 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const extracted = await extractDocument(file.name, buffer).catch((error: unknown) => {
    throw new HttpError(422, error instanceof Error ? `Could not read this file: ${error.message}` : "Could not read this file.");
  });
  if (extracted.kind === "unsupported") throw new HttpError(415, extracted.reason);

  const id = newId("up_");
  let filePath: string | null = null;
  let mime = file.type || "application/octet-stream";
  if (extracted.kind === "image") {
    const ext = extensionOf(file.name);
    mime = imageMime(ext);
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    filePath = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, `${id}.${ext}`);
    fs.writeFileSync(filePath, buffer);
  }
  db()
    .prepare("INSERT INTO uploads (id, user_id, name, mime, size, kind, text, file_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, user.id, path.basename(file.name).slice(0, 200), mime, file.size, extracted.kind, extracted.kind === "text" ? extracted.text : null, filePath, now());
  return NextResponse.json({
    file: { id, name: path.basename(file.name), mime, size: file.size, kind: extracted.kind, chars: extracted.kind === "text" ? extracted.text.length : 0 },
  });
});
