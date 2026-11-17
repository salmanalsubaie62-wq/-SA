/**
 * Provider adapters. Each adapter talks to an official REST API directly over HTTPS.
 * A provider is "connected" only when its API key environment variable is set.
 * Keys never leave the server: they are read from process.env and sent in headers.
 */

export type ProviderId = "openai" | "anthropic" | "google";

export interface ImagePart {
  mime: string;
  data: string; // base64, no data: prefix
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  images?: ImagePart[];
}

export interface ChatCall {
  model: string;
  system?: string;
  messages: ChatTurn[];
  maxTokens?: number;
}

export interface ChatOutcome {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export class ProviderError extends Error {
  constructor(
    public provider: ProviderId,
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface ProviderMeta {
  id: ProviderId;
  label: string;
  envKey: string;
  envBase: string;
  defaultBase: string;
  capabilities: string[];
}

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  anthropic: {
    id: "anthropic",
    label: "Anthropic (Claude)",
    envKey: "ANTHROPIC_API_KEY",
    envBase: "ANTHROPIC_BASE_URL",
    defaultBase: "https://api.anthropic.com",
    capabilities: ["chat", "vision"],
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    envBase: "OPENAI_BASE_URL",
    defaultBase: "https://api.openai.com",
    capabilities: ["chat", "vision", "images"],
  },
  google: {
    id: "google",
    label: "Google Gemini",
    envKey: "GOOGLE_API_KEY",
    envBase: "GOOGLE_BASE_URL",
    defaultBase: "https://generativelanguage.googleapis.com",
    capabilities: ["chat", "vision"],
  },
};

export function apiKey(provider: ProviderId): string | null {
  const value = process.env[PROVIDERS[provider].envKey]?.trim();
  return value ? value : null;
}

export function isConnected(provider: ProviderId): boolean {
  return apiKey(provider) !== null;
}

function baseUrl(provider: ProviderId): string {
  const meta = PROVIDERS[provider];
  return (process.env[meta.envBase]?.trim() || meta.defaultBase).replace(/\/+$/, "");
}

async function postJson(provider: ProviderId, url: string, headers: Record<string, string>, body: unknown) {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "network error";
    throw new ProviderError(provider, 0, `${PROVIDERS[provider].label} is unreachable (${reason}).`);
  }
  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!response.ok) {
    const detail = extractErrorMessage(json) ?? text.slice(0, 300);
    throw new ProviderError(provider, response.status, `${PROVIDERS[provider].label} returned ${response.status}: ${detail}`);
  }
  return json as Record<string, unknown>;
}

function extractErrorMessage(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;
  const err = obj.error;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && typeof (err as Record<string, unknown>).message === "string") {
    return (err as Record<string, string>).message;
  }
  return null;
}

/* ---------------- OpenAI ---------------- */

async function openaiChat(call: ChatCall): Promise<ChatOutcome> {
  const key = apiKey("openai")!;
  const messages: unknown[] = [];
  if (call.system) messages.push({ role: "system", content: call.system });
  for (const turn of call.messages) {
    if (turn.role === "user" && turn.images?.length) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: turn.content || "Describe the attached image(s)." },
          ...turn.images.map((img) => ({
            type: "image_url",
            image_url: { url: `data:${img.mime};base64,${img.data}` },
          })),
        ],
      });
    } else {
      messages.push({ role: turn.role, content: turn.content });
    }
  }
  const json = await postJson(
    "openai",
    `${baseUrl("openai")}/v1/chat/completions`,
    { authorization: `Bearer ${key}` },
    { model: call.model, messages, max_completion_tokens: call.maxTokens ?? 4096 },
  );
  const choices = (json.choices as Array<{ message?: { content?: string } }> | undefined) ?? [];
  const usage = (json.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined) ?? {};
  return {
    text: choices[0]?.message?.content ?? "",
    inputTokens: usage.prompt_tokens ?? 0,
    outputTokens: usage.completion_tokens ?? 0,
  };
}

