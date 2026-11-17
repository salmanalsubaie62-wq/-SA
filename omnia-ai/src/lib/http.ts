import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";
import { ProviderError } from "./ai/providers";
import { NoProviderConnectedError } from "./ai/gateway";

/** Turns thrown errors into consistent JSON responses. Never leaks stack traces or keys. */
export function errorResponse(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return NextResponse.json(
      { error: `Invalid input: ${first?.path.join(".") || "body"} — ${first?.message ?? "invalid"}` },
      { status: 400 },
    );
  }
  if (error instanceof NoProviderConnectedError) {
    return NextResponse.json({ error: error.message, code: "NO_PROVIDER" }, { status: 503 });
  }
  if (error instanceof ProviderError) {
    return NextResponse.json({ error: error.message, code: "PROVIDER_ERROR" }, { status: 502 });
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  console.error("[omnia]", message);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export async function readJson<T>(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

type Ctx<P> = { params: Promise<P> };

/** Wraps a route handler so every thrown error becomes a safe JSON response. */
export function handler<P extends Record<string, string> = Record<string, string>>(
  fn: (request: Request, ctx: Ctx<P>) => Promise<Response> | Response,
) {
  return async (request: Request, ctx: Ctx<P>): Promise<Response> => {
    try {
      return await fn(request, ctx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
