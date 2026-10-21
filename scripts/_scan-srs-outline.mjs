import fs from "fs";
import path from "path";

const xmlPath = "docs/_docx_extract/unzipped/word/document.xml";
const xml = fs.readFileSync(xmlPath, "utf8");

// Collect paragraph text + style
const paras = [];
const pRe = /<w:p[\s\S]*?<\/w:p>/g;
let m;
while ((m = pRe.exec(xml))) {
  const block = m[0];
  const style = (block.match(/<w:pStyle[^>]*w:val="([^"]+)"/) || [])[1] || "";
  const texts = [...block.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((x) => x[1]);
  const text = texts.join("").replace(/\s+/g, " ").trim();
  if (!text && !style.startsWith("Heading") && !/^[\d一二三四五六七八九十]+/.test(style)) continue;
  paras.push({ style, text });
}

const outline = paras.filter((p) =>
  /Heading|标题|heading/i.test(p.style) ||
  /^(第[一二三四五六七八九十百零\d]+[章节]|[\d.]+\s|详细功能|功能规范)/.test(p.text)
);

fs.writeFileSync(
  "docs/_docx_extract/outline.json",
  JSON.stringify({ totalParas: paras.length, outlineCount: outline.length, outline, sample: paras.slice(0, 120) }, null, 2),
  "utf8"
);
console.log("paras", paras.length, "outline", outline.length);
outline.slice(0, 80).forEach((p, i) => console.log(`${i}|${p.style}|${p.text.slice(0, 100)}`));
