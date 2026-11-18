"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { loadMaplibre, MAP_STYLE_URL } from "./map-config";

/** Mini-mapa de leitura com um único marcador (páginas de detalhe). */
export function StaticLocationMap({ latitude, longitude, label }: { latitude: number; longitude: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import("maplibre-gl").Map | null = null;
    let cancelled = false;
    (async () => {
      const maplibre = await loadMaplibre();
      if (cancelled || !ref.current) return;
      map = new maplibre.Map({
        container: ref.current,
        style: MAP_STYLE_URL,
        center: [longitude, latitude],
        zoom: 15,
        interactive: true,
        cooperativeGestures: true,
        attributionControl: { compact: true },
      });
      new maplibre.Marker({ color: "#20A6A0" }).setLngLat([longitude, latitude]).addTo(map);
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [latitude, longitude]);
  return <div ref={ref} className="h-56 w-full overflow-hidden rounded-xl border sm:h-64" role="img" aria-label={`Localização de ${label}`} />;
}
