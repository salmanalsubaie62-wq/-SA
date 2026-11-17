import React from "react";

/**
 * Safe Markdown renderer. Produces React elements only (no raw HTML injection),
 * and only allows http(s), mailto and relative links.
 */

type Block = React.ReactNode;

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\([^)\s]+\))|(https?:\/\/[^\s<)]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const token = m[0];
    const k = `${keyBase}-${i++}`;
    if (token.startsWith("`")) out.push(<code key={k}>{token.slice(1, -1)}</code>);
    else if (token.startsWith("**")) out.push(<strong key={k}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("*")) out.push(<em key={k}>{token.slice(1, -1)}</em>);
    else if (token.startsWith("[")) {
      const [, label, href] = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/) ?? [];
      out.push(safeLink(href, label, k));
    } else out.push(safeLink(token, token, k));
    last = m.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function safeLink(href: string, label: string, key: string): React.ReactNode {
  if (/^(https?:\/\/|mailto:)/i.test(href)) {
    return (
      <a key={key} href={href} target="_blank" rel="noopener noreferrer nofollow">
        {label}
      </a>
    );
  }
  return <span key={key}>{label}</span>;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  let key = 0;
  const k = () => `b${key++}`;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fence = line.match(/^```\s*([\w+#.-]*)\s*$/);
    if (fence) {
      const lang = fence[1];
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++]);
      i++; // closing fence
      blocks.push(
        <pre key={k()} className="code-block" data-lang={lang || "text"}>
          <div className="code-head">{lang || "text"}</div>
          <code>{body.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    // Heading
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const Tag = (`h${level + 2}` as "h3" | "h4" | "h5" | "h6");
      blocks.push(<Tag key={k()}>{renderInline(heading[2], `h${key}`)}</Tag>);
      i++;
      continue;
    }

    // Table (header row + separator)
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1]) && lines[i + 1].includes("|")) {
      const split = (row: string) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
      const header = split(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) rows.push(split(lines[i++]));
      blocks.push(
        <div key={k()} className="table-wrap">
          <table>
            <thead>
              <tr>{header.map((c, ci) => <th key={ci}>{renderInline(c, `th${key}-${ci}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, ci) => <td key={ci}>{renderInline(c, `td${key}-${ri}-${ci}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push(<blockquote key={k()}>{renderInline(body.join(" "), `q${key}`)}</blockquote>);
      continue;
    }

    // Lists
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
        items.push(lines[i++].replace(/^\s*([-*+]|\d+[.)])\s+/, ""));
      }
      const Tag = ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={k()}>
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `li${key}-${idx}`)}</li>
          ))}
        </Tag>,
      );
      continue;
    }

    // Paragraph
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,4}\s|>\s?|\s*([-*+]|\d+[.)])\s+)/.test(lines[i])) {
      para.push(lines[i++]);
    }
    if (para.length === 0) para.push(lines[i++]);
    blocks.push(<p key={k()}>{renderInline(para.join(" "), `p${key}`)}</p>);
  }

  return <div className="md">{blocks}</div>;
}
