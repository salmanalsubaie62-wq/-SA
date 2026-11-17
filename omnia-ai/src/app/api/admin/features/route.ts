import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { handler, readJson } from "@/lib/http";
import { featureSchema } from "@/lib/schemas";

export const PUT = handler(async (request) => {
  await requireAdmin();
  const input = featureSchema.parse(await readJson(request));
  db()
    .prepare("INSERT INTO feature_flags (key, enabled) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET enabled = excluded.enabled")
    .run(input.key, input.enabled ? 1 : 0);
  return NextResponse.json({ ok: true });
});
