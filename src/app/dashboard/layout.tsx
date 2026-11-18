import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  await requireUser("/dashboard");
  return (
    <>
      <SiteHeader />
      <div className="container-page flex-1 py-4 pb-nav md:pb-10 lg:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <DashboardNav />
          </aside>
          <main id="conteudo" className="min-w-0">
            {children}
          </main>
        </div>
      </div>
      <BottomNav />
    </>
  );
}
