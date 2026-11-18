// Gera os ícones PWA, favicon e imagem Open Graph a partir de SVG (requer "sharp").
// Uso: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const iconsDir = path.join(root, "public", "icons");
const imagesDir = path.join(root, "public", "images");
await mkdir(iconsDir, { recursive: true });

const mark = (rounded = true, pad = 0) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${48 + pad * 2} ${48 + pad * 2}">
  <rect x="${-pad}" y="${-pad}" width="${48 + pad * 2}" height="${48 + pad * 2}" rx="${rounded ? 14 : 0}" fill="#153E42"/>
  <path d="M10 27c4-9 10-13 15-13 6 0 10 4 13 9-4-2-8-2-11 0-4 2-9 4-17 4z" fill="#E6B96A"/>
  <circle cx="31" cy="15.5" r="3" fill="#F5F7F4"/>
  <path d="M8 32c3 0 4.5-2 8-2s5 2 8 2 4.5-2 8-2 5 2 8 2" stroke="#20A6A0" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M12 37.5c2.5 0 3.8-1.6 6.5-1.6s4 1.6 6.5 1.6 3.8-1.6 6.5-1.6 4 1.6 5.5 1.6" stroke="#20A6A0" stroke-opacity=".6" stroke-width="2.2" fill="none" stroke-linecap="round"/>
</svg>`;

const render = (svg, size) => sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();

await writeFile(path.join(iconsDir, "icon-192.png"), await render(mark(true), 192));
await writeFile(path.join(iconsDir, "icon-512.png"), await render(mark(true), 512));
await writeFile(path.join(iconsDir, "icon-512-maskable.png"), await render(mark(false, 8), 512));
await writeFile(path.join(iconsDir, "apple-touch-icon.png"), await render(mark(false, 4), 180));
await writeFile(path.join(root, "src", "app", "icon.png"), await render(mark(true), 64));

const og = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d2b2e"/><stop offset=".55" stop-color="#153E42"/><stop offset="1" stop-color="#1b6b6b"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <path d="M0 520 Q300 470 600 520 T1200 520 V630 H0z" fill="#20A6A0" opacity=".5"/>
  <path d="M0 560 Q300 525 600 560 T1200 560 V630 H0z" fill="#E6B96A" opacity=".55"/>
  <g transform="translate(90 150) scale(3.4)">${mark(true).replace(/<\/?svg[^>]*>/g, "")}</g>
  <text x="290" y="235" font-family="Arial, Helvetica, sans-serif" font-size="84" font-weight="800" fill="#ffffff">INHACA</text>
  <text x="294" y="290" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="700" letter-spacing="14" fill="#E6B96A">CONNECT</text>
  <text x="90" y="420" font-family="Arial, Helvetica, sans-serif" font-size="40" fill="#F5F7F4">A ilha conectada. Uma comunidade, um destino.</text>
  <text x="90" y="470" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#9fd8d4">Ilha de Inhaca · Moçambique</text>
</svg>`;
await writeFile(path.join(imagesDir, "og-default.png"), await sharp(Buffer.from(og)).png().toBuffer());

console.log("Ícones e imagem OG gerados.");
