import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { UserAdminPanel } from "@/components/admin/user-admin-panel";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getUserForAdmin } from "@/services/admin";
import { listMyBusinesses } from "@/services/businesses";
import { formatDate, formatDateTime, formatPhoneDisplay } from "@/lib/utils";

export const metadata: Metadata = { title: "Utilizador" };

export default async function AdminUserPage({ params }: PageProps<"/admin/utilizadores/[id]">) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const me = await requireRole(["admin"], `/admin/utilizadores/${id}`);
  const supabase = await createClient();
  const [user, businesses] = await Promise.all([getUserForAdmin(supabase, id), listMyBusinesses(supabase, id)]);
  if (!user) notFound();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("target_type", "profile")
    .eq("target_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="max-w-4xl">
      <Link href="/admin/utilizadores" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-ocean">
        <ArrowLeft className="size-4" /> Utilizadores
      </Link>
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:p-6">
        <UserAvatar name={user.full_name} src={user.avatar_url} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold text-ocean">{user.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            @{user.username} · registado em {formatDate(user.created_at)}
            {user.is_resident ? " · habitante" : ""}
          </p>
          {user.phone || user.whatsapp ? (
            <p className="text-sm text-muted-foreground">Contacto: {formatPhoneDisplay(user.whatsapp || user.phone)}</p>
          ) : null}
        </div>
        <Button asChild variant="outline">
          <Link href={`/perfil/${user.username}`}>Perfil público</Link>
        </Button>
      </div>
      <UserAdminPanel userId={user.id} roles={user.roles} isBanned={user.is_banned} isSelf={me.id === user.id} />
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="font-bold text-ocean">Estabelecimentos</h2>
          {businesses.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {businesses.map((b) => (
                <li key={b.id}>
                  <Link href={`/servicos/${b.slug}`} className="hover:text-turquoise">
                    {b.name}
                  </Link>{" "}
                  <span className="text-xs text-muted-foreground">({b.status})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Nenhum.</p>
          )}
        </section>
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="font-bold text-ocean">Histórico administrativo</h2>
          {logs?.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {logs.map((l: { id: string; action: string; created_at: string }) => (
                <li key={l.id}>
                  <code className="text-xs">{l.action}</code> <span className="text-xs text-muted-foreground">{formatDateTime(l.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Sem registos.</p>
          )}
        </section>
      </div>
    </div>
  );
}
