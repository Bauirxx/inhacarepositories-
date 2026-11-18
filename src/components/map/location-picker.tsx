"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { Crosshair, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ISLAND_CENTER, loadMaplibre, MAP_STYLE_URL } from "./map-config";

/**
 * Seletor de coordenadas: toque/clique no mapa ou arraste o marcador.
 * As coordenadas são fornecidas pelo próprio prestador e validadas pela
 * administração antes da publicação.
 */
export function LocationPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  onChange: (coords: { latitude: number | null; longitude: number | null }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let map: MapLibreMap | null = null;
    let cancelled = false;
    (async () => {
      const maplibre = await loadMaplibre();
      if (cancelled || !containerRef.current) return;
      const hasCoords = latitude != null && longitude != null;
      map = new maplibre.Map({
        container: containerRef.current,
        style: MAP_STYLE_URL,
        center: hasCoords ? [longitude!, latitude!] : ISLAND_CENTER,
        zoom: hasCoords ? 15 : 11.5,
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "bottom-right");

      const marker = new maplibre.Marker({ color: "#20A6A0", draggable: true });
      markerRef.current = marker;
      if (hasCoords) marker.setLngLat([longitude!, latitude!]).addTo(map);

      marker.on("dragend", () => {
        const ll = marker.getLngLat();
        onChangeRef.current({ latitude: round(ll.lat), longitude: round(ll.lng) });
      });
      map.on("click", (e) => {
        marker.setLngLat(e.lngLat).addTo(map!);
        onChangeRef.current({ latitude: round(e.lngLat.lat), longitude: round(e.lngLat.lng) });
      });
      map.on("load", () => setReady(true));
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
    // Inicializa apenas uma vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) return toast.error("Geolocalização indisponível.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapRef.current;
        const marker = markerRef.current;
        if (!map || !marker) return;
        const ll: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        marker.setLngLat(ll).addTo(map);
        map.easeTo({ center: ll, zoom: 16 });
        onChangeRef.current({ latitude: round(ll[1]), longitude: round(ll[0]) });
      },
      () => toast.error("Não foi possível obter a localização."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const clear = () => {
    markerRef.current?.remove();
    onChange({ latitude: null, longitude: null });
  };

  return (
    <div className="space-y-2">
      <div className="relative h-64 overflow-hidden rounded-xl border sm:h-80">
        <div className="absolute inset-0">
          <div ref={containerRef} className="size-full" />
        </div>
        {!ready ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-sm text-muted-foreground">
            A carregar o mapa…
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
          <Crosshair /> Usar a minha localização
        </Button>
        {latitude != null && longitude != null ? (
          <>
            <span className="text-xs text-muted-foreground">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={clear}>
              <Trash2 /> Limpar
            </Button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Toque no mapa para marcar a localização exata.</span>
        )}
      </div>
    </div>
  );
}

function round(n: number) {
  return Math.round(n * 1e6) / 1e6;
}
