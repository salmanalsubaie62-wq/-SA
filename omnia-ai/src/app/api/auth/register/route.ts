import { NextResponse } from "next/server";
import { createSession, createUser, findUserByEmail, setSessionCookie } from "@/lib/auth";
import { handler, readJson } from "@/lib/http";
import { registerSchema } from "@/lib/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { HttpError } from "@/lib/auth";
import { headers } from "next/headers";

export const POST = handler(async (request) => {
  const h = await headers();
  rateLimit(`register:${h.get("x-forwarded-for") ?? "local"}`, 10);
  const input = registerSchema.parse(await readJson(request));
  if (findUserByEmail(input.email)) throw new HttpError(409, "An account with this email already exists.");
  const user = createUser(input);
  const session = createSession(user.id);
  await setSessionCookie(session.token, session.expiresAt);
  return NextResponse.json({ user });
});
