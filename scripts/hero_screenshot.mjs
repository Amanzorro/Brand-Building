/* Regenerate the homepage hero image from the Workbench demo pack (synthetic data).

   Usage:
     python3 -m http.server 8000            # in the repository root, in another terminal
     node scripts/hero_screenshot.mjs [http://localhost:8000]

   Needs Playwright with Chromium installed where Node can find it (it is not a site
   dependency). Writes assets/img/workbench-results.webp and a JPEG fallback,
   assets/img/workbench-results.jpg. Run it again whenever the Workbench results page changes. */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.argv[2] || "http://localhost:8000").replace(/\/$/, "");
const WIDTH = 1040; // output width in pixels (shown at about 520 CSS pixels)

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 1400 }, deviceScaleFactor: 2, colorScheme: "light", reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto(BASE + "/try/workbench.html");
await page.click("[data-action=load-demo]");
await page.waitForSelector("[data-panel=\"2\"] table");
await page.click(".wb-steps button[data-step=\"4\"]");
await page.waitForSelector(".wb-findings .wb-finding");

// From the status line ("Demo pack · 61 rows") down to the explanation of the first finding.
const top = await page.locator("#wb-status").boundingBox();
const end = await page.locator(".wb-findings .wb-finding > p").first().boundingBox();
const left = await page.locator("[data-panel=\"4\"]").boundingBox();
const clip = { x: left.x - 12, y: top.y - 14, width: left.width + 24, height: end.y + end.height - top.y + 16 };
const png = await page.screenshot({ clip });

// Encode in the browser so no image library is needed.
const out = await page.evaluate(async ({ b64, width }) => {
  const img = new Image();
  img.src = "data:image/png;base64," + b64;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = width;
  c.height = Math.round(img.height * width / img.width);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return { webp: c.toDataURL("image/webp", 0.82), jpg: c.toDataURL("image/jpeg", 0.84), w: c.width, h: c.height };
}, { b64: png.toString("base64"), width: WIDTH });

for (const [ext, url] of [["webp", out.webp], ["jpg", out.jpg]]) {
  const file = path.join(ROOT, "assets", "img", "workbench-results." + ext);
  writeFileSync(file, Buffer.from(url.split(",")[1], "base64"));
  console.log("wrote", path.relative(ROOT, file));
}
console.log("size", out.w + "x" + out.h);
if (errors.length) { console.error("page errors:", errors); process.exitCode = 1; }
await browser.close();
