/**
 * Rebuild「详细功能规范」in 科学岛管廊项目需求规格说明书V1.0.docx
 * using prototype requirement docs + screenshots. Preserves front matter.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.tools/package.json"));
const JSZip = require("jszip");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const docxPath = path.join(root, "docs/科学岛管廊项目需求规格说明书V1.0.docx");
const backupPath = path.join(root, "docs/科学岛管廊项目需求规格说明书V1.0.backup.docx");
const outTmpPath = path.join(root, "docs/科学岛管廊项目需求规格说明书V1.0-完整版.docx");
const outAltPath = path.join(root, "docs/科学岛管廊项目需求规格说明书V1.0.updated.docx");
const reqDocs = JSON.parse(fs.readFileSync(path.join(root, "docs/_docx_extract/req-docs.json"), "utf8"));
const shotManifest = JSON.parse(
  fs.readFileSync(path.join(root, "docs/_docx_extract/screenshots/manifest.json"), "utf8")
);
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
  const lines = String(text ?? "").split(/\n/).filter((x) => String(x).trim().length || x === "");
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

function htmlToPlain(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|tr|li|table)>/gi, "\n")
    .replace(/<th[^>]*>/gi, "【")
    .replace(/<\/th>/gi, "】")
    .replace(/<td[^>]*>/gi, "")
    .replace(/<\/td>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

function groupByTopModule(pages) {
  const groups = [];
  const map = new Map();
  for (const p of pages) {
    if (!p.hasDoc) continue;
    let groupLabel = p.labels[0];
    if (p.labels[0] === "综合管理平台" || p.labels[0] === "软件监控平台") {
      groupLabel = p.labels[1] || p.labels[0];
    }
    if (!map.has(groupLabel)) {
      const g = { label: groupLabel, pages: [] };
      map.set(groupLabel, g);
      groups.push(g);
    }
    map.get(groupLabel).pages.push(p);
  }
  return groups;
}

function shotsFor(key) {
  return shotManifest.find((m) => m.key === key)?.shots || [];
}

async function main() {
  log("start");
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(docxPath, backupPath);
    log("backup created");
  } else {
    log("backup exists");
  }

  log("load zip");
  // Prefer original backup as source of front matter
  const sourceBuf = fs.existsSync(backupPath) ? fs.readFileSync(backupPath) : fs.readFileSync(docxPath);
  const zip = await JSZip.loadAsync(sourceBuf);
  let documentXml = await zip.file("word/document.xml").async("string");
  let relsXml = await zip.file("word/_rels/document.xml.rels").async("string");
  log("loaded document.xml", documentXml.length);

  // Remove old media
  Object.keys(zip.files)
    .filter((f) => f.startsWith("word/media/"))
    .forEach((f) => zip.remove(f));
  relsXml = relsXml.replace(/<Relationship[^>]*Target="media\/[^"]*"[^>]*\/>/g, "");

  let maxRid = 0;
  for (const m of relsXml.matchAll(/Id="rId(\d+)"/g)) maxRid = Math.max(maxRid, Number(m[1]));
  let docPrId = 100;

  const imageRels = [];
  function addImage(absPath, caption) {
    if (!fs.existsSync(absPath)) return "";
    maxRid += 1;
    docPrId += 1;
    const rId = `rId${maxRid}`;
    const fileName = `image${maxRid}.png`;
    // PNG already compressed; STORE avoids re-deflate hang on 100+ screenshots
    zip.file(`word/media/${fileName}`, fs.readFileSync(absPath), { compression: "STORE" });
    imageRels.push({ rId, fileName });
    return buildImagePara(rId, caption, docPrId);
  }

  const groups = groupByTopModule(reqDocs);
  log("groups", groups.length, "pages", reqDocs.filter((p) => p.hasDoc).length);

  const parts = [pHeading("2", "详细功能规范")];

  for (const group of groups) {
    log("group", group.label, group.pages.length);
    parts.push(pHeading("3", group.label));
    const multi = group.pages.length > 1;

    for (const page of group.pages) {
      if (multi) parts.push(pHeading("4", page.title || page.label));
      const sectionStyle = multi ? "5" : "4";
      const shots = shotsFor(page.key);

      for (const sec of page.sections) {
        parts.push(pHeading(sectionStyle, sec.title));
        if (sec.type === "text") {
          parts.push(sec.text ? pBody(sec.text) : pBody("无"));
        } else if (sec.type === "html") {
          const plain = htmlToPlain(sec.html);
          // Cap extremely long GIS source text to keep docx workable; keep structure headings
          const capped = plain.length > 20000 ? `${plain.slice(0, 20000)}\n……（其余口径与原型需求说明抽屉一致，详见系统内需求说明）` : plain;
          parts.push(pBody(capped || "见原型需求说明中的数据来源模块。"));
        } else if (sec.type === "fields") {
          parts.push(fieldTable(sec.rows));
        } else {
          parts.push(pBody("无"));
        }

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
    }
  }

  const body = parts.join("");
  log("body xml chars", body.length, "images", imageRels.length);

  const bodyOpen = documentXml.indexOf("<w:body>");
  const bodyClose = documentXml.lastIndexOf("</w:body>");
  if (bodyOpen < 0 || bodyClose < 0) throw new Error("body not found");
  const bodyInner = documentXml.slice(bodyOpen + "<w:body>".length, bodyClose);

  // True <w:p> start (not <w:pPr>/<w:pStyle>)
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

  // Heading text may be split across multiple <w:t>; find style=2 paragraph whose joined text is 详细功能规范
  function findDetailChapterStart(xml) {
    let from = 0;
    while (true) {
      const styleIdx = xml.indexOf('w:val="2"', from);
      if (styleIdx < 0) return null;
      const pStart = findParagraphStart(xml, styleIdx);
      const pEnd = xml.indexOf("</w:p>", styleIdx);
      if (pStart < 0 || pEnd < 0 || pStart > styleIdx) {
        from = styleIdx + 1;
        continue;
      }
      const block = xml.slice(pStart, pEnd + "</w:p>".length);
      if (!block.includes('w:val="2"')) {
        from = styleIdx + 1;
        continue;
      }
      const text = [...block.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((t) => t[1]).join("");
      if (text.replace(/\s+/g, "") === "详细功能规范") {
        return { pStart, pEnd: pEnd + "</w:p>".length, text };
      }
      from = pEnd + 1;
    }
  }

  const mark = findDetailChapterStart(bodyInner);
  if (!mark) throw new Error("详细功能规范 heading paragraph not found");
  const markIdx = mark.pStart;
  const afterHeading = bodyInner.slice(mark.pEnd);
  const sectPrIdx = afterHeading.lastIndexOf("<w:sectPr");
  const sectPr = sectPrIdx >= 0 ? afterHeading.slice(sectPrIdx) : "";
  log("splice at", markIdx, "sectPr", sectPr.length);

  const newBodyInner = bodyInner.slice(0, markIdx) + body + sectPr;
  documentXml = documentXml.slice(0, bodyOpen + "<w:body>".length) + newBodyInner + documentXml.slice(bodyClose);

  // Ensure drawing namespaces exist on root for inline pictures
  if (!documentXml.includes('xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"')) {
    documentXml = documentXml.replace(
      "<w:document ",
      '<w:document xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" '
    );
  }
  log("new document.xml", documentXml.length);

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

  log("generate zip (STORE media)...");
  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 1 },
    streamFiles: true,
  });

  const targets = [outTmpPath, outAltPath, docxPath];
  const written = [];
  for (const target of targets) {
    try {
      fs.writeFileSync(target, out);
      written.push(target);
      log("wrote", target, out.length);
    } catch (e) {
      log("WARN skip locked:", path.basename(target), e.code || e.message);
    }
  }
  if (!written.length) throw new Error("all output paths locked; close WPS/Word and retry");

  console.log(
    JSON.stringify(
      {
        groups: groups.length,
        pages: reqDocs.filter((p) => p.hasDoc).length,
        images: imageRels.length,
        written,
        bytes: out.length,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
