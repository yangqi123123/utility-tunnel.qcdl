/**
 * Patch only 13 pages into 科学岛管廊项目需求规格说明书V1.0-20261021.docx
 * - Replace: 入侵报警记录、联动记录
 * - Insert: 其余 11 个（含新建「电力监测系统」模块标题）
 * Leaves all other content untouched.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.tools/package.json"));
const JSZip = require("jszip");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const docxPath = path.join(root, "docs/科学岛管廊项目需求规格说明书V1.0-20261021.docx");
const outPath = path.join(root, "docs/科学岛管廊项目需求规格说明书V1.0-20261021.docx");
const outAltPath = path.join(root, "docs/科学岛管廊项目需求规格说明书V1.0-20261021-updated.docx");
const reqDocs = JSON.parse(fs.readFileSync(path.join(root, "docs/_docx_extract/req-docs.json"), "utf8"));
const shotManifest = JSON.parse(fs.readFileSync(path.join(root, "docs/_docx_extract/screenshots/manifest.json"), "utf8"));
const shotDir = path.join(root, "docs/_docx_extract/screenshots");
const SHOT_LABEL = { list: "页面列表", add: "新增", edit: "编辑", detail: "详情" };

function log(...args) {
  console.log(new Date().toISOString().slice(11, 19), ...args);
}

function esc(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pHeading(styleId, text) {
  const sz = styleId === "2" ? "32" : styleId === "3" ? "30" : styleId === "4" ? "32" : "30";
  return `<w:p><w:pPr><w:pStyle w:val="${styleId}"/></w:pPr><w:r><w:rPr><w:rFonts w:eastAsia="微软雅黑"/><w:b/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t>${esc(text)}</w:t></w:r></w:p>`;
}

function pBody(text) {
  const lines = String(text ?? "").split(/\n/);
  const usable = lines.length ? lines : [""];
  return usable
    .map((line) => {
      const t = line.trim() ? esc(line) : "";
      return `<w:p><w:pPr><w:pStyle w:val="16"/></w:pPr><w:r><w:rPr><w:rFonts w:hint="eastAsia" w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t${t ? ' xml:space="preserve"' : ""}>${t}</w:t></w:r></w:p>`;
    })
    .join("");
}

function fieldTable(rows) {
  if (!rows?.length) return pBody("无");
  const header = ["字段名称", "类型", "是否必填", "默认值", "取值范围"];
  const cell = (t, bold = false) =>
    `<w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:pStyle w:val="24"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体"/><w:sz w:val="20"/>${bold ? "<w:b/>" : ""}</w:rPr><w:t>${esc(t)}</w:t></w:r></w:p></w:tc>`;
  const tr = (cells, bold) => `<w:tr>${cells.map((c) => cell(c ?? "", bold)).join("")}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders>
    <w:top w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>
    <w:left w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>
    <w:bottom w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>
    <w:right w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>
    <w:insideH w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>
    <w:insideV w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>
  </w:tblBorders></w:tblPr>
  ${tr(header, true)}
  ${rows.map((r) => tr(r, false)).join("")}
  </w:tbl>`;
}

function buildImagePara(rId, caption, docPrId) {
  const w = 5578350;
  const h = Math.round((w * 900) / 1600);
  return `<w:p>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:r>
      <w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
          <wp:extent cx="${w}" cy="${h}"/>
          <wp:docPr id="${docPrId}" name="${esc(caption)}"/>
          <a:graphic>
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic>
                <pic:nvPicPr><pic:cNvPr id="0" name="${rId}.png"/><pic:cNvPicPr/></pic:nvPicPr>
                <pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
                <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>
  </w:p>
  <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体"/><w:sz w:val="18"/><w:i/></w:rPr><w:t>${esc(caption)}</w:t></w:r></w:p>`;
}

function getDoc(key) {
  const page = reqDocs.find((p) => p.key === key);
  if (!page?.hasDoc) throw new Error(`missing req doc: ${key}`);
  return page;
}

function shotsFor(key) {
  return shotManifest.find((m) => m.key === key)?.shots || [];
}

function findParagraphStart(xml, fromIdx) {
  let i = fromIdx;
  while (i >= 0) {
    i = xml.lastIndexOf("<w:p", i);
    if (i < 0) return -1;
    const ch = xml[i + 4];
    if (ch === ">" || ch === " " || ch === "/" || ch === "\t" || ch === "\n" || ch === "\r") return i;
    i -= 1;
  }
  return -1;
}

function paraText(block) {
  return [...block.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((t) => t[1]).join("").replace(/\s+/g, "");
}

function paraStyle(block) {
  const m = block.match(/w:pStyle[^>]*w:val="(\d+)"/);
  return m ? Number(m[1]) : null;
}

/** Index all heading paragraphs in bodyInner */
function indexHeadings(bodyInner) {
  const headings = [];
  let from = 0;
  while (true) {
    const styleIdx = bodyInner.indexOf("w:pStyle", from);
    if (styleIdx < 0) break;
    const valMatch = bodyInner.slice(styleIdx, styleIdx + 80).match(/w:val="(\d+)"/);
    if (!valMatch) {
      from = styleIdx + 1;
      continue;
    }
    const level = Number(valMatch[1]);
    if (level < 2 || level > 5) {
      from = styleIdx + 1;
      continue;
    }
    const pStart = findParagraphStart(bodyInner, styleIdx);
    const pEndTag = bodyInner.indexOf("</w:p>", styleIdx);
    if (pStart < 0 || pEndTag < 0 || pStart > styleIdx) {
      from = styleIdx + 1;
      continue;
    }
    const pEnd = pEndTag + "</w:p>".length;
    const block = bodyInner.slice(pStart, pEnd);
    if (!block.includes(`w:val="${level}"`)) {
      from = styleIdx + 1;
      continue;
    }
    const text = paraText(block);
    if (text) headings.push({ level, text, pStart, pEnd });
    from = pEnd;
  }
  return headings;
}

