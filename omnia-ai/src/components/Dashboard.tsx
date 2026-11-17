"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "./Icon";
import { ConnectionBadge, ErrorText, PageHead } from "./ui";
import { api, formatDate } from "@/lib/client/api";
import { useI18n } from "@/lib/client/i18n";

interface DashboardData {
  counts: Record<string, number>;
  usage: Array<{ model: string; provider: string; calls: number; ok_calls: number; input_tokens: number; output_tokens: number }>;
  recent: Array<{ type: string; id: string; title: string; at: number }>;
  providers: Array<{ id: string; label: string; connected: boolean }>;
  tools: Array<{ id: string; connected: boolean }>;
}

const TOOL_LINKS: Record<string, { href: string; label: string; icon: IconName }> = {
  chat: { href: "/chat", label: "Super Chat", icon: "chat" },
  images: { href: "/images", label: "Image Studio", icon: "image" },
  video: { href: "/video", label: "Video Studio", icon: "video" },
  research: { href: "/research", label: "Research", icon: "research" },
};

export function Dashboard({ name }: { name: string }) {
  const { lang } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<DashboardData>("/api/dashboard").then(setData).catch((e) => setError(e.message));
  }, []);

  const kpis: Array<[string, number, IconName]> = data
    ? [
        ["Conversations", data.counts.conversations, "chat"],
        ["Messages", data.counts.messages, "chat"],
        ["Images", data.counts.images, "image"],
        ["Video storyboards", data.counts.videoPlans, "video"],
        ["Projects", data.counts.projects, "projects"],
        ["Documents", data.counts.documents, "docs"],
      ]
    : [];
  const maxCalls = Math.max(1, ...(data?.usage.map((u) => u.calls) ?? [1]));

  return (
    <div className="content-narrow">
      <PageHead title={`Welcome back, ${name.split(" ")[0] || "there"}`} subtitle="Your activity, usage and available tools in one place." />
      <ErrorText message={error} />
      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        {!data && Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 110 }} />)}
        {kpis.map(([label, value, icon]) => (
          <div key={label} className="card kpi">
            <div className="row-between">
              <span className="kpi-label">{label}</span>
              <span className="kpi-icon"><Icon name={icon} size={18} /></span>
            </div>
            <div className="kpi-value">{value.toLocaleString(lang === "ar" ? "ar" : "en")}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <div className="card stack">
          <h2 style={{ margin: 0 }}>AI usage · last 14 days</h2>
          {data && data.usage.length === 0 && <p className="muted" style={{ margin: 0 }}>No AI calls yet. Start a chat to see model usage here.</p>}
          {data?.usage.map((u) => (
            <div key={`${u.provider}-${u.model}`} className="bar-row">
              <span className="mono small" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.provider} · {u.model}</span>
              <div className="progress"><span style={{ width: `${(u.calls / maxCalls) * 100}%` }} /></div>
              <span className="small dim" style={{ textAlign: "end" }}>{u.calls}</span>
            </div>
          ))}
          <div className="divider" />
          <h3 style={{ margin: 0 }}>Services</h3>
          {data?.providers.map((p) => (
            <div key={p.id} className="row-between small">
              <span>{p.label}</span>
              <ConnectionBadge connected={p.connected} />
            </div>
          ))}
        </div>

        <div className="stack">
          <div className="card stack">
            <h2 style={{ margin: 0 }}>Tools</h2>
            {Object.entries(TOOL_LINKS).map(([key, tool]) => {
              const connected = data?.tools.find((t) => t.id === key)?.connected ?? false;
              return (
                <Link key={key} href={tool.href} className="recent-row" style={{ border: "1px solid var(--border)" }}>
                  <Icon name={tool.icon} size={17} />
                  <span style={{ flex: 1 }}>{tool.label}</span>
                  <ConnectionBadge connected={connected} label={connected ? "Ready" : "Not connected"} />
                </Link>
              );
            })}
          </div>
          <div className="card stack">
            <h2 style={{ margin: 0 }}>Recent activity</h2>
            {data && data.recent.length === 0 && <p className="muted" style={{ margin: 0 }}>Nothing yet. Your chats, images, documents and projects appear here.</p>}
            {data?.recent.map((r) => (
              <div key={`${r.type}-${r.id}`} className="recent-row" style={{ padding: "6px 4px" }}>
                <span className="recent-type">{r.type}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
                <span className="small muted">{formatDate(r.at, lang)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
