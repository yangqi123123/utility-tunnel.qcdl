import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.tools/package.json"));
const JSZip = require("jszip");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const docx = path.join(root, "docs/科学岛管廊项目需求规格说明书V1.0-20261021-updated.docx");

const zip = await JSZip.loadAsync(fs.readFileSync(docx));
const xml = await zip.file("word/document.xml").async("string");
const paras = [...xml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)].map((m) => m[0]);
const headings = [];
for (const p of paras) {
  const style = p.match(/w:pStyle[^>]*w:val="(\d+)"/);
  if (!style) continue;
  const level = Number(style[1]);
  if (level < 3 || level > 4) continue;
  const text = [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((t) => t[1]).join("").replace(/\s+/g, "");
  if (text) headings.push({ level, text });
}
const watch = new Set([
  "环境设备控制",
  "入侵设备控制",
  "算法管理",
  "布控管理",
  "入侵报警记录",
  "门禁设备控制",
  "井盖设备控制",
  "电力监测系统",
  "电力设备控制",
  "火灾设备控制",
  "消防设备控制",
  "智能联动",
  "联动执行台",
  "联动记录",
  "环境与设备监控",
  "入侵报警系统",
  "门禁系统",
  "智能井盖系统",
  "通信系统",
  "火灾报警系统",
  "消防监控系统",
  "联动管理系统",
]);
headings.forEach((h, i) => {
  if (watch.has(h.text)) console.log(String(i).padStart(3), `H${h.level}`, h.text);
});
