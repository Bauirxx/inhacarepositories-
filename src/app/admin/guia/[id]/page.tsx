import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { GuidePageForm } from "@/components/admin/guide-page-form";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getGuidePageById } from "@/services/guide";

export const metadata: Metadata = { title: "Editar página do guia" };

export default async function EditGuidePage({ params }: PageProps<"/admin/guia/[id]">) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const user = await requireRole(["admin"], `/admin/guia/${id}`);
  const page = await getGuidePageById(await createClient(), id);
  if (!page) notFound();
  return (
    <div className="max-w-4xl">
      <PageHeader
        title={page.title}
        actions={
          <Button asChild variant="outline">
            <Link href={`/descobrir/${page.slug}`}>Ver página</Link>
          </Button>
        }
      />
      <GuidePageForm page={page} userId={user.id} />
    </div>
  );
}
