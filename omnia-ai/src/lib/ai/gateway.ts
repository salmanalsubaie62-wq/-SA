import { db, newId, now } from "../db";
import { chatWith, isConnected, PROVIDERS, type ChatTurn, type ProviderId } from "./providers";

/**
 * Unified model gateway: maps OMNIA modes to concrete provider models, routes
 * "auto" requests by intent, falls back across connected providers, and records
 * usage. Every response reports the provider and model that actually answered.
 */

export const MODES = [
  "auto",
  "general",
  "reasoning",
  "fast",
  "creative",
  "research",
  "coding",
  "writing",
  "educational",
] as const;
export type Mode = (typeof MODES)[number];
export type ConcreteMode = Exclude<Mode, "auto">;

export const MODE_INFO: Record<Mode, { label: string; description: string }> = {
  auto: { label: "Auto", description: "Routes each request to the best-suited model" },
  general: { label: "General", description: "Balanced everyday assistant" },
  reasoning: { label: "Advanced reasoning", description: "Math, logic and multi-step problems" },
  fast: { label: "Fast", description: "Quick answers at low latency" },
  creative: { label: "Creative", description: "Ideas, stories and brainstorming" },
  research: { label: "Research", description: "Analysis of sources and evidence" },
  coding: { label: "Coding", description: "Writing, debugging and explaining code" },
  writing: { label: "Writing", description: "Professional content and translation" },
  educational: { label: "Educational", description: "Clear explanations for learners" },
};

/** Default model per provider and mode. Override any entry with OMNIA_MODEL_<PROVIDER>_<MODE>. */
const DEFAULT_MODELS: Record<ProviderId, Record<ConcreteMode, string>> = {
  anthropic: {
    general: "claude-sonnet-5-5",
    reasoning: "claude-opus-5-5",
    fast: "claude-haiku-5-5",
    creative: "claude-sonnet-5-5",
    research: "claude-sonnet-5-5",
    coding: "claude-sonnet-5-5",
    writing: "claude-sonnet-5-5",
    educational: "claude-sonnet-5-5",
  },
  openai: {
    general: "gpt-4.1",
    reasoning: "o4-mini",
    fast: "gpt-4.1-mini",
    creative: "gpt-4.1",
    research: "gpt-4.1",
    coding: "gpt-4.1",
    writing: "gpt-4.1",
    educational: "gpt-4.1-mini",
  },
  google: {
    general: "gemini-2.5-pro",
    reasoning: "gemini-2.5-pro",
    fast: "gemini-2.5-flash",
    creative: "gemini-2.5-pro",
    research: "gemini-2.5-pro",
    coding: "gemini-2.5-pro",
    writing: "gemini-2.5-pro",
    educational: "gemini-2.5-flash",
  },
};

export function resolveModel(provider: ProviderId, mode: ConcreteMode): string {
  const override = process.env[`OMNIA_MODEL_${provider.toUpperCase()}_${mode.toUpperCase()}`]?.trim();
  return override || DEFAULT_MODELS[provider][mode];
}

function providerOrder(): ProviderId[] {
  const configured = (process.env.OMNIA_PROVIDER_PRIORITY ?? "anthropic,openai,google")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is ProviderId => s in PROVIDERS);
  return configured;
}

