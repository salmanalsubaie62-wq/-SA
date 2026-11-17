"use client";

import { useState } from "react";
import { ConnectionBadge, ErrorText, PageHead, toast } from "./ui";
import { api } from "@/lib/client/api";
import { useI18n } from "@/lib/client/i18n";

interface Provider { id: string; label: string; connected: boolean; envKey: string; capabilities: string[] }

export function SettingsView({ name, email, providers }: { name: string; email: string; providers: Provider[] }) {
  const { lang, setLang, t } = useI18n();
  const [displayName, setDisplayName] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/me", { method: "PATCH", body: { name: displayName } });
      toast("Profile saved", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content-narrow" style={{ maxWidth: 980 }}>
      <PageHead title={t("nav_settings")} subtitle="Profile, language and the status of every connected AI service." />
      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <form className="card stack" onSubmit={save}>
          <h2 style={{ margin: 0 }}>Profile</h2>
          <label className="field">
            Name
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} required />
          </label>
          <label className="field">
            Email
            <input value={email} disabled />
          </label>
          <label className="field">
            {t("language")}
            <select value={lang} onChange={(e) => setLang(e.target.value as "en" | "ar")}>
              <option value="en">English</option>
              <option value="ar">العربية (RTL)</option>
            </select>
          </label>
          <ErrorText message={error} />
          <button className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
        </form>

        <div className="card stack">
          <h2 style={{ margin: 0 }}>AI services</h2>
          <p className="small muted" style={{ margin: 0 }}>Keys are read from the server environment and never sent to the browser. A service shows as connected only when its key is set.</p>
          {providers.map((p) => (
            <div key={p.id} className="row-between" style={{ alignItems: "flex-start" }}>
              <div>
                <div>{p.label}</div>
                <div className="small muted mono">{p.envKey}</div>
              </div>
              <ConnectionBadge connected={p.connected} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
