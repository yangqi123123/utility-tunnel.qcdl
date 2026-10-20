import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("inspection data exposes locationTree and plan location fields", async () => {
  const source = await read("app/data/inspection-data.js");
  assert.match(source, /locationTree/);
  assert.match(source, /corridors:\s*\[/);
  assert.match(source, /window\.INSPECTION_DATA[\s\S]*locationTree/);
  assert.match(source, /corridor:\s*"高新大道综合管廊"/);
});

test("maintenance data exposes locationTree and plan location fields", async () => {
  const source = await read("app/data/maintenance-data.js");
  assert.match(source, /locationTree/);
  assert.match(source, /window\.MAINTENANCE_DATA[\s\S]*locationTree/);
  assert.match(source, /corridor:\s*"高新大道综合管廊"/);
});

test("inspection plan form and cascade helpers exist", async () => {
  const source = await read("app/components/inspection.js");
  assert.match(source, /data-location-level="corridor"/);
  assert.match(source, /data-location-level="room"/);
  assert.match(source, /data-location-level="section"/);
  assert.match(source, /data-location-level="pipeline"/);
  assert.match(source, /bindPlanLocationCascade/);
  assert.match(source, /\["所属管廊"/);
  assert.match(source, /\["所属舱室"/);
  assert.match(source, /\["所属区段"/);
  assert.match(source, /\["所属管线"/);
  assert.match(source, /corridor:\s*plan\.corridor/);
});

test("maintenance plan form and cascade helpers exist", async () => {
  const source = await read("app/components/maintenance.js");
  assert.match(source, /data-location-level="corridor"/);
  assert.match(source, /bindPlanLocationCascade/);
  assert.match(source, /\["所属管廊"/);
  assert.match(source, /corridor:\s*plan\.corridor/);
});

test("inspection css keeps plan cascade in grid flow", async () => {
  const source = await read("web/assets/css/inspection.css");
  assert.match(source, /\.inspection-plan-form\s+\.device-location-cascade[\s\S]*display:\s*contents/);
});
