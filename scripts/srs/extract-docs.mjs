/**
 * Evaluate requirement.js in a mocked browser and export structured docs + menu tree.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function loadMenu() {
  const code = fs.readFileSync(path.join(root, "app/config/menu.js"), "utf8");
  const sandbox = { window: {}, console };
  vm.runInNewContext(code, sandbox);
  return sandbox.window.APP_MENU;
}

function flattenMenu(items, parentLabels = [], out = []) {
  for (const item of items || []) {
    if (item.hidden) continue;
    const labels = [...parentLabels, item.label];
    if (item.href) {
      const href = item.href.replace(/^\.\.\//, "web/pages/");
      out.push({ key: item.key, label: item.label, labels, href, path: path.join(root, href) });
    }
    if (item.children?.length) flattenMenu(item.children, labels, out);
  }
  return out;
}

function extractDocs() {
  let code = fs.readFileSync(path.join(root, "app/components/requirement.js"), "utf8");
  // Expose docs before IIFE ends
  code = code.replace(
    /document\.addEventListener\("DOMContentLoaded"/,
    'globalThis.__REQ_DOCS__ = docs;\ndocument.addEventListener("DOMContentLoaded"'
  );
  const sandbox = {
    console,
    globalThis: {},
    window: {
      openAppDrawer: () => {},
    },
    document: {
      body: { dataset: {}, append() {} },
      addEventListener() {},
      createElement() {
        return {
          className: "",
          type: "",
          setAttribute() {},
          addEventListener() {},
          innerHTML: "",
        };
      },
    },
  };
  sandbox.globalThis = sandbox;
  sandbox.window.document = sandbox.document;
  vm.runInNewContext(code, sandbox);
  return sandbox.globalThis.__REQ_DOCS__ || sandbox.__REQ_DOCS__;
}

const menu = loadMenu();
const pages = flattenMenu(menu);
const docs = extractDocs();

const exportPages = pages.map((p) => {
  const doc = docs[p.key];
  if (!doc) return { ...p, hasDoc: false };
  const sections = doc.sections.map(([title, content]) => {
    if (content && typeof content === "object" && content.__html) {
      return { title, type: "html", html: content.__html };
    }
    if (Array.isArray(content)) {
      return { title, type: "fields", rows: content };
    }
    return { title, type: "text", text: content == null ? "" : String(content) };
  });
  return {
    key: p.key,
    label: p.label,
    labels: p.labels,
    href: p.href,
    title: doc.title,
    hasDoc: true,
    sections,
  };
});

const outDir = path.join(root, "docs/_docx_extract");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "menu-pages.json"), JSON.stringify(pages, null, 2));
fs.writeFileSync(path.join(outDir, "req-docs.json"), JSON.stringify(exportPages, null, 2));

const missing = exportPages.filter((p) => !p.hasDoc).map((p) => p.key);
const withDoc = exportPages.filter((p) => p.hasDoc).length;
console.log(JSON.stringify({ pages: pages.length, withDoc, missing }, null, 2));