/** Heuristic intent router used when the mode is "auto". */
export function classifyIntent(text: string, hasImages = false): { mode: ConcreteMode; reason: string } {
  const t = text.toLowerCase();
  if (/```|\bdebug\b|\bbug\b|\bfunction\b|\bexception\b|\berror\b|\bpython\b|\bjavascript\b|\btypescript\b|\bsql\b|\bapi\b|\bcode\b|\bcompile|كود|برمج|تصحيح/.test(t))
    return { mode: "coding", reason: "Programming request" };
  if (/\bprove\b|\bproof\b|\btheorem\b|\bsolve\b|\bequation\b|\bintegral\b|\bderivative\b|\bcalculate\b|\bmath|step by step|حل |معادل|رياض/.test(t))
    return { mode: "reasoning", reason: "Reasoning or mathematics" };
  if (/\btranslate\b|\bessay\b|\barticle\b|\brewrite\b|\bproofread\b|\bemail\b|\bcover letter\b|\bblog\b|ترجم|مقال|اكتب /.test(t))
    return { mode: "writing", reason: "Writing or translation" };
  if (/\bexplain\b|\bteach\b|\blesson\b|\bhow does\b|\bwhat is\b|اشرح|درس/.test(t))
    return { mode: "educational", reason: "Explanation or teaching" };
  if (/\bbrainstorm\b|\bstory\b|\bpoem\b|\bcreative\b|\bslogan\b|\bideas?\b|فكرة|إبداع|قصة/.test(t))
    return { mode: "creative", reason: "Creative ideation" };
  if (hasImages) return { mode: "general", reason: "Image analysis" };
  return { mode: "general", reason: "General request" };
}

export class NoProviderConnectedError extends Error {
  constructor() {
    super(
      "No AI provider is connected. Add at least one API key to the server environment: " +
        Object.values(PROVIDERS)
          .map((p) => p.envKey)
          .join(", ") +
        ". Until then OMNIA will not generate answers.",
    );
  }
}

export interface RunChatInput {
  userId: string;
  kind: "chat" | "research" | "agent" | "coding" | "document" | "video_plan";
  mode: Mode;
  system?: string;
  messages: ChatTurn[];
  maxTokens?: number;
  hasImages?: boolean;
}

export interface RunChatResult {
  text: string;
  provider: ProviderId;
  model: string;
  mode: ConcreteMode;
  routedBy: "user" | "auto";
  routeReason?: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  fallbackErrors: string[];
}

export async function runChat(input: RunChatInput): Promise<RunChatResult> {
  const lastUserText = [...input.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  let mode: ConcreteMode;
  let routedBy: "user" | "auto" = "user";
  let routeReason: string | undefined;
  if (input.mode === "auto") {
    const routed = classifyIntent(lastUserText, input.hasImages);
    mode = routed.mode;
    routedBy = "auto";
    routeReason = routed.reason;
  } else {
    mode = input.mode;
  }

  const candidates = providerOrder().filter((p) => isConnected(p));
  if (candidates.length === 0) throw new NoProviderConnectedError();

  const fallbackErrors: string[] = [];
  for (const provider of candidates) {
    const model = resolveModel(provider, mode);
    const started = Date.now();
    try {
      const out = await chatWith(provider, {
        model,
        system: input.system,
        messages: input.messages,
        maxTokens: input.maxTokens,
      });
      const latencyMs = Date.now() - started;
      logUsage(input.userId, input.kind, provider, model, "ok", out.inputTokens, out.outputTokens, latencyMs);
      return {
        text: out.text,
        provider,
        model,
        mode,
        routedBy,
        routeReason,
        inputTokens: out.inputTokens,
        outputTokens: out.outputTokens,
        latencyMs,
        fallbackErrors,
      };
    } catch (error) {
      const latencyMs = Date.now() - started;
      const message = error instanceof Error ? error.message : "Unknown provider error";
      fallbackErrors.push(message);
      logUsage(input.userId, input.kind, provider, model, "error", 0, 0, latencyMs, message);
      // Try the next connected provider for any failure; the failure is recorded in usage and returned.
    }
  }
  throw new Error(`All connected providers failed: ${fallbackErrors.join(" | ")}`);
}

export function logUsage(
  userId: string,
  kind: string,
  provider: string | null,
  model: string | null,
  status: "ok" | "error",
  inputTokens: number,
  outputTokens: number,
  latencyMs: number,
  error?: string,
) {
  db()
    .prepare(
      `INSERT INTO usage_events (id, user_id, kind, provider, model, status, input_tokens, output_tokens, latency_ms, error, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      newId("use_"),
      userId,
      kind,
      provider,
      model,
      status,
      inputTokens,
      outputTokens,
      latencyMs,
      error ? error.slice(0, 500) : null,
      now(),
    );
}

export function modelCatalog() {
  return (Object.keys(DEFAULT_MODELS) as ProviderId[]).map((provider) => ({
    provider,
    label: PROVIDERS[provider].label,
    connected: isConnected(provider),
    models: Object.fromEntries(
      (Object.keys(DEFAULT_MODELS[provider]) as ConcreteMode[]).map((mode) => [mode, resolveModel(provider, mode)]),
    ),
  }));
}
