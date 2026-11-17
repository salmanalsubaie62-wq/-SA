import { NextResponse } from "next/server";
import { createSession, findUserByEmail, HttpError, setSessionCookie, verifyPassword } from "@/lib/auth";
import { handler, readJson } from "@/lib/http";
import { loginSchema } from "@/lib/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export const POST = handler(async (request) => {
  const h = await headers();
  const input = loginSchema.parse(await readJson(request));
  rateLimit(`login:${h.get("x-forwarded-for") ?? "local"}`, 20);
  const user = findUserByEmail(input.email);
  if (!user || !verifyPassword(input.password, user.password_hash)) {
    throw new HttpError(401, "Email or password is incorrect.");
  }
  if (user.disabled) throw new HttpError(403, "This account has been disabled.");
  const session = createSession(user.id);
  await setSessionCookie(session.token, session.expiresAt);
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, language: user.language },
  });
});
