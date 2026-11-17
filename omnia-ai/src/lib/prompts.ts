import { db } from "./db";

export const OMNIA_PERSONA = `You are OMNIA AI, a capable, honest and professional assistant.
- Answer directly and naturally. Use Markdown: headings, lists, tables and fenced code blocks when they help.
- Match the user's language. If the user writes in Arabic, reply in Arabic.
- If you are unsure, say so. Never invent facts, sources, links, statistics or quotations.
- When an attached document or image is provided, base your answer on its actual content.`;

/** Builds the system prompt, including opt-in memories and project context. */
export function buildSystemPrompt(opts: {
  userId: string;
  projectId?: string | null;
  extra?: string;
}): string {
  const parts = [OMNIA_PERSONA];
  const user = db().prepare("SELECT memory_enabled FROM users WHERE id = ?").get(opts.userId) as
    | { memory_enabled: number }
    | undefined;
  if (user?.memory_enabled) {
    const memories = db()
      .prepare(
        `SELECT content FROM memories
         WHERE user_id = ? AND enabled = 1 AND (project_id IS NULL OR project_id = ?)
         ORDER BY updated_at DESC LIMIT 40`,
      )
      .all(opts.userId, opts.projectId ?? null) as Array<{ content: string }>;
    if (memories.length) {
      parts.push(
        "Things the user asked you to remember (use them only when relevant):\n" +
          memories.map((m) => `- ${m.content}`).join("\n"),
      );
    }
  }
  if (opts.projectId) {
    const project = db()
      .prepare("SELECT name, description, notes FROM projects WHERE id = ? AND user_id = ?")
      .get(opts.projectId, opts.userId) as { name: string; description: string; notes: string } | undefined;
    if (project) {
      parts.push(
        `Active project: "${project.name}". ${project.description}\nProject notes:\n${project.notes.slice(0, 4000)}`,
      );
    }
  }
  if (opts.extra) parts.push(opts.extra);
  return parts.join("\n\n");
}
