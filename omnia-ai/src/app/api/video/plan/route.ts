import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db, newId, now } from "@/lib/db";
import { handler, readJson } from "@/lib/http";
import { videoPlanSchema } from "@/lib/schemas";
import { planVideo, videoRenderConnected } from "@/lib/media";
import { assertProjectOwner } from "@/lib/guards";
import { rateLimit } from "@/lib/rate-limit";

export const GET = handler(async () => {
  const user = await requireUser();
  const rows = db()
    .prepare("SELECT id, title, prompt, params, status, model, created_at FROM media WHERE user_id = ? AND kind = 'video_plan' ORDER BY created_at DESC LIMIT 100")
    .all(user.id) as Array<Record<string, unknown>>;
  return NextResponse.json({
    renderConnected: videoRenderConnected(),
    plans: rows.map((r) => ({
      id: r.id,
      title: r.title,
      idea: r.prompt,
      status: r.status,
      model: r.model,
      createdAt: r.created_at,
      plan: JSON.parse(String(r.params)),
    })),
  });
});

export const POST = handler(async (request) => {
  const user = await requireUser();
  rateLimit(`video:${user.id}`, 6);
  const input = videoPlanSchema.parse(await readJson(request));
  if (input.projectId) assertProjectOwner(user.id, input.projectId);
  const plan = await planVideo({ userId: user.id, ...input });
  const id = newId("vid_");
  // Storyboard is saved even though rendering is not connected yet: the status says so explicitly.
  db()
    .prepare("INSERT INTO media (id, user_id, project_id, kind, title, prompt, params, file_path, status, provider, model, created_at) VALUES (?, ?, ?, 'video_plan', ?, ?, ?, NULL, ?, NULL, NULL, ?)")
    .run(
      id,
      user.id,
      input.projectId ?? null,
      plan.title.slice(0, 120),
      input.idea,
      JSON.stringify({ ...plan, durationSeconds: input.durationSeconds, aspect: input.aspect }),
      videoRenderConnected() ? "planned" : "storyboard_only",
      now(),
    );
  return NextResponse.json({ id, plan, renderConnected: videoRenderConnected() });
});
