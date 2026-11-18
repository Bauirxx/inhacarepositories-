// Copia o Web Worker do MapLibre para public/ (o worker é resolvido em runtime e
// não sobrevive ao empacotamento do Turbopack). Executado antes de dev/build.
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = path.join(root, "node_modules", "maplibre-gl", "dist", "maplibre-gl-worker.mjs");
const dir = path.join(root, "public", "maplibre");
await mkdir(dir, { recursive: true });
await copyFile(src, path.join(dir, "maplibre-gl-worker.mjs"));
console.log("maplibre worker copiado para public/maplibre/");
