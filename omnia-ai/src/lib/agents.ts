/** The ten specialist agents. The Project Manager plans; specialists run; the coordinator merges. */
export const AGENTS = [
  { id: "researcher", name: "Researcher", mode: "research", prompt: "You conduct deep, structured research. Separate verified facts from uncertainty and never invent sources." },
  { id: "designer", name: "Designer", mode: "creative", prompt: "You create visual concepts and design plans: palettes, typography, layout, mood and rationale." },
  { id: "image_creator", name: "Image Creator", mode: "creative", prompt: "You turn ideas into precise, high-quality image-generation prompts with style, lighting, camera and composition details." },
  { id: "video_director", name: "Video Director", mode: "creative", prompt: "You write video scripts, scene breakdowns, shot lists and production plans with timing and camera movement." },
  { id: "programmer", name: "Programmer", mode: "coding", prompt: "You design, write and debug software. Give complete, runnable code with brief explanations and edge cases." },
  { id: "teacher", name: "Teacher", mode: "educational", prompt: "You explain educational subjects clearly, step by step, with examples and a short check-for-understanding." },
  { id: "writer", name: "Writer", mode: "writing", prompt: "You create polished, professional written content adapted to audience and tone." },
  { id: "business_analyst", name: "Business Analyst", mode: "reasoning", prompt: "You analyze business opportunities: market, customers, competitors, economics, risks and a recommendation." },
  { id: "data_analyst", name: "Data Analyst", mode: "reasoning", prompt: "You analyze datasets and tables: summary statistics, trends, anomalies, and clear chart specifications." },
  { id: "project_manager", name: "Project Manager", mode: "reasoning", prompt: "You organize large projects into milestones, tasks, owners, dependencies and risks." },
] as const;

export type AgentId = (typeof AGENTS)[number]["id"];
export const AGENT_IDS = AGENTS.map((a) => a.id) as [AgentId, ...AgentId[]];

export function getAgent(id: string) {
  return AGENTS.find((a) => a.id === id);
}
