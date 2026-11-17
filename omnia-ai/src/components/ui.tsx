"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function toast(message: string, kind: "info" | "error" | "success" = "info") {
  window.dispatchEvent(new CustomEvent("omnia:toast", { detail: { message, kind, id: crypto.randomUUID() } }));
}

export function Toaster() {
  const [items, setItems] = useState<Array<{ id: string; message: string; kind: string }>>([]);
  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message: string; kind: string; id: string };
      setItems((prev) => [...prev.slice(-3), detail]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== detail.id)), 4200);
    };
    window.addEventListener("omnia:toast", onToast);
    return () => window.removeEventListener("omnia:toast", onToast);
  }, []);
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.kind === "error" ? "error" : t.kind === "success" ? "success" : ""}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="row small dim" role="status">
      <span className="spinner" />
      {label}
    </span>
  );
}

export function TypingDots() {
  return (
    <span className="typing" aria-label="Thinking">
      <span />
      <span />
      <span />
    </span>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={26} />
      </div>
      <h3>{title}</h3>
      {children && <div className="muted" style={{ maxWidth: "52ch", margin: "0 auto" }}>{children}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function Notice({ kind = "warning", title, children }: { kind?: "warning" | "error" | "info" | "success"; title?: string; children?: ReactNode }) {
  const cls = kind === "warning" ? "notice" : `notice ${kind}`;
  return (
    <div className={cls} role={kind === "error" ? "alert" : undefined}>
      {kind !== "warning" && kind !== "info" && <Icon name={kind === "error" ? "close" : "check"} size={18} />}
      <div>
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="notice error" role="alert">
      <Icon name="close" size={18} />
      <div>{message}</div>
    </div>
  );
}

export function PageHead({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="gradient-text">{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}

export function ConnectionBadge({ connected, label }: { connected: boolean; label?: string }) {
  return (
    <span className={`badge ${connected ? "badge-ok" : "badge-off"}`}>
      <span className="dot" />
      {label ?? (connected ? "Connected" : "Not connected")}
    </span>
  );
}
