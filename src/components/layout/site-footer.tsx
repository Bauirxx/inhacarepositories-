import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSiteSettings, defaultSettings } from "@/services/settings";
import { formatPhoneDisplay, safeExternalUrl, whatsappLink } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { Logo } from "./logo";

const columns = [
  {
    title: "Explorar",
    links: [
      { href: "/descobrir", label: "Descobrir Inhaca" },
      { href: "/mapa", label: "Mapa interativo" },
      { href: "/agenda", label: "Agenda" },
      { href: "/descobrir/como-chegar", label: "Como chegar" },
    ],
  },
  {
    title: "Economia local",
    links: [
      { href: "/servicos", label: "Diretório de serviços" },
      { href: "/mercado", label: "Mercado local" },
      { href: "/dashboard/negocios/novo", label: "Registar negócio" },
      { href: "/dashboard/produtos/novo", label: "Vender um produto" },
    ],
  },
  {
    title: "Comunidade",
    links: [
      { href: "/feed", label: "Feed da ilha" },
      { href: "/comunidade", label: "Chat e grupos" },
      { href: "/comunidade/ajuda", label: "Ajuda comunitária" },
      { href: "/sobre", label: "Sobre e termos" },
    ],
  },
];

export async function SiteFooter() {
  let settings = defaultSettings;
  try {
    settings = await getSiteSettings(await createClient());
  } catch {
    // Sem base de dados configurada: usa as predefinições.
  }
  const wa = whatsappLink(settings.contact_whatsapp);
  const facebook = safeExternalUrl(settings.facebook_url);
  const instagram = safeExternalUrl(settings.instagram_url);

  return (
    <footer className="gradient-ocean mt-16 text-white/85">
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">{settings.tagline || siteConfig.slogan}</p>
          <div className="mt-5 flex flex-col gap-2 text-sm">
            {settings.contact_email ? (
              <a href={`mailto:${settings.contact_email}`} className="inline-flex items-center gap-2 hover:text-sand">
                <Mail className="size-4" aria-hidden /> {settings.contact_email}
              </a>
            ) : null}
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-sand">
                <MessageCircle className="size-4" aria-hidden /> {formatPhoneDisplay(settings.contact_whatsapp)}
              </a>
            ) : null}
            <div className="flex gap-4 pt-1">
              {facebook ? (
                <a href={facebook} target="_blank" rel="noopener noreferrer" className="hover:text-sand">
                  Facebook
                </a>
              ) : null}
              {instagram ? (
                <a href={instagram} target="_blank" rel="noopener noreferrer" className="hover:text-sand">
                  Instagram
                </a>
              ) : null}
            </div>
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h2 className="text-sm font-semibold tracking-wide text-sand uppercase">{col.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-white/75 transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {settings.emergency_info ? (
        <div className="border-t border-white/10">
          <div className="container-page flex items-start gap-3 py-4 text-sm text-white/75">
            <Phone className="mt-0.5 size-4 shrink-0 text-sand" aria-hidden />
            <p>
              <strong className="text-white">Emergência: </strong>
              {settings.emergency_info}
            </p>
          </div>
        </div>
      ) : null}
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-white/55 sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.site_name}. Ilha de Inhaca, Moçambique.
          </p>
          <p>
            Mapas ©{" "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
              contribuidores OpenStreetMap
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
