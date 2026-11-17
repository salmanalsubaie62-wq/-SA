const PATHS: Record<string, string> = {
  chat: "M4 5h16v11H8l-4 4V5z",
  image: "M4 5h16v14H4zM4 16l4-4 3 3 3-4 6 6M9 9.5a1.5 1.5 0 1 0 0-.01",
  video: "M4 6h11v12H4zM15 10l5-3v10l-5-3",
  research: "M11 4a7 7 0 1 0 4.4 12.4L20 20M11 8a3 3 0 1 1 0 6",
  docs: "M7 3h7l5 5v13H7zM14 3v5h5M9 13h7M9 17h7",
  code: "M8 8l-4 4 4 4M16 8l4 4-4 4M13 5l-2 14",
  voice: "M12 4a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  agents: "M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2l.9-5.5-4-3.9 5.5-.8z",
  projects: "M3 7h7l2 2h9v10H3z",
  memory: "M12 3a9 9 0 1 0 9 9M12 7v5l3 2M19 3v4h-4",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4",
  dashboard: "M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z",
  admin: "M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6zM9 12l2 2 4-4",
  plus: "M12 5v14M5 12h14",
  send: "M4 12l16-8-6 16-2-7z",
  stop: "M7 7h10v10H7z",
  copy: "M9 9h11v11H9zM4 15V4h11",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  pin: "M14 3l7 7-3 1-4 4 1 5-2 2-3-3-5 5-1-1 5-5-3-3 2-2 5 1 4-4 1-3z",
  search: "M11 4a7 7 0 1 0 4.4 12.4L20 20",
  mic: "M12 4a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  speaker: "M4 9h4l5-4v14l-5-4H4zM16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  upload: "M12 16V5M7 9l5-5 5 5M5 20h14",
  close: "M6 6l12 12M18 6L6 18",
  menu: "M4 7h16M4 12h16M4 17h16",
  check: "M5 12l4 4 9-9",
  refresh: "M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18",
  file: "M7 3h7l5 5v13H7zM14 3v5h5",
  team: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M17 14a6 6 0 0 1 4 6",
  logo: "M12 2l9 5v10l-9 5-9-5V7z",
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
