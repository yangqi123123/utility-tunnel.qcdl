import fs from "fs";

const xml = fs.readFileSync("docs/_docx_extract/unzipped/word/styles.xml", "utf8");
const ids = ["1", "2", "3", "4", "5", "16", "24", "14", "15", "11"];
for (const id of ids) {
  const re = new RegExp(`<w:style[^>]*w:styleId="${id}"[\\s\\S]*?</w:style>`);
  const block = xml.match(re)?.[0] || "";
  const name = block.match(/<w:name[^>]*w:val="([^"]+)"/)?.[1];
  const sz = block.match(/<w:sz[^>]*w:val="([^"]+)"/)?.[1];
  const szCs = block.match(/<w:szCs[^>]*w:val="([^"]+)"/)?.[1];
  const fonts = [...block.matchAll(/<w:rFonts[^>]*\/>/g)].map((x) => x[0]);
  const bold = /<w:b[\s/]/.test(block);
  const basedOn = block.match(/<w:basedOn[^>]*w:val="([^"]+)"/)?.[1];
  console.log(JSON.stringify({ id, name, basedOn, sz, szCs, bold, fonts }, null, 0));
}
