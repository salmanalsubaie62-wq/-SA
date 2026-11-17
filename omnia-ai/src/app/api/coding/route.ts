import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handler, readJson } from "@/lib/http";
import { codingSchema } from "@/lib/schemas";
import { runChat } from "@/lib/ai/gateway";
import { OMNIA_PERSONA } from "@/lib/prompts";
import { rateLimit } from "@/lib/rate-limit";

const ACTIONS: Record<string, string> = {
  generate: "Write complete, runnable code that fulfils the request. Provide the full file(s) in fenced code blocks, then a short explanation of how to run it.",
  debug: "Find the bugs in the code. For each: explain the cause, show the fix, and give the corrected code in full.",
  explain: "Explain what the code does, section by section, and point out any risks or improvements.",
  refactor: "Refactor the code for clarity, performance and maintainability without changing behaviour. Return the full refactored code and list the changes.",
  tests: "Write a comprehensive test suite for the code (happy paths, edge cases, errors) using the idiomatic test framework for the language.",
};

export const POST = handler(async (request) => {
  const user = await requireUser();
  rateLimit(`coding:${user.id}`, 20);
  const input = codingSchema.parse(await readJson(request));
  const content = [input.request && `Request: ${input.request}`, input.code && `Code (${input.language}):\n\`\`\`${input.language}\n${input.code}\n\`\`\``]
    .filter(Boolean)
    .join("\n\n");
  const result = await runChat({
    userId: user.id,
    kind: "coding",
    mode: "coding",
    system: `${OMNIA_PERSONA}\nYou are the OMNIA Coding Lab. ${ACTIONS[input.action]} Prefer secure, idiomatic code and never hard-code secrets.`,
    messages: [{ role: "user", content }],
    maxTokens: 6000,
  });
  return NextResponse.json({
    answer: result.text,
    routing: { provider: result.provider, model: result.model, mode: result.mode },
  });
});
