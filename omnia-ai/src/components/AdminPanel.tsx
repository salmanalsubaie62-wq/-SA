"use client";

import { useEffect, useState } from "react";
import { ConnectionBadge, ErrorText, PageHead, toast } from "./ui";
import { api, formatDate } from "@/lib/client/api";
import { useI18n } from "@/lib/client/i18n";

interface Overview {
  system: { uptimeSeconds: number; database: string; nodeVersion: string };
  totals: Record<string, number>;
  providers: Array<{ id: string; label: string; connected: boolean; envKey: string }>;
  capabilities: { images: boolean; webSearch: boolean };
  usage24h: Array<{ provider: string; calls: number; errors: number; input_tokens: number; output_tokens: number; avg_latency: number }>;
  kinds24h: Array<{ kind: string; calls: number }>;
  recentErrors: Array<{ kind: string; provider: string; model: string; error: string; created_at: number }>;
  features: Array<{ key: string; enabled: number }>;
}
interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  disabled: boolean;
  createdAt: number;
  conversations: number;
  calls: number;
}

const FEATURES = ["image_studio", "video_studio", "research", "documents", "coding_lab", "voice", "agents", "projects"];

export function AdminPanel({ meId }: { meId: string }) {
  const { lang } = useI18n();
  const [tab, setTab] = useState<"overview" | "users" | "features">("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [o, u] = await Promise.all([api<Overview>("/api/admin/overview"), api<{ users: AdminUser[] }>("/api/admin/users")]);
    setOverview(o);
    setUsers(u.users);
  };
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const updateUser = async (u: AdminUser, body: { role?: "user" | "admin"; disabled?: boolean }) => {
    try {
      await api(`/api/admin/users/${u.id}`, { method: "PATCH", body });
      toast("User updated", "success");
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Update failed", "error");
    }
  };

  const setFeature = async (key: string, enabled: boolean) => {
    await api("/api/admin/features", { method: "PUT", body: { key, enabled } });
    toast(`${key} ${enabled ? "enabled" : "hidden"}`, "success");
    load();
  };

  const featureState = (key: string) => {
    const row = overview?.features.find((f) => f.key === key);
    return row ? Boolean(row.enabled) : true;
  };

  return (
    <div>
      <PageHead title="Administration" subtitle="System health, providers, usage, users and section visibility." />
      <div className="tabs" role="tablist" style={{ marginBottom: 20 }}>
        {(["overview", "users", "features"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t === "overview" ? "Overview" : t === "users" ? "Users" : "Feature visibility"}
          </button>
        ))}
      </div>
      <ErrorText message={error} />

      {tab === "overview" && overview && (
        <div className="stack">
          <div className="grid grid-4">
            {Object.entries(overview.totals).map(([k, v]) => (
              <div key={k} className="card kpi"><span className="kpi-label">{k}</span><span className="kpi-value">{v.toLocaleString(lang === "ar" ? "ar" : "en")}</span></div>
            ))}
          </div>
          <div className="grid grid-2" style={{ alignItems: "start" }}>
            <div className="card stack">
              <h2 style={{ margin: 0 }}>System status</h2>
              <div className="row-between"><span className="dim">Database</span><ConnectionBadge connected={overview.system.database === "ok"} label={overview.system.database === "ok" ? "Healthy" : "Error"} /></div>
              <div className="row-between"><span className="dim">Uptime</span><span className="mono">{Math.floor(overview.system.uptimeSeconds / 60)} min</span></div>
              <div className="row-between"><span className="dim">Runtime</span><span className="mono">{overview.system.nodeVersion}</span></div>
              <div className="divider" />
              <h3 style={{ margin: 0 }}>Providers</h3>
              {overview.providers.map((p) => (
                <div key={p.id} className="row-between small">
                  <span>{p.label} <span className="mono muted">{p.envKey}</span></span>
                  <ConnectionBadge connected={p.connected} />
                </div>
              ))}
              <div className="row-between small"><span>Image generation</span><ConnectionBadge connected={overview.capabilities.images} /></div>
              <div className="row-between small"><span>Web search</span><ConnectionBadge connected={overview.capabilities.webSearch} /></div>
            </div>
            <div className="card stack">
              <h2 style={{ margin: 0 }}>Usage · last 24 hours</h2>
              {overview.usage24h.length === 0 && <p className="muted" style={{ margin: 0 }}>No provider calls in the last 24 hours.</p>}
              {overview.usage24h.length > 0 && (
                <div className="table-wrap" style={{ margin: 0 }}>
                  <table>
                    <thead><tr><th>Provider</th><th>Calls</th><th>Errors</th><th>Tokens</th><th>Avg ms</th></tr></thead>
                    <tbody>
                      {overview.usage24h.map((u) => (
                        <tr key={u.provider}>
                          <td>{u.provider}</td><td>{u.calls}</td><td>{u.errors}</td>
                          <td>{(u.input_tokens + u.output_tokens).toLocaleString()}</td><td>{Math.round(u.avg_latency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <h3 style={{ margin: "8px 0 0" }}>Recent errors</h3>
              {overview.recentErrors.length === 0 && <p className="small muted" style={{ margin: 0 }}>No errors recorded.</p>}
              {overview.recentErrors.slice(0, 8).map((e, i) => (
                <div key={i} className="small" style={{ borderInlineStart: "2px solid var(--danger)", paddingInlineStart: 10 }}>
                  <div className="muted">{formatDate(e.created_at, lang)} · {e.kind} · {e.provider}</div>
                  <div style={{ color: "var(--text-dim)" }}>{e.error}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap" style={{ border: 0, margin: 0 }}>
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Chats</th><th>AI calls</th><th>Joined</th><th>Status</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td className="small">{u.email}</td>
                    <td>
                      <select value={u.role} disabled={u.id === meId} onChange={(e) => updateUser(u, { role: e.target.value as "user" | "admin" })} style={{ width: "auto", padding: "4px 8px", fontSize: "0.82rem" }} aria-label={`Role for ${u.email}`}>
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>{u.conversations}</td>
                    <td>{u.calls}</td>
                    <td className="small">{formatDate(u.createdAt, lang)}</td>
                    <td>
                      <button className={`btn btn-sm ${u.disabled ? "" : "btn-danger"}`} disabled={u.id === meId} onClick={() => updateUser(u, { disabled: !u.disabled })}>
                        {u.disabled ? "Enable" : "Disable"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "features" && (
        <div className="card stack">
          <p className="small muted" style={{ margin: 0 }}>Hide or show a section in the navigation for everyone. Hidden sections stay in the code and can be restored at any time.</p>
          {FEATURES.map((f) => (
            <div key={f} className="row-between">
              <span>{f.replace(/_/g, " ")}</span>
              <label className="row" style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={featureState(f)} onChange={(e) => setFeature(f, e.target.checked)} style={{ width: 18, height: 18, accentColor: "#9f9f9f" }} aria-label={`Show ${f}`} />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
