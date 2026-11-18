import { siteConfig } from "@/config/site";

export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty";

export const ISLAND_CENTER: [number, number] = [siteConfig.island.center.lng, siteConfig.island.center.lat];
export const ISLAND_BOUNDS = siteConfig.island.bounds.bbox;

/** Cor por categoria (slug). */
export const CATEGORY_COLORS: Record<string, string> = {
  "hoteis-resorts": "#153E42",
  "alojamento-local": "#2E6F73",
  "restaurantes-bares": "#E07A5F",
  praias: "#20A6A0",
  transportes: "#3D5A80",
  "guias-turisticos": "#8E6C2E",
  "comercio-local": "#C9962F",
  saude: "#C0392B",
  "pontos-turisticos": "#7B4B94",
  "servicos-comunitarios": "#4F7D3A",
};

export function categoryColor(slug: string | null | undefined): string {
  return (slug && CATEGORY_COLORS[slug]) || "#20A6A0";
}

/** Worker servido a partir de public/ (copiado por scripts/copy-maplibre-worker.mjs). */
export const MAPLIBRE_WORKER_URL = "/maplibre/maplibre-gl-worker.mjs";

/** Carrega o MapLibre dinamicamente e configura o URL do worker. */
export async function loadMaplibre() {
  const maplibre = await import("maplibre-gl");
  maplibre.setWorkerUrl(MAPLIBRE_WORKER_URL);
  return maplibre;
}
