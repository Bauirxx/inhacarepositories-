import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DynamicIcon } from "@/components/shared/dynamic-icon";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listGuidePages } from "@/services/guide";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Guia turístico" };

export default async function AdminGuidePage() {
  await requireRole(["admin"], "/admin/guia");
  const pages = await listGuidePages(await createClient(), true);
  return (
    <div>
      <PageHeader
        title="Guia turístico"
        description="Conteúdo editorial da secção Descobrir Inhaca."
        actions={
          <Button asChild>
            <Link href="/admin/guia/novo">
              <Plus /> Nova página
            </Link>
          </Button>
        }
      />
      <ul className="divide-y rounded-2xl border bg-card shadow-sm">
        {pages.map((p) => (
          <li key={p.id}>
            <Link href={`/admin/guia/${p.id}`} className="flex items-center gap-3 p-4 hover:bg-muted">
              <span className="flex size-10 items-center justify-center rounded-xl bg-turquoise-light text-ocean">
                <DynamicIcon name={p.icon} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {p.title} {!p.is_published ? <Badge variant="outline">Rascunho</Badge> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  /descobrir/{p.slug} · ordem {p.sort_order} · atualizado {formatDateTime(p.updated_at)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
