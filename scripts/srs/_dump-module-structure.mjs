import fs from "fs";

const paras = JSON.parse(fs.readFileSync("docs/_docx_extract/detail-chapter.json", "utf8"));
// Rebuild full from scan - better re-scan from detailIdx
const xml = fs.readFileSync("docs/_docx_extract/unzipped/word/document.xml", "utf8");
const all = [];
const pRe = /<w:p[\s\S]*?<\/w:p>/g;
let m;
while ((m = pRe.exec(xml))) {
  const block = m[0];
  const style = (block.match(/<w:pStyle[^>]*w:val="([^"]+)"/) || [])[1] || "(none)";
  const texts = [...block.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((x) => x[1]);
  const text = texts.join("").replace(/\s+/g, " ").trim();
  const hasDrawing = /<w:drawing|<w:pict/.test(block);
  if (!text && !hasDrawing) continue;
  all.push({ style, text, hasDrawing });
}
const idx = all.findIndex((p) => p.text === "详细功能规范" && p.style === "2");
const rest = all.slice(idx);
const interesting = rest.filter((p) => ["2", "3", "4", "5"].includes(p.style) || p.hasDrawing);
interesting.forEach((p, i) => {
  console.log(`${p.style}|img=${p.hasDrawing ? 1 : 0}|${p.text.slice(0, 80)}`);
});
fs.writeFileSync("docs/_docx_extract/heading-tree.json", JSON.stringify(interesting, null, 2));
