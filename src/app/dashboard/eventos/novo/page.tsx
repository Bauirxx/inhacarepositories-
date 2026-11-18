import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { EventForm } from "@/components/events/event-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listMyBusinesses } from "@/services/businesses";

export const metadata: Metadata = { title: "Submeter evento", robots: { index: false } };

export default async function NewEventPage() {
  const user = await requireUser("/dashboard/eventos/novo");
  const businesses = (await listMyBusinesses(await createClient(), user.id)).filter((b) => b.status === "approved");
  return (
    <div className="max-w-3xl">
      <PageHeader title="Submeter evento" description="Festas, cultura, desporto, atividades turísticas ou iniciativas comunitárias." />
      <EventForm
        userId={user.id}
        businesses={businesses.map((b) => ({ id: b.id, name: b.name }))}
        defaults={{ phone: user.profile.phone, whatsapp: user.profile.whatsapp }}
      />
    </div>
  );
}
