import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { extractDocument } from "../src/lib/documents";

async function zip(files: Record<string, string>): Promise<Buffer> {
  const z = new JSZip();
  for (const [name, content] of Object.entries(files)) z.file(name, content);
  return z.generateAsync({ type: "nodebuffer" });
}

test("plain text, markdown and code files are read as UTF-8", async () => {
  const result = await extractDocument("notes.md", Buffer.from("# Hello\nمرحبا"));
  assert.equal(result.kind, "text");
  assert.match(result.text, /مرحبا/);
});

test("DOCX paragraphs are extracted with entities decoded", async () => {
  const buf = await zip({
    "word/document.xml": '<w:document><w:body><w:p><w:r><w:t>First &amp; foremost</w:t></w:r></w:p><w:p><w:r><w:t>Second</w:t></w:r></w:p></w:body></w:document>',
  });
  const result = await extractDocument("report.docx", buf);
  assert.equal(result.kind, "text");
  assert.match(result.text, /First & foremost/);
  assert.match(result.text, /Second/);
});

test("XLSX sheets are rendered as tab-separated rows using shared strings", async () => {
  const buf = await zip({
    "xl/sharedStrings.xml": "<sst><si><t>Name</t></si><si><t>Sales</t></si><si><t>Ali</t></si></sst>",
    "xl/worksheets/sheet1.xml": '<worksheet><sheetData><row><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row><c r="A2" t="s"><v>2</v></c><c r="B2"><v>1200</v></c></row></sheetData></worksheet>',
  });
  const result = await extractDocument("sales.xlsx", buf);
  assert.equal(result.kind, "text");
  assert.match(result.text, /Name\tSales/);
  assert.match(result.text, /Ali\t1200/);
});

test("PPTX slides are extracted in slide order", async () => {
  const buf = await zip({
    "ppt/slides/slide2.xml": "<p:sld><a:t>Second slide</a:t></p:sld>",
    "ppt/slides/slide1.xml": "<p:sld><a:t>Opening</a:t></p:sld>",
  });
  const result = await extractDocument("deck.pptx", buf);
  assert.equal(result.kind, "text");
  assert.ok(result.text.indexOf("Opening") < result.text.indexOf("Second slide"));
});

test("images and unsupported formats are classified, never guessed", async () => {
  assert.equal((await extractDocument("photo.jpg", Buffer.from([1, 2, 3]))).kind, "image");
  const legacy = await extractDocument("old.doc", Buffer.from("x"));
  assert.equal(legacy.kind, "unsupported");
  const audio = await extractDocument("talk.mp3", Buffer.from("x"));
  assert.equal(audio.kind, "unsupported");
});
