import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { GuidePageForm } from "@/components/admin/guide-page-form";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Nova página do guia" };

export default async function NewGuidePage() {
  const user = await requireRole(["admin"], "/admin/guia/novo");
  return (
    <div className="max-w-4xl">
      <PageHeader title="Nova página do guia" />
      <GuidePageForm userId={user.id} />
    </div>
  );
}
