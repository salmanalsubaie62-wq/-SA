"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Icon, type IconName } from "./Icon";
import { Toaster } from "./ui";
import { useI18n, type StringKey } from "@/lib/client/i18n";
import { api, notifyConversationsChanged } from "@/lib/client/api";

export interface ShellUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
}

const NAV: Array<{ href: string; key: StringKey; icon: IconName; section?: StringKey }> = [
  { href: "/dashboard", key: "nav_dashboard", icon: "dashboard" },
  { href: "/chat", key: "nav_chat", icon: "chat" },
  { href: "/images", key: "nav_images", icon: "image" },
  { href: "/video", key: "nav_video", icon: "video" },
  { href: "/research", key: "nav_research", icon: "research" },
  { href: "/documents", key: "nav_documents", icon: "docs" },
  { href: "/coding", key: "nav_coding", icon: "code" },
  { href: "/voice", key: "nav_voice", icon: "voice" },
  { href: "/agents", key: "nav_agents", icon: "agents" },
  { href: "/projects", key: "nav_projects", icon: "projects" },
  { href: "/memory", key: "nav_memory", icon: "memory" },
  { href: "/settings", key: "nav_settings", icon: "settings" },
];

interface ConvoRow {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: number;
}

const FEATURE_BY_HREF: Record<string, string> = {
  "/images": "image_studio",
  "/video": "video_studio",
  "/research": "research",
  "/documents": "documents",
  "/coding": "coding_lab",
  "/voice": "voice",
  "/agents": "agents",
  "/projects": "projects",
};

export function AppShell({ user, children, hiddenFeatures = [] }: { user: ShellUser; children: React.ReactNode; hiddenFeatures?: string[] }) {
  const { t, lang, setLang } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const current = NAV.find((n) => pathname.startsWith(n.href));
  const title = pathname.startsWith("/admin") ? t("nav_admin") : current ? t(current.key) : t("appName");

  const signOut = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Primary">
        <div className="brand">
          <div className="brand-name">{t("appName")}</div>
        </div>

        <Link href="/chat" className="btn btn-primary" style={{ width: "100%" }}>
          <Icon name="plus" size={16} />
          {t("new_chat")}
        </Link>

        <div className="sidebar-body">
        <nav className="nav" aria-label="Sections">
          {NAV.filter((item) => !hiddenFeatures.includes(FEATURE_BY_HREF[item.href] ?? "")).map((item) => (
            <Link key={item.href} href={item.href} aria-current={pathname.startsWith(item.href) ? "page" : undefined}>
              <Icon name={item.icon} size={17} />
              {t(item.key)}
            </Link>
          ))}
          {user.role === "admin" && (
            <Link href="/admin" aria-current={pathname.startsWith("/admin") ? "page" : undefined}>
              <Icon name="admin" size={17} />
              {t("nav_admin")}
            </Link>
          )}
        </nav>

        <ConversationSidebar currentPath={pathname} />
        </div>

        <div className="row-between" style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "0.88rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
            <div className="muted small" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
          </div>
          <button className="icon-btn" onClick={signOut} title={t("sign_out")} aria-label={t("sign_out")}>
            <Icon name="arrow" size={16} />
          </button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen((v) => !v)} aria-label={t("menu")}>
            <Icon name="menu" size={20} />
          </button>
          <div className="topbar-title">{title}</div>
          <div className="row" style={{ gap: 6 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              aria-label={t("language")}
              title={t("language")}
            >
              <Icon name="globe" size={15} />
              {lang === "en" ? "العربية" : "English"}
            </button>
          </div>
        </header>
        <div className={pathname.startsWith("/chat") ? "chat-area" : "content"}>{children}</div>
      </div>
      <Toaster />
    </div>
  );
}

function ConversationSidebar({ currentPath }: { currentPath: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<ConvoRow[] | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ conversations: Array<{ id: string; title: string; pinned: boolean; updatedAt: number }> }>(
        `/api/conversations${query ? `?q=${encodeURIComponent(query)}` : ""}`,
      );
      setRows(data.conversations);
    } catch {
      setRows([]);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(load, query ? 250 : 0);
    const onChange = () => load();
    window.addEventListener("omnia:conversations-changed", onChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("omnia:conversations-changed", onChange);
    };
  }, [load, query]);

  const togglePin = async (row: ConvoRow) => {
    await api(`/api/conversations/${row.id}`, { method: "PATCH", body: { pinned: !row.pinned } });
    notifyConversationsChanged();
  };

  const saveRename = async () => {
    if (!renaming || !renaming.title.trim()) return setRenaming(null);
    await api(`/api/conversations/${renaming.id}`, { method: "PATCH", body: { title: renaming.title.trim() } });
    setRenaming(null);
    notifyConversationsChanged();
  };

  const remove = async (row: ConvoRow) => {
    if (!window.confirm(`Delete "${row.title}"? This cannot be undone.`)) return;
    await api(`/api/conversations/${row.id}`, { method: "DELETE" });
    if (currentPath === `/chat/${row.id}`) router.push("/chat");
    notifyConversationsChanged();
  };

  return (
    <div className="sidebar-scroll">
      <div className="nav-section">{t("nav_chat")}</div>
      <label className="row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search_chats")}
          style={{ padding: "8px 10px", fontSize: "0.86rem" }}
          aria-label={t("search_chats")}
        />
      </label>
      <div className="convo-list">
        {rows === null && <div className="skeleton" style={{ height: 34 }} />}
        {rows?.map((row) => {
          const active = currentPath === `/chat/${row.id}`;
          return (
            <div key={row.id} className={`convo-item ${active ? "active" : ""}`}>
              {renaming?.id === row.id ? (
                <input
                  autoFocus
                  value={renaming.title}
                  onChange={(e) => setRenaming({ id: row.id, title: e.target.value })}
                  onBlur={saveRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename();
                    if (e.key === "Escape") setRenaming(null);
                  }}
                  style={{ padding: "5px 8px", fontSize: "0.86rem" }}
                  aria-label={t("rename")}
                />
              ) : (
                <>
                  {row.pinned && (
                    <span className="pin-dot" title={t("pin")}>
                      <Icon name="pin" size={12} />
                    </span>
                  )}
                  <Link href={`/chat/${row.id}`} className="convo-link">
                    {row.title}
                  </Link>
                  <div className="convo-actions">
                    <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => togglePin(row)} aria-label={row.pinned ? t("unpin") : t("pin")} title={row.pinned ? t("unpin") : t("pin")}>
                      <Icon name="pin" size={13} />
                    </button>
                    <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => setRenaming({ id: row.id, title: row.title })} aria-label={t("rename")} title={t("rename")}>
                      <Icon name="edit" size={13} />
                    </button>
                    <button className="icon-btn btn-danger" style={{ width: 26, height: 26 }} onClick={() => remove(row)} aria-label={t("delete")} title={t("delete")}>
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
        {rows && rows.length === 0 && <div className="muted small" style={{ padding: "6px 10px" }}>{t("no_conversations")}</div>}
      </div>
    </div>
  );
}
