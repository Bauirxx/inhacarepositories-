import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#F5F7F4",
    theme_color: siteConfig.themeColor,
    lang: "pt",
    categories: ["travel", "social", "shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Mapa", url: "/mapa", description: "Mapa interativo da ilha" },
      { name: "Feed", url: "/feed", description: "O que acontece na ilha" },
      { name: "Serviços", url: "/servicos", description: "Diretório de serviços" },
      { name: "Comunidade", url: "/comunidade", description: "Chat e grupos" },
    ],
  };
}
