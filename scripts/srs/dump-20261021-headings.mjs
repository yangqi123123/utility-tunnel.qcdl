/**
 * Dump heading outline from 科学岛管廊项目需求规格说明书V1.0-20261021.docx
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.tools/package.json"));
const JSZip = require("jszip");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const docxPath = path.join(root, "docs/科学岛管廊项目需求规格说明书V1.0-20261021.docx");

const TARGETS = [
  "环境设备控制",
  "入侵设备控制",
  "算法管理",
  "布控管理",
  "入侵报警记录",
  "门禁设备控制",
  "井盖设备控制",
  "电力设备控制",
  "火灾设备控制",
  "消防设备控制",
  "智能联动",
  "联动执行台",
  "联动记录",
];

async function main() {
  const zip = await JSZip.loadAsync(fs.readFileSync(docxPath));
  const xml = await zip.file("word/document.xml").async("string");
  const paras = [...xml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)].map((m) => m[0]);
  const headings = [];
  for (const p of paras) {
    const style = p.match(/w:pStyle[^>]*w:val="(\d+)"/);
    if (!style) continue;
    const level = Number(style[1]);
    if (level < 1 || level > 5) continue;
    const text = [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((t) => t[1]).join("").replace(/\s+/g, "");
    if (!text) continue;
    headings.push({ level, text, index: headings.length });
  }

  const outDir = path.join(root, "docs/_docx_extract");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "headings-20261021.json"), JSON.stringify(headings, null, 2), "utf8");

  const hits = [];
  for (const name of TARGETS) {
    const found = headings.filter((h) => h.text === name || h.text.includes(name));
    hits.push({ name, found });
  }
  console.log(JSON.stringify({ totalHeadings: headings.length, hits }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
