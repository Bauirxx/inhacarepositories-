import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AnnouncementBar } from "@/components/layout/announcement-bar";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-lg bg-ocean px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar para o conteúdo
      </a>
      <AnnouncementBar />
      <SiteHeader />
      <main id="conteudo" className="flex-1 pb-nav md:pb-0">
        {children}
      </main>
      <div className="pb-nav md:pb-0">
        <SiteFooter />
      </div>
      <BottomNav />
    </>
  );
}
