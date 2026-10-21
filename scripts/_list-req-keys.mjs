import fs from "fs";

const s = fs.readFileSync("app/components/requirement.js", "utf8");
const keys = [...s.matchAll(/docs\["([^"]+)"\]\s*=\s*text\(\s*"([^"]+)"/g)].map((m) => ({
  key: m[1],
  title: m[2],
}));
console.log("docs count", keys.length);
keys.forEach((k) => console.log(`${k.key}\t${k.title}`));
fs.writeFileSync("docs/_docx_extract/req-keys.json", JSON.stringify(keys, null, 2));
