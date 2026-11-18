"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import { BadgeCheck, List, LocateFixed, Map as MapIcon, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ContactButtons } from "@/components/shared/contact-buttons";
import { StarRating } from "@/components/shared/star-rating";
import { DynamicIcon } from "@/components/shared/dynamic-icon";
import { cn } from "@/lib/utils";
import type { BusinessCategory } from "@/types";
import type { MapBusiness } from "@/services/businesses";
import { categoryColor, ISLAND_BOUNDS, ISLAND_CENTER, MAP_STYLE_URL } from "./map-config";

interface InteractiveMapProps {
  businesses: MapBusiness[];
  categories: BusinessCategory[];
  initialCategory?: string | null;
  initialSelected?: string | null;
}

export function InteractiveMap({ businesses, categories, initialCategory, initialSelected }: InteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const userMarkerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [category, setCategory] = useState<string | null>(initialCategory ?? null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected ?? null);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return businesses.filter((b) => {
      if (category && b.category?.slug !== category) return false;
      if (q && !`${b.name} ${b.short_description ?? ""} ${b.address ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [businesses, category, query]);

  const selected = useMemo(() => businesses.find((b) => b.id === selectedId) ?? null, [businesses, selectedId]);

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: filtered.map((b) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [b.longitude!, b.latitude!] },
        properties: { id: b.id, name: b.name, color: categoryColor(b.category?.slug) },
      })),
    }),
    [filtered],
  );

  // Inicialização do mapa (carregamento dinâmico do MapLibre para reduzir o bundle inicial).
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    (async () => {
      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;
        map = new maplibre.Map({
          container: containerRef.current,
          style: MAP_STYLE_URL,
          center: ISLAND_CENTER,
          zoom: 11.4,
          minZoom: 8,
          maxZoom: 18,
          attributionControl: { compact: true },
          cooperativeGestures: false,
        });
        mapRef.current = map;
        map.addControl(new maplibre.NavigationControl({ showCompass: true }), "bottom-right");
        map.addControl(new maplibre.ScaleControl({ unit: "metric" }), "bottom-left");

        map.on("error", (e) => {
          if (!map?.loaded()) console.warn("[map]", e.error?.message);
        });

        map.on("load", () => {
          if (!map) return;
          map.addSource("businesses", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
            cluster: true,
            clusterRadius: 44,
            clusterMaxZoom: 15,
          });
          map.addLayer({
            id: "clusters",
            type: "circle",
            source: "businesses",
            filter: ["has", "point_count"],
            paint: {
              "circle-color": "#153E42",
              "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 30, 30],
              "circle-stroke-width": 3,
              "circle-stroke-color": "#E6B96A",
            },
          });
          map.addLayer({
            id: "cluster-count",
            type: "symbol",
            source: "businesses",
            filter: ["has", "point_count"],
            layout: { "text-field": "{point_count_abbreviated}", "text-size": 13, "text-font": ["Noto Sans Bold"] },
            paint: { "text-color": "#ffffff" },
          });
          map.addLayer({
            id: "points",
            type: "circle",
            source: "businesses",
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-color": ["get", "color"],
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 7, 16, 11],
              "circle-stroke-width": 2.5,
              "circle-stroke-color": "#ffffff",
            },
          });
          map.addLayer({
            id: "point-labels",
            type: "symbol",
            source: "businesses",
            filter: ["!", ["has", "point_count"]],
            minzoom: 13.5,
            layout: {
              "text-field": ["get", "name"],
              "text-size": 12,
              "text-offset": [0, 1.3],
              "text-anchor": "top",
              "text-font": ["Noto Sans Regular"],
              "text-max-width": 10,
            },
            paint: { "text-color": "#153E42", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
          });

          map.on("click", "clusters", async (e: MapLayerMouseEvent) => {
            const feature = e.features?.[0];
            if (!feature || !map) return;
            const source = map.getSource("businesses") as GeoJSONSource;
            const zoom = await source.getClusterExpansionZoom(feature.properties?.cluster_id);
            const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
            map.easeTo({ center: coords, zoom });
          });
          map.on("click", "points", (e: MapLayerMouseEvent) => {
            const id = e.features?.[0]?.properties?.id as string | undefined;
            if (id) setSelectedId(id);
          });
          for (const layer of ["clusters", "points"]) {
            map.on("mouseenter", layer, () => map && (map.getCanvas().style.cursor = "pointer"));
            map.on("mouseleave", layer, () => map && (map.getCanvas().style.cursor = ""));
          }
          setReady(true);
        });
      } catch (err) {
        console.error(err);
        setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // Atualiza os dados do mapa quando os filtros mudam.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource("businesses") as GeoJSONSource | undefined)?.setData(geojson);
  }, [geojson, ready]);

  // Centra no estabelecimento selecionado.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !selected) return;
    map.easeTo({ center: [selected.longitude!, selected.latitude!], zoom: Math.max(map.getZoom(), 14.5), duration: 600 });
  }, [selected, ready]);

  // Ajusta a vista a todos os resultados filtrados.
  const fitToResults = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (filtered.length === 0) {
      map.fitBounds(ISLAND_BOUNDS, { padding: 30 });
      return;
    }
    let [w, s, e, n] = [180, 90, -180, -90];
    filtered.forEach((b) => {
      w = Math.min(w, b.longitude!);
      e = Math.max(e, b.longitude!);
      s = Math.min(s, b.latitude!);
      n = Math.max(n, b.latitude!);
    });
    if (w === e && s === n) map.easeTo({ center: [w, s], zoom: 15 });
    else map.fitBounds([w, s, e, n], { padding: 60, maxZoom: 15 });
  }, [filtered]);

  useEffect(() => {
    if (ready && !initialSelected) fitToResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, category]);

  const locateMe = async () => {
    if (!("geolocation" in navigator)) {
      toast.error("O seu dispositivo não suporta geolocalização.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const map = mapRef.current;
        if (!map) return;
        const maplibre = await import("maplibre-gl");
        const lngLat: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        if (!userMarkerRef.current) {
          const el = document.createElement("div");
          el.className = "size-4 rounded-full border-[3px] border-white bg-[#2563eb] shadow-[0_0_0_6px_rgba(37,99,235,0.25)]";
          userMarkerRef.current = new maplibre.Marker({ element: el });
        }
        userMarkerRef.current.setLngLat(lngLat).addTo(map);
        map.easeTo({ center: lngLat, zoom: 15 });
      },
      (err) => {
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Autorize o acesso à localização para usar esta função."
            : "Não foi possível obter a sua localização.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className="relative flex h-[calc(100dvh-4rem-4rem-env(safe-area-inset-bottom))] flex-col md:h-[calc(100dvh-4rem)] md:flex-row">
      {/* Lista lateral (desktop) / vista de lista (mobile) */}
      <aside
        className={cn(
          "flex w-full flex-col border-r bg-card md:w-[340px] md:shrink-0 lg:w-[380px]",
          mobileView === "list" ? "flex-1" : "hidden md:flex",
        )}
      >
        <div className="space-y-3 border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar no mapa…"
              className="h-11 w-full rounded-xl border bg-background pr-3 pl-9 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              aria-label="Pesquisar no mapa"
            />
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} resultado(s)</p>
        </div>
        <ul className="flex-1 divide-y overflow-y-auto">
          {filtered.map((b) => {
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(b.id);
                    setMobileView("map");
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted",
                    selectedId === b.id && "bg-turquoise-light",
                  )}
                >
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: categoryColor(b.category?.slug) }}
                  >
                    <DynamicIcon name={b.category?.icon} className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ocean">{b.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {b.category?.name}
                      {b.address ? ` · ${b.address}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 ? (
            <li className="p-6 text-center text-sm text-muted-foreground">
              Nenhum estabelecimento georreferenciado corresponde aos filtros.
            </li>
          ) : null}
        </ul>
      </aside>

      {/* Mapa */}
      <div className={cn("relative flex-1", mobileView === "list" && "hidden md:block")}>
        <div ref={containerRef} className="absolute inset-0" aria-label="Mapa interativo da Ilha de Inhaca" role="region" />
        {failed ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted p-6 text-center text-sm text-muted-foreground">
            Não foi possível carregar o mapa. Verifique a sua ligação à Internet.
          </div>
        ) : !ready ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/60 text-sm text-muted-foreground">
            A carregar o mapa…
          </div>
        ) : null}

        {/* Filtros por categoria sobre o mapa */}
        <div className="scrollbar-none absolute inset-x-0 top-0 flex gap-2 overflow-x-auto p-3">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={cn(
              "h-10 shrink-0 rounded-full border px-4 text-sm font-medium shadow-sm",
              !category ? "border-ocean bg-ocean text-white" : "bg-card",
            )}
          >
            Todos
          </button>
          {categories.map((c) => {
            const active = category === c.slug;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(active ? null : c.slug)}
                className={cn(
                  "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap shadow-sm",
                  active ? "border-transparent text-white" : "bg-card",
                )}
                style={active ? { backgroundColor: categoryColor(c.slug) } : undefined}
              >
                <span style={active ? undefined : { color: categoryColor(c.slug) }} className="inline-flex">
                  <DynamicIcon name={c.icon} className="size-4" />
                </span>
                {c.name}
              </button>
            );
          })}
        </div>

        <div className="absolute top-16 right-3 flex flex-col gap-2">
          <Button size="icon" variant="outline" className="bg-card shadow" onClick={locateMe} aria-label="A minha localização">
            <LocateFixed />
          </Button>
          <Button size="icon" variant="outline" className="bg-card shadow" onClick={fitToResults} aria-label="Ver todos">
            <MapIcon />
          </Button>
        </div>

        {/* Ficha do estabelecimento selecionado */}
        {selected ? (
          <div className="absolute inset-x-3 bottom-3 z-10 mx-auto max-w-md animate-fade-up rounded-2xl border bg-card shadow-xl md:right-3 md:left-auto md:w-[360px]">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="absolute top-2 right-2 z-10 flex size-9 items-center justify-center rounded-full bg-black/40 text-white"
              aria-label="Fechar ficha"
            >
              <X className="size-4" />
            </button>
            <div className="flex gap-3 p-3">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                {selected.cover_url || selected.logo_url ? (
                  <Image src={(selected.cover_url || selected.logo_url)!} alt="" fill sizes="80px" className="object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center" style={{ backgroundColor: categoryColor(selected.category?.slug) }}>
                    <DynamicIcon name={selected.category?.icon} className="size-8 text-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 pr-8">
                <p className="text-xs font-semibold text-turquoise">{selected.category?.name}</p>
                <h3 className="flex items-center gap-1 font-bold text-ocean">
                  <span className="truncate">{selected.name}</span>
                  {selected.is_verified ? <BadgeCheck className="size-4 shrink-0 text-turquoise" aria-label="Verificado" /> : null}
                </h3>
                <StarRating value={Number(selected.rating_avg)} count={selected.rating_count} />
                {selected.short_description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{selected.short_description}</p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t p-3">
              <ContactButtons phone={selected.phone} whatsapp={selected.whatsapp} compact />
              <Button asChild size="sm" className="ml-auto">
                <Link href={`/servicos/${selected.slug}`}>Ver página</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Alternar mapa/lista em mobile */}
      <div className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 md:hidden" hidden={Boolean(selected) && mobileView === "map"}>
        <Button
          onClick={() => setMobileView((v) => (v === "map" ? "list" : "map"))}
          className="rounded-full shadow-lg"
          variant="default"
        >
          {mobileView === "map" ? (
            <>
              <List /> Lista
            </>
          ) : (
            <>
              <MapIcon /> Mapa
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
