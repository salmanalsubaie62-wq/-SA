import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handler, readJson } from "@/lib/http";
import { researchSchema } from "@/lib/schemas";
import { runResearch } from "@/lib/research";
import { rateLimit } from "@/lib/rate-limit";

export const POST = handler(async (request) => {
  const user = await requireUser();
  rateLimit(`research:${user.id}`, 10);
  const input = researchSchema.parse(await readJson(request));
  const result = await runResearch({ userId: user.id, question: input.question, depth: input.depth });
  return NextResponse.json(result);
});
