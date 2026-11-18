import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="gradient-ocean relative hidden overflow-hidden lg:flex lg:w-[44%] lg:flex-col lg:justify-between lg:p-12">
        <Logo light />
        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl leading-tight font-extrabold text-white">
            A ilha conectada.
            <br />
            <span className="text-sand">Uma comunidade, um destino.</span>
          </h2>
          <p className="mt-4 text-white/75">
            Partilhe o que acontece na Inhaca, divulgue o seu negócio, venda produtos locais e converse com a comunidade.
          </p>
        </div>
        <svg viewBox="0 0 600 200" className="absolute inset-x-0 bottom-0 w-full opacity-30" aria-hidden>
          <path d="M0 120 Q150 80 300 120 T600 120 V200 H0z" fill="#20A6A0" />
          <path d="M0 150 Q150 115 300 150 T600 150 V200 H0z" fill="#E6B96A" opacity=".6" />
        </svg>
        <p className="relative z-10 text-xs text-white/50">Ilha de Inhaca · Moçambique</p>
      </aside>
      <main className="flex flex-1 flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-ocean">
            <ArrowLeft className="size-4" /> Voltar ao início
          </Link>
          <div className="lg:hidden">
            <Logo />
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">{children}</div>
      </main>
    </div>
  );
}
