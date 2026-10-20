import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const read = (p) => readFile(new URL(p, root), "utf8");

const pages = [
  ["web/pages/big-data/device-diagnosis.html", "bd"],
  ["web/pages/big-data/abnormal-warning.html", "bw"],
  ["web/pages/big-data/energy-analysis.html", "bd"],
];

for (const [file, prefix] of pages) {
  const html = await read(file);
  for (const id of ["Project", "Corridor", "Room", "Section", "Pipeline", "Start", "End"]) {
    assert.match(html, new RegExp(`id="${prefix}${id}"`), `${file} missing ${prefix}${id}`);
  }
  assert.match(html, /big-data-filters\.js/);
  assert.doesNotMatch(html, /设备类型/);
}

const energy = await read("web/pages/big-data/energy-analysis.html");
assert.match(energy, /能耗概览/);
assert.match(energy, /月度累计/);
assert.match(energy, /年度累计/);
assert.match(energy, /能耗分区统计/);
assert.match(energy, /近24hUPS电压变化趋势/);
assert.match(energy, /近24hUPS电流变化趋势/);
assert.match(energy, /data-detail-mode="region"/);
assert.match(energy, /按区域/);
assert.match(energy, /按设备/);
assert.match(energy, /data-bd-action="export"/);

const js = await read("app/components/big-data-energy.js");
assert.match(js, /detailMode = "region"/);
assert.match(js, /当前读数/);
assert.match(js, /exportCsv/);

const data = await read("app/data/big-data-energy-data.js");
assert.match(data, /usage: Math\.max\(0, Number\(row\.current\) - Number\(row\.previous\)\)/);
assert.match(data, /视频监控系统/);
assert.match(data, /电子巡更系统/);

const diag = await read("app/components/big-data-diagnosis.js");
assert.match(diag, /BIG_DATA_FILTERS\?\.mount\(\{ prefix: "bd" \}\)/);
assert.doesNotMatch(diag, /function initLocationCascade/);

const warn = await read("app/components/big-data-warning.js");
assert.match(warn, /BIG_DATA_FILTERS\?\.mount\(\{ prefix: "bw" \}\)/);
assert.doesNotMatch(warn, /function initLocationCascade/);

console.log("energy + unified filter smoke OK");
