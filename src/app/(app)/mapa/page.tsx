import type { Metadata } from "next";
import { InteractiveMap } from "@/components/map/interactive-map";
import { createClient } from "@/lib/supabase/server";
import { listBusinessCategories, listMapBusinesses } from "@/services/businesses";

export const metadata: Metadata = {
  title: "Mapa interativo",
  description: "Mapa da Ilha de Inhaca com hotéis, restaurantes, praias, transportes, guias, comércio e serviços.",
  alternates: { canonical: "/mapa" },
};

export default async function MapPage({ searchParams }: PageProps<"/mapa">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [businesses, categories] = await Promise.all([listMapBusinesses(supabase), listBusinessCategories(supabase)]);
  const categoria = typeof sp.categoria === "string" ? sp.categoria : null;
  const local = typeof sp.local === "string" && businesses.some((b) => b.id === sp.local) ? sp.local : null;
  return (
    <>
      <h1 className="sr-only">Mapa interativo da Ilha de Inhaca</h1>
      <InteractiveMap
        businesses={businesses}
        categories={categories}
        initialCategory={categories.some((c) => c.slug === categoria) ? categoria : null}
        initialSelected={local}
      />
    </>
  );
}
