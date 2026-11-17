import JSZip from "jszip";
import path from "node:path";

export type Extracted =
  | { kind: "text"; text: string }
  | { kind: "image"; text: "" }
  | { kind: "unsupported"; text: ""; reason: string };

const TEXT_EXT = new Set([
  "txt", "md", "markdown", "csv", "tsv", "json", "xml", "html", "htm", "css", "js", "jsx", "ts", "tsx",
  "py", "java", "c", "cpp", "h", "hpp", "cs", "php", "rb", "go", "rs", "sql", "sh", "yml", "yaml", "toml", "ini", "log",
]);
const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_TEXT_CHARS = 200_000;

export function extensionOf(name: string): string {
  return path.extname(name).replace(".", "").toLowerCase();
}

export function imageMime(ext: string): string {
  if (ext === "jpg") return "image/jpeg";
  return `image/${ext}`;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

function xmlTexts(xml: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(decodeEntities(m[1]));
  return out;
}

async function extractDocx(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("Not a valid DOCX file.");
  const withBreaks = xml.replace(/<\/w:p>/g, "\n").replace(/<w:tab\/>/g, "\t");
  return decodeEntities(withBreaks.replace(/<[^>]+>/g, "")).replace(/\n{3,}/g, "\n\n").trim();
}

async function extractPptx(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const slides = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/(\d+)\.xml$/)![1]) - Number(b.match(/(\d+)\.xml$/)![1]));
  const parts: string[] = [];
  for (const name of slides) {
    const xml = await zip.file(name)!.async("string");
    parts.push(`## ${name.split("/").pop()}\n` + xmlTexts(xml, "a:t").join(" "));
  }
  if (!parts.length) throw new Error("No slides found in this PPTX file.");
  return parts.join("\n\n");
}

async function extractXlsx(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  // Each shared string may hold rich-text runs; join all of its <t> text nodes.
  const shared = zip.file("xl/sharedStrings.xml")
    ? xmlTexts(await zip.file("xl/sharedStrings.xml")!.async("string"), "si").map((si) => xmlTexts(si, "t").join(""))
    : [];
  const sheetNames = Object.keys(zip.files)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/(\d+)\.xml$/)![1]) - Number(b.match(/(\d+)\.xml$/)![1]));
  if (!sheetNames.length) throw new Error("No worksheets found in this XLSX file.");
  const out: string[] = [];
  for (const [index, name] of sheetNames.entries()) {
    const xml = await zip.file(name)!.async("string");
    out.push(`## Sheet ${index + 1}`);
    const rows = xml.match(/<row[\s>][\s\S]*?<\/row>/g) ?? [];
    for (const row of rows) {
      const cells: string[] = [];
      const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
      let c: RegExpExecArray | null;
      while ((c = cellRe.exec(row))) {
        const attrs = c[1];
        const body = c[2] ?? "";
        const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
        const inline = body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1];
        if (/t="s"/.test(attrs)) cells.push(shared[Number(v)] ?? "");
        else if (inline !== undefined) cells.push(decodeEntities(inline));
        else cells.push(decodeEntities(v));
      }
      out.push(cells.join("\t"));
    }
  }
  return out.join("\n");
}

async function extractPdf(buf: Buffer): Promise<string> {
  const { extractText } = await import("unpdf");
  const result = await extractText(new Uint8Array(buf), { mergePages: true });
  const text = Array.isArray(result.text) ? result.text.join("\n\n") : result.text;
  return text.trim();
}

/** Extracts readable text from an uploaded file. Unsupported formats are reported, never guessed. */
export async function extractDocument(name: string, buf: Buffer): Promise<Extracted> {
  const ext = extensionOf(name);
  if (buf.length > MAX_UPLOAD_BYTES) return { kind: "unsupported", text: "", reason: "File is larger than 15 MB." };
  if (IMAGE_EXT.has(ext)) return { kind: "image", text: "" };
  let text: string;
  if (TEXT_EXT.has(ext)) text = buf.toString("utf8");
  else if (ext === "pdf") text = await extractPdf(buf);
  else if (ext === "docx") text = await extractDocx(buf);
  else if (ext === "pptx") text = await extractPptx(buf);
  else if (ext === "xlsx") text = await extractXlsx(buf);
  else if (ext === "doc" || ext === "xls" || ext === "ppt")
    return { kind: "unsupported", text: "", reason: "Legacy binary Office formats are not supported yet. Save as DOCX, XLSX or PPTX." };
  else if (["mp3", "wav", "m4a", "ogg", "mp4", "mov", "webm"].includes(ext))
    return { kind: "unsupported", text: "", reason: "Audio and video analysis is not connected yet." };
  else return { kind: "unsupported", text: "", reason: `Files of type .${ext || "unknown"} are not supported.` };
  if (text.length > MAX_TEXT_CHARS) text = text.slice(0, MAX_TEXT_CHARS) + "\n\n[Truncated: document exceeds the analysis limit]";
  return { kind: "text", text };
}
