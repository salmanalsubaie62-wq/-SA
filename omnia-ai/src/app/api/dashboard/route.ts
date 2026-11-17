import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { handler } from "@/lib/http";
import { providerStatus } from "@/lib/ai/providers";
import { imageConnected, videoRenderConnected } from "@/lib/media";
import { searchConnected } from "@/lib/web";

export const GET = handler(async () => {
  const user = await requireUser();
  const count = (sql: string, ...args: unknown[]) => Number((db().prepare(sql).get(...(args as never[])) as { c: number }).c);
  const since = Date.now() - 1000 * 60 * 60 * 24 * 14;
  const usage = db()
    .prepare(
      `SELECT COALESCE(model, 'none') AS model, COALESCE(provider, 'none') AS provider, COUNT(*) AS calls,
              SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) AS ok_calls, SUM(input_tokens) AS input_tokens, SUM(output_tokens) AS output_tokens
       FROM usage_events WHERE user_id = ? AND created_at > ? GROUP BY provider, model ORDER BY calls DESC LIMIT 12`,
    )
    .all(user.id, since);
  const recent = db()
    .prepare(
      `SELECT * FROM (
         SELECT 'chat' AS type, c.id AS id, c.title AS title, c.updated_at AS at FROM conversations c WHERE c.user_id = ?
         UNION ALL SELECT 'image', m.id, m.title, m.created_at FROM media m WHERE m.user_id = ? AND m.kind = 'image'
         UNION ALL SELECT 'video', m.id, m.title, m.created_at FROM media m WHERE m.user_id = ? AND m.kind = 'video_plan'
         UNION ALL SELECT 'document', u.id, u.name, u.created_at FROM uploads u WHERE u.user_id = ?
         UNION ALL SELECT 'project', p.id, p.name, p.updated_at FROM projects p WHERE p.user_id = ?
       ) ORDER BY at DESC LIMIT 12`,
    )
    .all(user.id, user.id, user.id, user.id, user.id);
  return NextResponse.json({
    counts: {
      conversations: count("SELECT COUNT(*) AS c FROM conversations WHERE user_id = ?", user.id),
      messages: count("SELECT COUNT(*) AS c FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.user_id = ?", user.id),
      images: count("SELECT COUNT(*) AS c FROM media WHERE user_id = ? AND kind = 'image'", user.id),
      videoPlans: count("SELECT COUNT(*) AS c FROM media WHERE user_id = ? AND kind = 'video_plan'", user.id),
      projects: count("SELECT COUNT(*) AS c FROM projects WHERE user_id = ?", user.id),
      documents: count("SELECT COUNT(*) AS c FROM uploads WHERE user_id = ?", user.id),
    },
    usage,
    recent,
    providers: providerStatus(),
    tools: [
      { id: "chat", connected: providerStatus().some((p) => p.connected) },
      { id: "images", connected: imageConnected() },
      { id: "video", connected: videoRenderConnected() },
      { id: "research", connected: searchConnected() },
    ],
  });
});
