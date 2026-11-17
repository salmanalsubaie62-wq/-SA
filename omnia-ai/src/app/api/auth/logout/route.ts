import { NextResponse } from "next/server";
import { clearSessionCookie, destroySession, SESSION_COOKIE } from "@/lib/auth";
import { handler } from "@/lib/http";
import { cookies } from "next/headers";

export const POST = handler(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) destroySession(token);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
});
