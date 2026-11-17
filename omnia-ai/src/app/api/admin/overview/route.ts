import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { handler } from "@/lib/http";
import { providerStatus } from "@/lib/ai/providers";
import { imageConnected } from "@/lib/media";
import { searchConnected } from "@/lib/web";
import { MODES } from "@/lib/ai/gateway";

const START = Date.now();

export const GET = handler(async () => {
  await requireAdmin();
  const count = (sql: string) => Number((db().prepare(sql).get() as { c: number }).c);
  const day = Date.now() - 1000 * 60 * 60 * 24;
  const byProvider = db()
    .prepare(
      `SELECT COALESCE(provider,'none') AS provider, COUNT(*) AS calls,
              SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) AS errors,
              SUM(input_tokens) AS input_tokens, SUM(output_tokens) AS output_tokens, AVG(latency_ms) AS avg_latency
       FROM usage_events WHERE created_at > ? GROUP BY provider`,
    )
    .all(day);
  const byKind = db()
    .prepare("SELECT kind, COUNT(*) AS calls FROM usage_events WHERE created_at > ? GROUP BY kind ORDER BY calls DESC")
    .all(day);
  const errors = db()
    .prepare("SELECT kind, provider, model, error, created_at FROM usage_events WHERE status = 'error' ORDER BY created_at DESC LIMIT 25")
    .all();
  const features = db().prepare("SELECT key, enabled FROM feature_flags ORDER BY key").all();
  return NextResponse.json({
    system: {
      uptimeSeconds: Math.round((Date.now() - START) / 1000),
      database: count("SELECT 1 AS c") === 1 ? "ok" : "error",
      nodeVersion: process.version,
    },
    totals: {
      users: count("SELECT COUNT(*) AS c FROM users"),
      conversations: count("SELECT COUNT(*) AS c FROM conversations"),
      messages: count("SELECT COUNT(*) AS c FROM messages"),
      media: count("SELECT COUNT(*) AS c FROM media"),
      projects: count("SELECT COUNT(*) AS c FROM projects"),
    },
    providers: providerStatus(),
    capabilities: { images: imageConnected(), webSearch: searchConnected() },
    modes: MODES,
    usage24h: byProvider,
    kinds24h: byKind,
    recentErrors: errors,
    features,
  });
});
