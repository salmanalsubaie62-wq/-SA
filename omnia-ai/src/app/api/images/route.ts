import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { db, newId, now } from "@/lib/db";
import { handler, readJson } from "@/lib/http";
import { imageSchema } from "@/lib/schemas";
import { generateImages, imageConnected, imageModel } from "@/lib/media";
import { assertProjectOwner } from "@/lib/guards";
import { rateLimit } from "@/lib/rate-limit";

export const GET = handler(async () => {
  const user = await requireUser();
  const rows = db()
    .prepare("SELECT id, title, prompt, params, file_path, status, model, error, created_at FROM media WHERE user_id = ? AND kind = 'image' ORDER BY created_at DESC LIMIT 200")
    .all(user.id) as Array<Record<string, unknown>>;
  return NextResponse.json({
    connected: imageConnected(),
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      prompt: r.prompt,
      params: JSON.parse(String(r.params)),
      status: r.status,
      model: r.model,
      error: r.error,
      createdAt: r.created_at,
      url: r.file_path ? `/api/media/${r.id}/file` : null,
    })),
  });
});

export const POST = handler(async (request) => {
  const user = await requireUser();
  rateLimit(`image:${user.id}`, 6);
  const input = imageSchema.parse(await readJson(request));
  if (!imageConnected()) {
    throw new HttpError(503, "Image generation is not connected. Add OPENAI_API_KEY to the server environment to enable it.");
  }
  if (input.projectId) assertProjectOwner(user.id, input.projectId);
  const params = { aspect: input.aspect, style: input.style ?? null, lighting: input.lighting ?? null, camera: input.camera ?? null, count: input.count };
  const created = await generateImages({ userId: user.id, ...input, count: input.count });
  const items = [];
  for (const image of created) {
    const id = image.id;
    const file = image.file;
    db()
      .prepare("INSERT INTO media (id, user_id, project_id, kind, title, prompt, params, file_path, status, provider, model, created_at) VALUES (?, ?, ?, 'image', ?, ?, ?, ?, 'ready', 'openai', ?, ?)")
      .run(id, user.id, input.projectId ?? null, input.prompt.slice(0, 80), input.prompt, JSON.stringify(params), file, imageModel(), now());
    items.push({ id, url: `/api/media/${id}/file`, createdAt: now() });
  }
  return NextResponse.json({ items, model: imageModel(), provider: "openai" });
});
