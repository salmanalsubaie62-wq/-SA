import { NextResponse } from "next/server";
import { requireAdmin, HttpError } from "@/lib/auth";
import { db } from "@/lib/db";
import { handler, readJson } from "@/lib/http";
import { adminUserSchema } from "@/lib/schemas";

type P = { id: string };

export const PATCH = handler<P>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const input = adminUserSchema.parse(await readJson(request));
  if (id === admin.id && (input.disabled || input.role === "user")) {
    throw new HttpError(400, "You cannot disable or demote your own administrator account.");
  }
  const target = db().prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!target) throw new HttpError(404, "User not found.");
  if (input.role) db().prepare("UPDATE users SET role = ? WHERE id = ?").run(input.role, id);
  if (input.disabled !== undefined) {
    db().prepare("UPDATE users SET disabled = ? WHERE id = ?").run(input.disabled ? 1 : 0, id);
    if (input.disabled) db().prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  }
  return NextResponse.json({ ok: true });
});
