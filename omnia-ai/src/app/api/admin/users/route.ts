import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { handler } from "@/lib/http";

export const GET = handler(async () => {
  await requireAdmin();
  const rows = db()
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.disabled, u.created_at,
        (SELECT COUNT(*) FROM conversations c WHERE c.user_id = u.id) AS conversations,
        (SELECT COUNT(*) FROM usage_events e WHERE e.user_id = u.id) AS calls
       FROM users u ORDER BY u.created_at DESC LIMIT 500`,
    )
    .all() as Array<Record<string, unknown>>;
  return NextResponse.json({
    users: rows.map((r) => ({
      id: r.id, email: r.email, name: r.name, role: r.role, disabled: Boolean(r.disabled),
      createdAt: r.created_at, conversations: Number(r.conversations), calls: Number(r.calls),
    })),
  });
});
