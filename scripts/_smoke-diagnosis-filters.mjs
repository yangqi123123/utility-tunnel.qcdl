/**
 * Smoke: device-diagnosis filter/day-axis wiring (static source checks).
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const read = (p) => readFile(new URL(p, root), "utf8");

const html = await read("web/pages/big-data/device-diagnosis.html");
const js = await read("app/components/big-data-diagnosis.js");

assert.match(html, /id="bdProject"/);
assert.match(html, /id="bdCorridor"/);
assert.match(html, /id="bdRoom"/);
assert.match(html, /id="bdStart"/);
assert.match(html, /id="bdEnd"/);
assert.match(html, /data-bd-action="query"/);
assert.match(html, /data-bd-action="reset"/);
assert.doesNotMatch(html, /今日|本月|本年/);
assert.doesNotMatch(html, /data-range-group/);
assert.match(html, /bd-scroll-chart/);
assert.match(html, /data-health-mode="time"/);
assert.match(html, /data-health-mode="system"/);

assert.match(js, /function dayKeysFromFilter/);
assert.match(js, /function initLocationCascade/);
assert.match(js, /function resetFilters/);
assert.match(js, /applyScrollWidth/);
assert.match(js, /data-bd-action/);
assert.doesNotMatch(js, /labelsFor\(/);
assert.doesNotMatch(js, /ranges\./);
assert.match(js, /buildMixedSeries\(items, statuses, doneKeys\)/);
assert.match(js, /initLocationCascade\(\);\s*resetFilters\(\);/);

console.log("diagnosis filter/day-axis smoke OK");
