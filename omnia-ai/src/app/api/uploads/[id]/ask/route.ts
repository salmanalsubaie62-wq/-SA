import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { db } from "@/lib/db";
import { handler, readJson } from "@/lib/http";
import { askDocumentSchema } from "@/lib/schemas";
import { runChat } from "@/lib/ai/gateway";
import { OMNIA_PERSONA } from "@/lib/prompts";
import { rateLimit } from "@/lib/rate-limit";

type P = { id: string };

const TASKS: Record<string, string> = {
  summarize: "Summarize the document: purpose, key points, and conclusions. Use headings and bullets.",
  extract: "Extract the important information: names, dates, numbers, obligations and decisions, as a structured list or table.",
  translate: "Translate the document faithfully, preserving structure, into the requested language.",
  analyze_table: "Analyze the tabular data: structure, totals and averages where relevant, trends, anomalies, and clear recommendations. Show key numbers.",
  explain: "Explain the document's complicated content in simple, clear terms, with examples.",
  report: "Create a professional report based on the document: executive summary, findings, analysis, and recommendations.",
  question: "Answer the user's question using only the document. If the answer is not in the document, say so.",
};

export const POST = handler<P>(async (request, { params }) => {
  const user = await requireUser();
  rateLimit(`doc:${user.id}`, 20);
  const { id } = await params;
  const doc = db().prepare("SELECT name, text, kind FROM uploads WHERE id = ? AND user_id = ?").get(id, user.id) as
    | { name: string; text: string | null; kind: string }
    | undefined;
  if (!doc) throw new HttpError(404, "File not found.");
  if (doc.kind !== "text" || !doc.text) throw new HttpError(400, "Document analysis works on text documents. Use image analysis for images.");
  const input = askDocumentSchema.parse(await readJson(request));
  if (input.task === "question" && !input.question) throw new HttpError(400, "Write your question about the document.");

  const language = input.language === "ar" ? "Arabic" : "English";
  const instruction = `${TASKS[input.task]} Respond in ${language}.${input.question ? `\nUser request: ${input.question}` : ""}`;
  const result = await runChat({
    userId: user.id,
    kind: "document",
    mode: input.task === "analyze_table" ? "reasoning" : input.mode,
    system: `${OMNIA_PERSONA}\nYou analyze uploaded documents. Use only the document's actual content.`,
    messages: [{ role: "user", content: `${instruction}\n\nDocument "${doc.name}":\n<<<DOCUMENT\n${doc.text.slice(0, 150_000)}\nDOCUMENT>>>` }],
    maxTokens: 4000,
  });
  return NextResponse.json({
    answer: result.text,
    routing: { provider: result.provider, model: result.model, mode: result.mode, routedBy: result.routedBy, reason: result.routeReason },
  });
});
