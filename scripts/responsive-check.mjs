// Verificação de responsividade: abre cada página em várias larguras, deteta
// scroll horizontal, elementos fora do ecrã e alvos de toque pequenos, e guarda capturas.
// Uso: BASE_URL=http://localhost:3000 node scripts/responsive-check.mjs [pasta-capturas]
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = process.argv[2] || "responsive-screenshots";
const WIDTHS = [
  { w: 360, h: 740, name: "mobile-360" },
  { w: 390, h: 844, name: "mobile-390" },
  { w: 768, h: 1024, name: "tablet-768" },
  { w: 1024, h: 768, name: "desktop-1024" },
  { w: 1440, h: 900, name: "desktop-1440" },
  { w: 844, h: 390, name: "landscape-844" },
];
const PAGES = [
  "/",
  "/descobrir",
  "/descobrir/historia",
  "/mapa",
  "/feed",
  "/servicos",
  "/agenda",
  "/agenda?vista=calendario",
  "/mercado",
  "/comunidade",
  "/comunidade/ajuda",
  "/comunidade/grupos/transportes",
  "/pesquisa?q=praia",
  "/sobre",
  "/entrar",
  "/registar",
  "/recuperar",
  "/offline",
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
let problems = 0;

for (const vp of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1, isMobile: vp.w < 768, hasTouch: vp.w < 1024 });
  const page = await ctx.newPage();
  for (const p of PAGES) {
    await page.goto(BASE + p, { waitUntil: "load" });
    await page.waitForTimeout(p === "/mapa" ? 2500 : 400);
    const r = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflow = doc.scrollWidth - doc.clientWidth;
      const offenders = [];
      if (overflow > 1) {
        for (const el of document.querySelectorAll("body *")) {
          const b = el.getBoundingClientRect();
          if (b.right > doc.clientWidth + 1 && b.width > 0 && getComputedStyle(el).position !== "fixed") {
            // ignora descendentes de contentores com overflow controlado
            let p = el.parentElement;
            let clipped = false;
            while (p && p !== document.body) {
              const o = getComputedStyle(p).overflowX;
              if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") {
                clipped = true;
                break;
              }
              p = p.parentElement;
            }
            if (!clipped) offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
          }
        }
      }
      const small = [];
      for (const el of document.querySelectorAll("a, button, input, select, textarea")) {
        const b = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        if (b.width === 0 || s.visibility === "hidden" || s.display === "none") continue;
        if (el.closest("footer, nav[aria-label='Paginação'], .maplibregl-ctrl, p, li > a.text-xs")) continue;
        if (el.matches("a") && s.display === "inline") continue; // ligações em texto corrido
        if (b.height < 32 || b.width < 32) small.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`);
      }
      return { overflow, offenders: offenders.slice(0, 5), small: small.slice(0, 5), title: document.title };
    });
    const file = path.join(OUT, `${vp.name}${p.replace(/[/?=&]/g, "_") || "_home"}.png`);
    if ([360, 1440].includes(vp.w)) await page.screenshot({ path: file, fullPage: p !== "/mapa" });
    const bad = r.overflow > 1;
    if (bad) problems++;
    console.log(`${bad ? "✗" : "✓"} ${vp.name.padEnd(14)} ${p.padEnd(32)} overflow=${r.overflow}${bad ? " " + r.offenders.join(" | ") : ""}${r.small.length && vp.w < 768 ? "  small: " + r.small.join("; ") : ""}`);
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${problems} página(s)/largura(s) com scroll horizontal`);
process.exit(problems ? 1 : 0);