export async function openaiImages(opts: { model: string; prompt: string; size: string; n: number }) {
  const key = apiKey("openai")!;
  const body: Record<string, unknown> = { model: opts.model, prompt: opts.prompt, size: opts.size, n: opts.n };
  if (opts.model.startsWith("dall-e")) body.response_format = "b64_json";
  const json = await postJson("openai", `${baseUrl("openai")}/v1/images/generations`, { authorization: `Bearer ${key}` }, body);
  const data = (json.data as Array<{ b64_json?: string }> | undefined) ?? [];
  return data.map((item) => item.b64_json).filter((v): v is string => typeof v === "string");
}

/* ---------------- Anthropic ---------------- */

async function anthropicChat(call: ChatCall): Promise<ChatOutcome> {
  const key = apiKey("anthropic")!;
  const messages = call.messages.map((turn) => {
    const content: unknown[] = [];
    for (const img of turn.images ?? []) {
      content.push({ type: "image", source: { type: "base64", media_type: img.mime, data: img.data } });
    }
    content.push({ type: "text", text: turn.content || "Describe the attached image(s)." });
    return { role: turn.role, content };
  });
  const json = await postJson(
    "anthropic",
    `${baseUrl("anthropic")}/v1/messages`,
    { "x-api-key": key, "anthropic-version": "2023-06-01" },
    {
      model: call.model,
      max_tokens: call.maxTokens ?? 4096,
      ...(call.system ? { system: call.system } : {}),
      messages,
    },
  );
  const blocks = (json.content as Array<{ type: string; text?: string }> | undefined) ?? [];
  const usage = (json.usage as { input_tokens?: number; output_tokens?: number } | undefined) ?? {};
  return {
    text: blocks.filter((b) => b.type === "text").map((b) => b.text ?? "").join(""),
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
  };
}

/* ---------------- Google Gemini ---------------- */

async function googleChat(call: ChatCall): Promise<ChatOutcome> {
  const key = apiKey("google")!;
  const contents = call.messages.map((turn) => {
    const parts: unknown[] = [];
    for (const img of turn.images ?? []) parts.push({ inlineData: { mimeType: img.mime, data: img.data } });
    parts.push({ text: turn.content || "Describe the attached image(s)." });
    return { role: turn.role === "assistant" ? "model" : "user", parts };
  });
  const json = await postJson(
    "google",
    `${baseUrl("google")}/v1beta/models/${encodeURIComponent(call.model)}:generateContent`,
    { "x-goog-api-key": key },
    {
      ...(call.system ? { systemInstruction: { parts: [{ text: call.system }] } } : {}),
      contents,
      generationConfig: { maxOutputTokens: call.maxTokens ?? 4096 },
    },
  );
  const candidates = (json.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined) ?? [];
  const usage =
    (json.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number } | undefined) ?? {};
  return {
    text: (candidates[0]?.content?.parts ?? []).map((p) => p.text ?? "").join(""),
    inputTokens: usage.promptTokenCount ?? 0,
    outputTokens: usage.candidatesTokenCount ?? 0,
  };
}

const CHAT_ADAPTERS: Record<ProviderId, (call: ChatCall) => Promise<ChatOutcome>> = {
  openai: openaiChat,
  anthropic: anthropicChat,
  google: googleChat,
};

export function chatWith(provider: ProviderId, call: ChatCall): Promise<ChatOutcome> {
  if (!isConnected(provider)) {
    throw new ProviderError(provider, 0, `${PROVIDERS[provider].label} is not connected (set ${PROVIDERS[provider].envKey}).`);
  }
  return CHAT_ADAPTERS[provider](call);
}

export function providerStatus() {
  return (Object.values(PROVIDERS) as ProviderMeta[]).map((meta) => ({
    id: meta.id,
    label: meta.label,
    connected: isConnected(meta.id),
    envKey: meta.envKey,
    capabilities: meta.capabilities,
  }));
}
