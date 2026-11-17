import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { db, newId, now } from "./db";

export const SESSION_COOKIE = "omnia_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export type Role = "user" | "admin";
export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  language: "en" | "ar";
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = scryptSync(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return timingSafeEqual(expected, actual);
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function createSession(userId: string): { token: string; expiresAt: number } {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = now() + SESSION_TTL_MS;
  db()
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .run(sha256(token), userId, expiresAt, now());
  return { token, expiresAt };
}

export function destroySession(token: string) {
  db().prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
}

export function userFromToken(token: string | undefined): CurrentUser | null {
  if (!token) return null;
  const row = db()
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.language, u.disabled, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    )
    .get(sha256(token)) as
    | { id: string; email: string; name: string; role: Role; language: "en" | "ar"; disabled: number; expires_at: number }
    | undefined;
  if (!row || row.disabled || row.expires_at < now()) return null;
  return { id: row.id, email: row.email, name: row.name, role: row.role, language: row.language };
}

/** Resolves the signed-in user from the request cookies (server components and route handlers). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  return userFromToken(jar.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(token: string, expiresAt: number) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export function createUser(input: { email: string; name: string; password: string }): CurrentUser {
  const existing = db().prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };
  const role: Role = existing.c === 0 ? "admin" : "user"; // first account becomes the administrator
  const id = newId("usr_");
  db()
    .prepare(
      "INSERT INTO users (id, email, name, password_hash, role, language, created_at) VALUES (?, ?, ?, ?, ?, 'en', ?)",
    )
    .run(id, input.email.toLowerCase(), input.name, hashPassword(input.password), role, now());
  return { id, email: input.email.toLowerCase(), name: input.name, role, language: "en" };
}

export function findUserByEmail(email: string) {
  return db()
    .prepare("SELECT id, email, name, role, language, password_hash, disabled FROM users WHERE email = ?")
    .get(email.toLowerCase()) as
    | { id: string; email: string; name: string; role: Role; language: "en" | "ar"; password_hash: string; disabled: number }
    | undefined;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Throws HttpError(401) when no valid session exists. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Sign in to continue.");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new HttpError(403, "Administrator access required.");
  return user;
}
