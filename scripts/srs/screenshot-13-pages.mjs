/**
 * Screenshot only the 13 SRS target pages.
 */
import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import { chromium } from "../../.tools/node_modules/playwright/index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const allPages = JSON.parse(fs.readFileSync(path.join(root, "docs/_docx_extract/menu-pages.json"), "utf8"));
const KEYS = [
  "environment-monitoring.control",
  "intrusion-alarm.control",
  "intrusion-alarm.algorithms",
  "intrusion-alarm.deployments",
  "intrusion-alarm.alarms",
  "access-control.control",
  "manhole-cover.control",
  "power-monitor.control",
  "fire-alarm.control",
  "fire-monitor.control",
  "linkage.smart",
  "linkage.execute",
  "linkage.records",
];
const pages = KEYS.map((key) => allPages.find((p) => p.key === key)).filter(Boolean);
const shotDir = path.join(root, "docs/_docx_extract/screenshots");
fs.mkdirSync(shotDir, { recursive: true });

function contentType(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        if (urlPath === "/") urlPath = "/web/pages/gis/one-map.html";
        const filePath = path.join(root, urlPath.replace(/^\//, ""));
        if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.writeHead(404);
          res.end("not found");
          return;
        }
        res.writeHead(200, { "Content-Type": contentType(filePath) });
        fs.createReadStream(filePath).pipe(res);
      } catch (e) {
        res.writeHead(500);
        res.end(String(e));
      }
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

function safeName(key, suffix) {
  return `${key.replace(/[^\w.-]+/g, "_")}_${suffix}.png`;
}

async function tryClickAndShot(page, selectors, outPath) {
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    if ((await loc.count()) === 0) continue;
    try {
      if (!(await loc.isVisible())) continue;
      await loc.click({ timeout: 3000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: outPath, fullPage: false });
      const close = page.locator("[data-drawer-close], .app-drawer-close, button:has-text('取消'), button:has-text('关闭')").first();
      if (await close.count()) {
        try {
          await close.click({ timeout: 2000 });
        } catch {}
      } else {
        await page.keyboard.press("Escape");
      }
      await page.waitForTimeout(300);
      return true;
    } catch {
      try {
        await page.keyboard.press("Escape");
      } catch {}
    }
  }
  return false;
}

async function main() {
  const { server, port } = await startServer();
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);

  let manifest = [];
  const manifestPath = path.join(shotDir, "manifest.json");
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch {
      manifest = [];
    }
  }

  for (const item of pages) {
    const url = `${base}/${item.href.replace(/\\/g, "/")}`;
    const entry = { key: item.key, label: item.label, shots: [] };
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1800);
      const listFile = safeName(item.key, "list");
      await page.screenshot({ path: path.join(shotDir, listFile), fullPage: false });
      entry.shots.push({ kind: "list", file: listFile });

      if (
        await tryClickAndShot(
          page,
          ["button:has-text('新增')", "a:has-text('新增')", "[data-action='create']", "[data-action='add']"],
          path.join(shotDir, safeName(item.key, "add"))
        )
      ) {
        entry.shots.push({ kind: "add", file: safeName(item.key, "add") });
      }

      if (
        await tryClickAndShot(
          page,
          ["table button:has-text('详情')", "button:has-text('详情')", "a:has-text('详情')", "[data-action='detail']"],
          path.join(shotDir, safeName(item.key, "detail"))
        )
      ) {
        entry.shots.push({ kind: "detail", file: safeName(item.key, "detail") });
      }

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1000);
      if (
        await tryClickAndShot(
          page,
          ["table button:has-text('编辑')", "button:has-text('编辑')", "a:has-text('编辑')", "[data-action='edit']"],
          path.join(shotDir, safeName(item.key, "edit"))
        )
      ) {
        entry.shots.push({ kind: "edit", file: safeName(item.key, "edit") });
      }

      console.log(`OK ${item.key} shots=${entry.shots.map((s) => s.kind).join(",")}`);
    } catch (e) {
      entry.error = String(e.message || e);
      console.log(`FAIL ${item.key}: ${entry.error}`);
    }
    const idx = manifest.findIndex((m) => m.key === item.key);
    if (idx >= 0) manifest[idx] = entry;
    else manifest.push(entry);
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(shotDir, "manifest-13.json"), JSON.stringify(manifest.filter((m) => KEYS.includes(m.key)), null, 2));
  await browser.close();
  server.close();
  console.log(JSON.stringify({ requested: KEYS.length, captured: pages.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
