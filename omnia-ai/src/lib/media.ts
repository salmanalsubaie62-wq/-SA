import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./db";
import { isConnected, openaiImages } from "./ai/providers";
import { logUsage, runChat } from "./ai/gateway";
import { OMNIA_PERSONA } from "./prompts";
import { HttpError } from "./auth";

export const MEDIA_DIR = path.join(DATA_DIR, "media");

export const ASPECTS = {
  "1:1": { label: "Square 1:1", size: "1024x1024" },
  "16:9": { label: "Landscape 16:9", size: "1536x1024" },
  "9:16": { label: "Portrait 9:16", size: "1024x1536" },
  "4:3": { label: "4:3", size: "1536x1024" },
  "3:4": { label: "3:4", size: "1024x1536" },
} as const;
export type Aspect = keyof typeof ASPECTS;

export const IMAGE_STYLES = [
  "Photorealistic", "Anime", "Cartoon", "Pixel art", "Cinematic", "3D character", "Game environment",
  "Product photography", "Concept art", "Logo", "Poster", "Illustration", "Watercolor", "Minimal flat",
] as const;

export function imageConnected(): boolean {
  return isConnected("openai");
}

export function imageModel(): string {
  return process.env.OMNIA_IMAGE_MODEL?.trim() || "gpt-image-1";
}

export function mediaPath(fileName: string) {
  return path.join(MEDIA_DIR, path.basename(fileName));
}

/** Generates images with the OpenAI Images API and stores the files on the server. */
export async function generateImages(opts: {
  userId: string;
  prompt: string;
  aspect: Aspect;
  style?: string;
  lighting?: string;
  camera?: string;
  count: number;
}): Promise<Array<{ id: string; file: string }>> {
  if (!imageConnected()) throw new Error("Image generation is not connected (set OPENAI_API_KEY).");
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  const details = [opts.style && `Style: ${opts.style}`, opts.lighting && `Lighting: ${opts.lighting}`, opts.camera && `Camera: ${opts.camera}`]
    .filter(Boolean)
    .join(". ");
  const prompt = details ? `${opts.prompt}\n\n${details}` : opts.prompt;
  const model = imageModel();
  const started = Date.now();
  try {
    const b64s = await openaiImages({ model, prompt, size: ASPECTS[opts.aspect].size, n: opts.count });
    logUsage(opts.userId, "image", "openai", model, "ok", 0, 0, Date.now() - started);
    return b64s.map((b64) => {
      const id = crypto.randomUUID().replace(/-/g, "");
      const file = `${id}.png`;
      fs.writeFileSync(path.join(MEDIA_DIR, file), Buffer.from(b64, "base64"));
      return { id, file };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed.";
    logUsage(opts.userId, "image", "openai", model, "error", 0, 0, Date.now() - started, message);
    throw error;
  }
}

export interface VideoScene {
  number: number;
  title: string;
  durationSeconds: number;
  visual: string;
  camera: string;
  narration: string;
  imagePrompt: string;
}

export interface VideoPlan {
  title: string;
  logline: string;
  style: string;
  scenes: VideoScene[];
}

/** Uses the Video Director agent to turn an idea into a script and storyboard. */
export async function planVideo(opts: {
  userId: string;
  idea: string;
  durationSeconds: number;
  aspect: Aspect;
  language: "en" | "ar";
}): Promise<VideoPlan> {
  const sceneCount = Math.max(2, Math.min(8, Math.round(opts.durationSeconds / 5)));
  const system = `${OMNIA_PERSONA}
You are the Video Director. Produce a production plan as STRICT JSON only (no prose, no code fence) with this shape:
{"title": string, "logline": string, "style": string, "scenes": [{"number": number, "title": string, "durationSeconds": number, "visual": string, "camera": string, "narration": string, "imagePrompt": string}]}
- Exactly ${sceneCount} scenes whose durationSeconds sum to about ${opts.durationSeconds}.
- Aspect ratio: ${opts.aspect}. Write narration in ${opts.language === "ar" ? "Arabic" : "English"}.
- imagePrompt must be a self-contained prompt for a reference frame of that scene.`;
  const result = await runChat({
    userId: opts.userId,
    kind: "video_plan",
    mode: "creative",
    system,
    messages: [{ role: "user", content: opts.idea }],
    maxTokens: 4000,
  });
  return parsePlan(result.text);
}

export function parsePlan(text: string): VideoPlan {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new HttpError(502, "The model did not return a structured plan. Try again.");
  const raw = JSON.parse(text.slice(start, end + 1)) as Partial<VideoPlan>;
  const scenes = (raw.scenes ?? []).map((s, i) => ({
    number: Number(s.number ?? i + 1),
    title: String(s.title ?? `Scene ${i + 1}`),
    durationSeconds: Number(s.durationSeconds ?? 5),
    visual: String(s.visual ?? ""),
    camera: String(s.camera ?? ""),
    narration: String(s.narration ?? ""),
    imagePrompt: String(s.imagePrompt ?? s.visual ?? ""),
  }));
  if (!scenes.length) throw new HttpError(502, "The plan contained no scenes. Try again.");
  return { title: String(raw.title ?? "Untitled"), logline: String(raw.logline ?? ""), style: String(raw.style ?? ""), scenes };
}

export const videoRenderConnected = () => false; // No video-rendering provider is wired yet.
