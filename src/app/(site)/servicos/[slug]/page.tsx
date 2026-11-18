import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Check, Clock, MapPin, Pencil, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/shared/cover-image";
import { ContactButtons } from "@/components/shared/contact-buttons";
import { StarRating } from "@/components/shared/star-rating";
import { ContentStatusBadge } from "@/components/shared/status-badge";
import { ViewTracker } from "@/components/shared/view-tracker";
import { MessageUserButton } from "@/components/shared/message-user-button";
import { DynamicIcon, getIcon } from "@/components/shared/dynamic-icon";
import { OpeningHoursTable } from "@/components/business/opening-hours";
import { ReviewsSection } from "@/components/business/reviews-section";
import { PostMediaGrid } from "@/components/feed/post-media";
import { StaticLocationMap } from "@/components/map/static-location-map";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isModerator } from "@/lib/permissions/roles";
import { getBusinessBySlug, getMyReview, listReviews } from "@/services/businesses";
import { env } from "@/lib/env";
import { formatPhoneDisplay, truncate } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/servicos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBusinessBySlug(await createClient(), slug);
  if (!b) return { title: "Estabelecimento não encontrado" };
  const description = b.short_description || truncate(b.description ?? `${b.name} na Ilha de Inhaca`, 160);
  return {
    title: `${b.name} · ${b.category?.name ?? "Serviços"}`,
    description,
    alternates: { canonical: `/servicos/${b.slug}` },
    robots: b.status === "approved" ? undefined : { index: false },
    openGraph: { title: b.name, description, images: b.cover_url ? [b.cover_url] : undefined },
  };
}

