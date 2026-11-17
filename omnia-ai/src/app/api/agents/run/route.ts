import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handler, readJson } from "@/lib/http";
import { agentRunSchema } from "@/lib/schemas";
import { runChat } from "@/lib/ai/gateway";
import { getAgent } from "@/lib/agents";
import { buildSystemPrompt } from "@/lib/prompts";
import { assertProjectOwner } from "@/lib/guards";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Multi-agent run: the chosen specialists work in sequence, each seeing the goal and prior outputs.
 * A coordinator then merges everything into one organized answer.
 */
export const POST = handler(async (request) => {
  const user = await requireUser();
  rateLimit(`agents:${user.id}`, 4);
  const input = agentRunSchema.parse(await readJson(request));
  if (input.projectId) assertProjectOwner(user.id, input.projectId);
  const projectId = input.projectId ?? null;
  const steps: Array<{ agent: string; name: string; output: string; provider: string; model: string }> = [];
  for (const id of input.agents) {
    const agent = getAgent(id);
    if (!agent) continue;
    const context = steps.map((s) => `### ${s.name}\n${s.output}`).join("\n\n");
    const result = await runChat({
      userId: user.id,
      kind: "agent",
      mode: agent.mode as never,
      system: buildSystemPrompt({ userId: user.id, projectId, extra: `You are the ${agent.name} agent in the OMNIA agent team. ${agent.prompt}` }),
      messages: [
        {
          role: "user",
          content: `Goal:\n${input.goal}${context ? `\n\nWork completed by teammates so far:\n${context}` : ""}\n\nDeliver your contribution for this goal.`,
        },
      ],
      maxTokens: 2500,
    });
    steps.push({ agent: agent.id, name: agent.name, output: result.text, provider: result.provider, model: result.model });
  }
  const combined = steps.map((s) => `## ${s.name}\n${s.output}`).join("\n\n");
  const summary = await runChat({
    userId: user.id,
    kind: "agent",
    mode: "general",
    system: buildSystemPrompt({
      userId: user.id,
      projectId,
      extra: "You are the OMNIA coordinator. Merge the team's work into one organized, professional final answer with clear headings, a short executive summary, and next steps. Remove duplication and resolve conflicts explicitly.",
    }),
    messages: [{ role: "user", content: `Goal:\n${input.goal}\n\nTeam outputs:\n${combined}` }],
    maxTokens: 4000,
  });
  return NextResponse.json({
    goal: input.goal,
    steps,
    final: summary.text,
    coordinator: { provider: summary.provider, model: summary.model },
  });
});
