import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { ContentStatusBadge } from "@/components/shared/status-badge";
import { EventForm } from "@/components/events/event-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isModerator } from "@/lib/permissions/roles";
import { getEventById } from "@/services/events";
import { listMyBusinesses } from "@/services/businesses";

export const metadata: Metadata = { title: "Editar evento", robots: { index: false } };

export default async function EditEventPage({ params }: PageProps<"/dashboard/eventos/[id]">) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const user = await requireUser(`/dashboard/eventos/${id}`);
  const supabase = await createClient();
  const event = await getEventById(supabase, id);
  if (!event || (event.organizer_id !== user.id && !isModerator(user.roles))) notFound();
  const businesses = (await listMyBusinesses(supabase, user.id)).filter((b) => b.status === "approved");
  return (
    <div className="max-w-3xl">
      <PageHeader title="Editar evento">
        <div className="mt-2">
          <ContentStatusBadge status={event.status} />
        </div>
      </PageHeader>
      {event.status === "rejected" ? (
        <p className="mb-6 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          Não aprovado{event.rejection_reason ? `: ${event.rejection_reason}` : ""}. Corrija e guarde para voltar a submeter.
        </p>
      ) : null}
      <EventForm userId={user.id} event={event} businesses={businesses.map((b) => ({ id: b.id, name: b.name }))} />
    </div>
  );
}