export default async function BusinessPage({ params }: PageProps<"/servicos/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();
  const business = await getBusinessBySlug(supabase, slug);
  if (!business) notFound();

  const [reviews, myReview] = await Promise.all([
    listReviews(supabase, business.id),
    user ? getMyReview(supabase, business.id, user.id) : Promise.resolve(null),
  ]);
  const isOwner = user?.id === business.owner_id;
  const viewer = user ? { id: user.id, isStaff: isModerator(user.roles) } : null;
  const Icon = getIcon(business.category?.icon);
  const gallery = (business.media ?? []).map((m) => ({ ...m, post_id: business.id, width: null, height: null }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    description: business.short_description ?? undefined,
    image: business.cover_url ?? business.logo_url ?? undefined,
    telephone: business.phone ? `+${business.phone}` : undefined,
    url: `${env.siteUrl}/servicos/${business.slug}`,
    address: { "@type": "PostalAddress", streetAddress: business.address ?? undefined, addressLocality: "Ilha de Inhaca", addressCountry: "MZ" },
    geo:
      business.latitude != null && business.longitude != null
        ? { "@type": "GeoCoordinates", latitude: business.latitude, longitude: business.longitude }
        : undefined,
    aggregateRating:
      business.rating_count > 0
        ? { "@type": "AggregateRating", ratingValue: Number(business.rating_avg), reviewCount: business.rating_count }
        : undefined,
  };

  return (
    <div className="pb-8">
      {business.status === "approved" ? (
        <>
          <ViewTracker kind="business" id={business.id} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        </>
      ) : null}
      <div className="relative">
        <CoverImage src={business.cover_url ?? business.media?.[0]?.url} alt={business.name} className="h-52 sm:h-80" priority sizes="100vw" icon={Icon} />
        <div className="container-page absolute inset-x-0 top-3">
          <Button asChild variant="secondary" size="sm" className="bg-white/90 shadow">
            <Link href="/servicos">
              <ArrowLeft /> Diretório
            </Link>
          </Button>
        </div>
      </div>
      <div className="container-page">
        <div className="relative -mt-10 flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-md sm:-mt-14 sm:flex-row sm:items-end sm:p-6">
          {business.logo_url ? (
            <div className="relative -mt-12 size-20 shrink-0 overflow-hidden rounded-2xl border-4 border-card bg-card shadow sm:-mt-16 sm:size-28">
              <Image src={business.logo_url} alt={`Logótipo de ${business.name}`} fill sizes="112px" className="object-cover" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <Link href={`/servicos?categoria=${business.category?.slug ?? ""}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-turquoise">
              <DynamicIcon name={business.category?.icon} className="size-4" /> {business.category?.name}
            </Link>
            <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-extrabold text-ocean sm:text-3xl">
              {business.name}
              {business.is_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-turquoise-light px-2 py-0.5 text-xs font-semibold text-ocean">
                  <BadgeCheck className="size-4 text-turquoise" /> Verificado
                </span>
              ) : null}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <a href="#avaliacoes">
                <StarRating value={Number(business.rating_avg)} count={business.rating_count} size="md" />
              </a>
              {business.status !== "approved" ? <ContentStatusBadge status={business.status} /> : null}
            </div>
          </div>
          {isOwner || viewer?.isStaff ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/negocios/${business.id}`}>
                <Pencil /> Gerir
              </Link>
            </Button>
          ) : null}
        </div>

        {business.status === "rejected" && business.rejection_reason && isOwner ? (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">Motivo da rejeição: {business.rejection_reason}</p>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            {business.description || business.short_description ? (
              <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-ocean">Sobre</h2>
                <p className="mt-3 leading-relaxed whitespace-pre-line text-foreground/90">
                  {business.description || business.short_description}
                </p>
                {business.amenities.length ? (
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {business.amenities.map((a) => (
                      <li key={a} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">
                        <Check className="size-3.5 text-turquoise" /> {a}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            {gallery.length ? (
              <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
                <h2 className="mb-3 text-lg font-bold text-ocean">Fotografias</h2>
                <PostMediaGrid media={gallery} />
              </section>
            ) : null}

            {business.services?.length ? (
              <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-ocean">Serviços e preços indicativos</h2>
                <ul className="mt-3 divide-y">
                  {business.services.map((s) => (
                    <li key={s.id} className="flex items-start justify-between gap-4 py-3">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        {s.description ? <p className="text-sm text-muted-foreground">{s.description}</p> : null}
                      </div>
                      {s.price ? <p className="shrink-0 font-semibold text-ocean">{s.price}</p> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <ReviewsSection
              businessId={business.id}
              slug={business.slug}
              reviews={reviews}
              myReview={myReview}
              viewer={viewer}
              isOwner={isOwner}
              ratingAvg={Number(business.rating_avg)}
              ratingCount={business.rating_count}
            />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-2xl border bg-card p-4 shadow-sm">
              <h2 className="font-bold text-ocean">Contactos</h2>
              <ContactButtons
                className="mt-3"
                phone={business.phone}
                whatsapp={business.whatsapp}
                email={business.email}
                website={business.website}
                message={`Olá! Encontrei ${business.name} no INHACA CONNECT.`}
              />
              {business.phone ? <p className="mt-3 text-sm text-muted-foreground">Telefone: {formatPhoneDisplay(business.phone)}</p> : null}
              {!isOwner ? (
                <MessageUserButton userId={business.owner_id} isLoggedIn={Boolean(user)} label="Mensagem na plataforma" className="mt-3 w-full" />
              ) : null}
            </section>
            {business.price_info ? (
              <section className="flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-sm">
                <Tag className="mt-0.5 size-5 text-turquoise" />
                <div>
                  <h2 className="font-bold text-ocean">Preços</h2>
                  <p className="text-sm">{business.price_info}</p>
                </div>
              </section>
            ) : null}
            <section className="rounded-2xl border bg-card p-4 shadow-sm">
              <h2 className="flex items-center gap-2 font-bold text-ocean">
                <Clock className="size-5 text-turquoise" /> Horário
              </h2>
              <div className="mt-2">
                <OpeningHoursTable hours={business.opening_hours} />
              </div>
            </section>
            <section className="rounded-2xl border bg-card p-4 shadow-sm">
              <h2 className="flex items-center gap-2 font-bold text-ocean">
                <MapPin className="size-5 text-turquoise" /> Localização
              </h2>
              {business.address ? <p className="mt-1 text-sm">{business.address}</p> : null}
              {business.latitude != null && business.longitude != null ? (
                <div className="mt-3 space-y-2">
                  <StaticLocationMap latitude={business.latitude} longitude={business.longitude} label={business.name} />
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/mapa?local=${business.id}`}>Abrir no mapa da ilha</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Direções
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Localização no mapa ainda não indicada.</p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
