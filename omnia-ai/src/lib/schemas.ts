import { z } from "zod";
import { MODES } from "./ai/gateway";
import { AGENT_IDS } from "./agents";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.email("Enter a valid email address").max(200),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

export const loginSchema = z.object({
  email: z.email().max(200),
  password: z.string().min(1).max(200),
});

export const meSchema = z.object({
  language: z.enum(["en", "ar"]).optional(),
  memoryEnabled: z.boolean().optional(),
  name: z.string().trim().min(1).max(80).optional(),
});

export const modeSchema = z.enum(MODES);

export const sendMessageSchema = z.object({
  content: z.string().max(20_000).default(""),
  mode: modeSchema.default("auto"),
  attachmentIds: z.array(z.string().max(80)).max(8).default([]),
});

export const createConversationSchema = z.object({
  title: z.string().trim().max(120).optional(),
  mode: modeSchema.default("auto"),
  projectId: z.string().max(80).nullable().optional(),
});

export const updateConversationSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  pinned: z.boolean().optional(),
  projectId: z.string().max(80).nullable().optional(),
  mode: modeSchema.optional(),
});

export const editMessageSchema = z.object({
  messageId: z.string().max(80),
  content: z.string().min(1).max(20_000),
  mode: modeSchema.default("auto"),
});

export const regenerateSchema = z.object({
  mode: modeSchema.default("auto"),
});

export const imageSchema = z.object({
  prompt: z.string().trim().min(3, "Describe the image in at least 3 characters").max(4000),
  aspect: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).default("1:1"),
  style: z.string().max(60).optional(),
  lighting: z.string().max(120).optional(),
  camera: z.string().max(120).optional(),
  count: z.number().int().min(1).max(4).default(1),
  projectId: z.string().max(80).nullable().optional(),
});

export const videoPlanSchema = z.object({
  idea: z.string().trim().min(10, "Describe your video idea in at least 10 characters").max(4000),
  durationSeconds: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(30)]).default(15),
  aspect: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).default("16:9"),
  language: z.enum(["en", "ar"]).default("en"),
  projectId: z.string().max(80).nullable().optional(),
});

export const researchSchema = z.object({
  question: z.string().trim().min(5, "Ask a more specific question").max(2000),
  depth: z.enum(["quick", "deep", "expert"]).default("quick"),
});

export const askDocumentSchema = z.object({
  task: z.enum(["summarize", "extract", "translate", "analyze_table", "explain", "report", "question"]),
  question: z.string().trim().max(2000).default(""),
  language: z.enum(["en", "ar"]).default("en"),
  mode: modeSchema.default("auto"),
});

export const codingSchema = z.object({
  action: z.enum(["generate", "debug", "explain", "refactor", "tests"]),
  language: z.string().trim().min(1).max(40),
  code: z.string().max(60_000).default(""),
  request: z.string().max(4000).default(""),
});

export const agentRunSchema = z.object({
  goal: z.string().trim().min(10, "Describe the goal in at least 10 characters").max(4000),
  agents: z.array(z.enum(AGENT_IDS)).min(1).max(4),
  projectId: z.string().max(80).nullable().optional(),
});

export const memorySchema = z.object({
  content: z.string().trim().min(3).max(1000),
  enabled: z.boolean().default(true),
  projectId: z.string().max(80).nullable().optional(),
});

export const memoryUpdateSchema = z.object({
  content: z.string().trim().min(3).max(1000).optional(),
  enabled: z.boolean().optional(),
});

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(100),
  kind: z.enum(["general", "youtube", "game", "website", "business", "research", "film", "education", "marketing"]).default("general"),
  description: z.string().max(2000).default(""),
});

export const projectUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  kind: z.enum(["general", "youtube", "game", "website", "business", "research", "film", "education", "marketing"]).optional(),
  description: z.string().max(2000).optional(),
  notes: z.string().max(20_000).optional(),
  tasks: z
    .array(z.object({ id: z.string().max(80), title: z.string().trim().min(1).max(200), done: z.boolean() }))
    .max(200)
    .optional(),
});

export const adminUserSchema = z.object({
  role: z.enum(["user", "admin"]).optional(),
  disabled: z.boolean().optional(),
});

export const featureSchema = z.object({
  key: z.string().min(1).max(60),
  enabled: z.boolean(),
});
