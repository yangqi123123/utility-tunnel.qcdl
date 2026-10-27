import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

/** @deprecated graphic tab moved to fire-device-control; keep thin redirect of key contracts */
test("设备控制能力已迁至消防设备控制页", async () => {
  const page = await read("web/pages/monitoring/fire-device-control.html");
  assert.match(page, /设备智能控制/);
  assert.match(page, /设备控制记录/);
  assert.match(page, /CONTROLLABLE_TYPES/);

  const monitor = await read("web/pages/monitoring/fire-supervision.html");
  assert.doesNotMatch(monitor, /data-ias-view="graphic"/);
  assert.doesNotMatch(monitor, /id="iasGraphicView"/);
});
