import fs from "fs";

const xml = fs.readFileSync("docs/_docx_extract/unzipped/word/document.xml", "utf8");
const paras = [];
const pRe = /<w:p[\s\S]*?<\/w:p>/g;
let m;
while ((m = pRe.exec(xml))) {
  const block = m[0];
  const style = (block.match(/<w:pStyle[^>]*w:val="([^"]+)"/) || [])[1] || "(none)";
  const texts = [...block.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((x) => x[1]);
  const text = texts.join("").replace(/\s+/g, " ").trim();
  const hasDrawing = /<w:drawing|<w:pict/.test(block);
  if (!text && !hasDrawing) continue;
  paras.push({ style, text: text.slice(0, 200), hasDrawing });
}

// Find 详细功能规范 index
const idx = paras.findIndex((p) => p.text.includes("详细功能规范") && !p.text.includes("目录"));
console.log("detailIdx", idx, paras[idx]);

// Style frequency
const freq = {};
paras.forEach((p) => { freq[p.style] = (freq[p.style] || 0) + 1; });
console.log("styles", Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20));

// Dump from 详细功能规范 for 200 items
const slice = paras.slice(Math.max(0, idx), idx + 250);
fs.writeFileSync("docs/_docx_extract/detail-chapter.json", JSON.stringify(slice, null, 2), "utf8");
slice.forEach((p, i) => {
  if (p.hasDrawing || /^(第|[0-9]+(\.[0-9]+)*)/.test(p.text) || p.style !== "(none)") {
    console.log(`${i}|${p.style}|img=${p.hasDrawing}|${p.text}`);
  }
});

// List all heading-like in whole doc after TOC
console.log("\n=== ALL numbered headings ===");
paras.forEach((p, i) => {
  if (/^(\d+(\.\d+)*\.?\s|第[一二三四五六七八九十]+章)/.test(p.text) || p.style === "2" || p.style === "3" || p.style === "4") {
    console.log(`${i}|${p.style}|${p.text.slice(0, 120)}`);
  }
});