function findExactHeading(headings, level, text) {
  return headings.find((h) => h.level === level && h.text === text) || null;
}

/** Section ends at next heading with level <= sectionLevel */
function sectionEnd(headings, startHeading, bodyLen) {
  const idx = headings.indexOf(startHeading);
  for (let i = idx + 1; i < headings.length; i++) {
    if (headings[i].level <= startHeading.level) return headings[i].pStart;
  }
  // before sectPr if any
  return bodyLen;
}

function buildPageBlock(page, addImage, { includeH4 = true, h3Title = null } = {}) {
  const parts = [];
  if (h3Title) parts.push(pHeading("3", h3Title));
  if (includeH4) parts.push(pHeading("4", page.title || page.label));
  const shots = shotsFor(page.key);
  for (const sec of page.sections) {
    parts.push(pHeading("5", sec.title));
    if (sec.type === "fields") parts.push(fieldTable(sec.rows));
    else parts.push(pBody(sec.text || "无"));

    if (sec.title === "需求说明") {
      const list = shots.find((s) => s.kind === "list");
      if (list) parts.push(addImage(path.join(shotDir, list.file), `${page.title || page.label} - ${SHOT_LABEL.list}`));
    }
    if (sec.title === "交互动作") {
      for (const kind of ["add", "edit", "detail"]) {
        const shot = shots.find((s) => s.kind === kind);
        if (shot) parts.push(addImage(path.join(shotDir, shot.file), `${page.title || page.label} - ${SHOT_LABEL[kind]}`));
      }
    }
  }
  return parts.join("");
}

