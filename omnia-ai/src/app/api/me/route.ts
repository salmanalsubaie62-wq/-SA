import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { handler, readJson } from "@/lib/http";
import { meSchema } from "@/lib/schemas";

export const GET = handler(async () => {
  const user = await requireUser();
  const row = db().prepare("SELECT memory_enabled FROM users WHERE id = ?").get(user.id) as { memory_enabled: number };
  return NextResponse.json({ user: { ...user, memoryEnabled: Boolean(row.memory_enabled) } });
});

export const PATCH = handler(async (request) => {
  const user = await requireUser();
  const input = meSchema.parse(await readJson(request));
  if (input.language) db().prepare("UPDATE users SET language = ? WHERE id = ?").run(input.language, user.id);
  if (input.name) db().prepare("UPDATE users SET name = ? WHERE id = ?").run(input.name, user.id);
  if (input.memoryEnabled !== undefined)
    db().prepare("UPDATE users SET memory_enabled = ? WHERE id = ?").run(input.memoryEnabled ? 1 : 0, user.id);
  return NextResponse.json({ ok: true });
});
