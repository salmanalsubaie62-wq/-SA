"use client";

/** Thin client for OMNIA's JSON API. Throws Error with the server's human-readable message. */
export async function api<T = unknown>(url: string, init?: { method?: string; body?: unknown; form?: FormData }): Promise<T> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (init?.form) {
    body = init.form;
  } else if (init?.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(init.body);
  }
  const response = await fetch(url, { method: init?.method ?? (body ? "POST" : "GET"), headers, body, credentials: "same-origin" });
  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!response.ok) {
    const message = (json as { error?: string } | null)?.error ?? `Request failed (${response.status}).`;
    throw Object.assign(new Error(message), { status: response.status, code: (json as { code?: string } | null)?.code });
  }
  return json as T;
}

export function notifyConversationsChanged() {
  window.dispatchEvent(new Event("omnia:conversations-changed"));
}

export function downloadText(filename: string, content: string, type = "text/markdown") {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatDate(ts: number, language: "en" | "ar" = "en") {
  return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ts));
}