async function main() {
  log("load", path.basename(docxPath));
  const zip = await JSZip.loadAsync(fs.readFileSync(docxPath));
  let documentXml = await zip.file("word/document.xml").async("string");
  let relsXml = await zip.file("word/_rels/document.xml.rels").async("string");

  let maxRid = 0;
  for (const m of relsXml.matchAll(/Id="rId(\d+)"/g)) maxRid = Math.max(maxRid, Number(m[1]));
  // avoid colliding with existing docPr ids
  let docPrId = 5000 + Math.floor(Math.random() * 1000);
  const imageRels = [];

  function addImage(absPath, caption) {
    if (!fs.existsSync(absPath)) return "";
    maxRid += 1;
    docPrId += 1;
    const rId = `rId${maxRid}`;
    const fileName = `image${maxRid}.png`;
    zip.file(`word/media/${fileName}`, fs.readFileSync(absPath), { compression: "STORE" });
    imageRels.push({ rId, fileName });
    return buildImagePara(rId, caption, docPrId);
  }

  const bodyOpen = documentXml.indexOf("<w:body>");
  const bodyClose = documentXml.lastIndexOf("</w:body>");
  if (bodyOpen < 0 || bodyClose < 0) throw new Error("body not found");
  let bodyInner = documentXml.slice(bodyOpen + "<w:body>".length, bodyClose);

  const headings = indexHeadings(bodyInner);
  log("headings", headings.length);

  // Build splice ops: { at, deleteTo, xml } applied from end to start
  const ops = [];

  function replaceH4(title, key) {
    const h = findExactHeading(headings, 4, title);
    if (!h) throw new Error(`replace target missing: ${title}`);
    const end = sectionEnd(headings, h, bodyInner.length);
    // keep from before sectPr inside range
    let deleteTo = end;
    const slice = bodyInner.slice(h.pStart, end);
    const sectIn = slice.lastIndexOf("<w:sectPr");
    if (sectIn >= 0) deleteTo = h.pStart + sectIn;
    const page = getDoc(key);
    ops.push({ at: h.pStart, deleteTo, xml: buildPageBlock(page, addImage), label: `replace ${title}` });
  }

  function insertBefore(level, title, xml, label) {
    const h = findExactHeading(headings, level, title);
    if (!h) throw new Error(`insert marker missing: H${level} ${title}`);
    ops.push({ at: h.pStart, deleteTo: h.pStart, xml, label });
  }

  // --- REPLACE existing ---
  replaceH4("入侵报警记录", "intrusion-alarm.alarms");

  // 联动：在同一段替换中先插入智能联动/执行台，再写入更新后的联动记录（避免同位置 insert+replace 冲突）
  {
    const h = findExactHeading(headings, 4, "联动记录");
    if (!h) throw new Error("replace target missing: 联动记录");
    const end = sectionEnd(headings, h, bodyInner.length);
    let deleteTo = end;
    const slice = bodyInner.slice(h.pStart, end);
    const sectIn = slice.lastIndexOf("<w:sectPr");
    if (sectIn >= 0) deleteTo = h.pStart + sectIn;
    const xml = [
      buildPageBlock(getDoc("linkage.smart"), addImage),
      buildPageBlock(getDoc("linkage.execute"), addImage),
      buildPageBlock(getDoc("linkage.records"), addImage),
    ].join("");
    ops.push({ at: h.pStart, deleteTo, xml, label: "replace 联动记录 + insert 智能联动/执行台" });
  }

  // --- INSERT new pages (menu order within each marker) ---
  insertBefore(
    4,
    "环境联动记录",
    buildPageBlock(getDoc("environment-monitoring.control"), addImage),
    "insert 环境设备控制"
  );

  insertBefore(
    4,
    "入侵联动记录",
    [
      buildPageBlock(getDoc("intrusion-alarm.control"), addImage),
      buildPageBlock(getDoc("intrusion-alarm.algorithms"), addImage),
      buildPageBlock(getDoc("intrusion-alarm.deployments"), addImage),
    ].join(""),
    "insert 入侵设备控制/算法/布控"
  );

  insertBefore(4, "人员管理", buildPageBlock(getDoc("access-control.control"), addImage), "insert 门禁设备控制");
  insertBefore(4, "井盖报警记录", buildPageBlock(getDoc("manhole-cover.control"), addImage), "insert 井盖设备控制");

  // 电力监测系统 module did not exist — create H3 + page before 通信系统
  insertBefore(
    3,
    "通信系统",
    buildPageBlock(getDoc("power-monitor.control"), addImage, { h3Title: "电力监测系统" }),
    "insert 电力监测系统/电力设备控制"
  );

  insertBefore(4, "火灾报警记录", buildPageBlock(getDoc("fire-alarm.control"), addImage), "insert 火灾设备控制");
  insertBefore(4, "消防报警记录", buildPageBlock(getDoc("fire-monitor.control"), addImage), "insert 消防设备控制");

  // Apply from end so earlier offsets stay valid
  ops.sort((a, b) => b.at - a.at);
  for (const op of ops) {
    log(op.label, "at", op.at, "del", op.deleteTo - op.at, "ins", op.xml.length);
    bodyInner = bodyInner.slice(0, op.at) + op.xml + bodyInner.slice(op.deleteTo);
  }

  documentXml = documentXml.slice(0, bodyOpen + "<w:body>".length) + bodyInner + documentXml.slice(bodyClose);
  if (!documentXml.includes('xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"')) {
    documentXml = documentXml.replace(
      "<w:document ",
      '<w:document xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" '
    );
  }

  const relExtras = imageRels
    .map(
      (img) =>
        `<Relationship Id="${img.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${img.fileName}"/>`
    )
    .join("");
  relsXml = relsXml.replace("</Relationships>", `${relExtras}</Relationships>`);

  let ctypes = await zip.file("[Content_Types].xml").async("string");
  if (!ctypes.includes('Extension="png"')) {
    ctypes = ctypes.replace("</Types>", `<Default Extension="png" ContentType="image/png"/></Types>`);
  }

  zip.file("word/document.xml", documentXml, { compression: "DEFLATE" });
  zip.file("word/_rels/document.xml.rels", relsXml, { compression: "DEFLATE" });
  zip.file("[Content_Types].xml", ctypes, { compression: "DEFLATE" });

  log("generate zip...");
  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 1 },
    streamFiles: true,
  });

  const written = [];
  for (const target of [outPath, outAltPath]) {
    try {
      fs.writeFileSync(target, out);
      written.push(target);
      log("wrote", path.basename(target), out.length);
    } catch (e) {
      log("WARN skip locked:", path.basename(target), e.code || e.message);
    }
  }
  if (!written.length) throw new Error("all output paths locked; close WPS/Word and retry");

  // quick verify headings exist
  const verifyZip = await JSZip.loadAsync(out);
  const verifyXml = await verifyZip.file("word/document.xml").async("string");
  const names = [
    "环境设备控制",
    "入侵设备控制",
    "算法管理",
    "布控管理",
    "入侵报警记录",
    "门禁设备控制",
    "井盖设备控制",
    "电力设备控制",
    "电力监测系统",
    "火灾设备控制",
    "消防设备控制",
    "智能联动",
    "联动执行台",
    "联动记录",
  ];
  const found = {};
  for (const n of names) found[n] = verifyXml.includes(n);
  console.log(JSON.stringify({ ops: ops.length, images: imageRels.length, written, found }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
