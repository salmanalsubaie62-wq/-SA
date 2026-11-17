import { runChat, type Mode } from "./ai/gateway";
import { fetchPageText, searchConnected, searchWeb, type SearchHit } from "./web";
import { OMNIA_PERSONA } from "./prompts";

export const RESEARCH_DEPTHS = {
  quick: { label: "Quick search", results: 5, pages: 2, maxTokens: 1200 },
  deep: { label: "Deep research", results: 8, pages: 4, maxTokens: 3000 },
  expert: { label: "Expert research", results: 10, pages: 6, maxTokens: 5000 },
} as const;
export type Depth = keyof typeof RESEARCH_DEPTHS;

export interface ResearchSource {
  index: number;
  title: string;
  url: string;
  excerpt: string;
  fetched: boolean;
}

export interface ResearchResult {
  answer: string;
  sources: ResearchSource[];
  webVerified: boolean;
  provider: string;
  model: string;
  notice?: string;
}

/**
 * Multi-step research: search -> read pages -> synthesize with numbered citations.
 * Citations are restricted to sources actually retrieved, so URLs are never invented.
 */
export async function runResearch(opts: { userId: string; question: string; depth: Depth }): Promise<ResearchResult> {
  const config = RESEARCH_DEPTHS[opts.depth];
  const sources: ResearchSource[] = [];
  let webVerified = false;
  let notice: string | undefined;

  if (searchConnected()) {
    const hits: SearchHit[] = await searchWeb(opts.question, config.results);
    webVerified = hits.length > 0;
    for (const [i, hit] of hits.slice(0, config.results).entries()) {
      let excerpt = hit.snippet;
      let fetched = false;
      if (i < config.pages) {
        try {
          const page = await fetchPageText(hit.url, 4000);
          excerpt = page.text;
          fetched = true;
        } catch {
          // Keep the search snippet when a page cannot be read; the source is still listed.
        }
      }
      sources.push({ index: sources.length + 1, title: hit.title, url: hit.url, excerpt, fetched });
    }
    if (!sources.length) notice = "The web search returned no results for this question.";
  } else {
    notice = "Live web search is not connected (set BRAVE_SEARCH_API_KEY). This answer comes from model knowledge and has not been verified against current sources.";
  }

  const sourceBlock = sources.length
    ? sources
        .map((s) => `[${s.index}] ${s.title}\nURL: ${s.url}\nContent:\n${s.excerpt || "(no content)"}`)
        .join("\n\n---\n\n")
    : "(no retrieved sources)";

  const depthInstruction: Record<Depth, string> = {
    quick: "Give a concise, direct answer in at most 6 sentences, with citations.",
    deep: "Give a structured report: summary, key findings, supporting evidence, and open questions. Use citations.",
    expert: "Give a comprehensive analysis: executive summary, evidence table comparing sources, conflicting claims, a clear conclusion with confidence level, limitations, and a references list.",
  };

  const system = `${OMNIA_PERSONA}
You are performing ${config.label}. Rules:
- Cite claims with bracketed source numbers like [1]. Cite ONLY the numbered sources below. Never invent sources, URLs, statistics or quotes.
- Clearly separate verified facts (supported by a source) from uncertainty or inference.
- If the sources do not answer the question, say so plainly.
- ${depthInstruction[opts.depth]}

Sources:
${sourceBlock}`;

  const result = await runChat({
    userId: opts.userId,
    kind: "research",
    mode: "research" as Mode,
    system,
    messages: [{ role: "user", content: opts.question }],
    maxTokens: config.maxTokens,
  });

  return {
    answer: result.text,
    sources: sources.map(({ index, title, url, fetched }) => ({ index, title, url, excerpt: "", fetched })),
    webVerified,
    provider: result.provider,
    model: result.model,
    notice,
  };
}
