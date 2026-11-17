import dns from "node:dns/promises";
import net from "node:net";

export interface SearchHit {
  title: string;
  url: string;
  snippet: string;
}

export function searchConnected(): boolean {
  return Boolean(process.env.BRAVE_SEARCH_API_KEY?.trim());
}

/** Web search through the Brave Search API (official API). Requires BRAVE_SEARCH_API_KEY. */
export async function searchWeb(query: string, count: number): Promise<SearchHit[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!key) throw new Error("Web search is not connected (set BRAVE_SEARCH_API_KEY).");
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(Math.min(Math.max(count, 1), 20)));
  const response = await fetch(url, {
    headers: { accept: "application/json", "x-subscription-token": key },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Web search returned ${response.status}.`);
  const json = (await response.json()) as { web?: { results?: Array<{ title?: string; url?: string; description?: string }> } };
  return (json.web?.results ?? [])
    .filter((r): r is { title: string; url: string; description?: string } => Boolean(r.url && r.title))
    .map((r) => ({ title: r.title, url: r.url, snippet: stripTags(r.description ?? "") }));
}

export function isPrivateAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  if (family === 6) {
    const lower = address.toLowerCase();
    return lower === "::1" || lower === "::" || lower.startsWith("fc") || lower.startsWith("fd") ||
      lower.startsWith("fe80") || lower.startsWith("::ffff:127.") || lower.startsWith("::ffff:10.") ||
      lower.startsWith("::ffff:192.168.");
  }
  return true;
}

/** Rejects URLs that resolve to private, loopback or link-local addresses (SSRF guard). */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http and https URLs are allowed.");
  if (url.username || url.password) throw new Error("URLs with credentials are not allowed.");
  const addresses = net.isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await dns.lookup(url.hostname, { all: true });
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new Error("That address is not publicly reachable.");
  return url;
}

export function stripTags(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/h\d>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

/** Fetches a public web page and returns its readable text (capped). */
export async function fetchPageText(raw: string, maxChars = 6000): Promise<{ url: string; title: string; text: string }> {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop < 4; hop++) {
    const response = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": "OMNIA-Research/1.0 (+research assistant)", accept: "text/html,text/plain" },
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      url = await assertPublicUrl(new URL(response.headers.get("location")!, url).toString());
      continue;
    }
    if (!response.ok) throw new Error(`Page returned ${response.status}.`);
    const type = response.headers.get("content-type") ?? "";
    if (!/text\/(html|plain)/.test(type)) throw new Error("Page is not a text document.");
    const body = (await response.text()).slice(0, 1_500_000);
    const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? url.hostname;
    const text = (type.includes("html") ? stripTags(body) : body).slice(0, maxChars);
    return { url: url.toString(), title: stripTags(title), text };
  }
  throw new Error("Too many redirects.");
}
