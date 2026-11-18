import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, MapPin, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ProfileActions } from "@/components/shared/profile-actions";
import { BusinessCard } from "@/components/business/business-card";
import { ProductCard } from "@/components/marketplace/product-card";
import { FeedList } from "@/components/feed/feed-list";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isModerator } from "@/lib/permissions/roles";
import { getProfileByUsername } from "@/services/profiles";
import { listPosts } from "@/services/posts";
import { listMyBusinesses } from "@/services/businesses";
import { listMyProducts } from "@/services/products";
import { roleLabels } from "@/config/site";
import { formatDate, safeExternalUrl } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/perfil/[username]">): Promise<Metadata> {
  const { username } = await params;
  const p = await getProfileByUsername(await createClient(), username);
  if (!p) return { title: "Perfil não encontrado" };
  return { title: `${p.full_name} (@${p.username})`, description: p.bio ?? undefined, robots: p.is_banned ? { index: false } : undefined };
}

export default async function ProfilePage({ params }: PageProps<"/perfil/[username]">) {
  const { username } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();
  const profile = await getProfileByUsername(supabase, username, user?.id);
  if (!profile) notFound();
  const isMe = user?.id === profile.id;

  const [posts, businesses, products] = await Promise.all([
    listPosts(supabase, { authorId: profile.id, userId: user?.id ?? null }),
    listMyBusinesses(supabase, profile.id),
    listMyProducts(supabase, profile.id),
  ]);
  const publicBusinesses = businesses.filter((b) => b.status === "approved");
  const publicProducts = products.filter((p) => p.status === "active" || p.status === "sold_out");
  const visibleRoles = profile.roles.filter((r) => r !== "visitor");
  const website = safeExternalUrl(profile.website);

  return (
    <div className="container-page max-w-5xl py-6 sm:py-10">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="gradient-ocean h-28 sm:h-36" />
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end">
            <UserAvatar name={profile.full_name} src={profile.avatar_url} size="xl" className="ring-4 ring-card" />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold text-ocean">{profile.full_name}</h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
            {isMe ? (
              <Button asChild variant="outline">
                <Link href="/dashboard/perfil">
                  <Pencil /> Editar perfil
                </Link>
              </Button>
            ) : (
              <ProfileActions
                userId={profile.id}
                isFollowing={Boolean(profile.is_followed_by_me)}
                isBlocked={Boolean(profile.is_blocked_by_me)}
                isLoggedIn={Boolean(user)}
              />
            )}
          </div>
          {profile.is_banned ? (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">Esta conta está suspensa.</p>
          ) : null}
          {visibleRoles.length ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {visibleRoles.map((r) => (
                <Badge key={r} variant="secondary">
                  {roleLabels[r]}
                </Badge>
              ))}
            </div>
          ) : null}
          {profile.bio ? <p className="mt-4 max-w-2xl whitespace-pre-line">{profile.bio}</p> : null}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {profile.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" /> {profile.location}
              </span>
            ) : null}
            {website ? (
              <a href={website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-turquoise hover:underline">
                <Globe className="size-4" /> {new URL(website).hostname}
              </a>
            ) : null}
            <span>Membro desde {formatDate(profile.created_at, "MMMM 'de' yyyy")}</span>
          </div>
          <dl className="mt-5 flex gap-6 text-sm">
            <div>
              <dt className="text-muted-foreground">Publicações</dt>
              <dd className="text-lg font-bold text-ocean">{profile.posts_count}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Seguidores</dt>
              <dd className="text-lg font-bold text-ocean">{profile.followers_count}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">A seguir</dt>
              <dd className="text-lg font-bold text-ocean">{profile.following_count}</dd>
            </div>
          </dl>
        </div>
      </section>

      {publicBusinesses.length ? (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-bold text-ocean">Estabelecimentos</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publicBusinesses.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        </section>
      ) : null}

      {publicProducts.length ? (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-bold text-ocean">À venda</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {publicProducts.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto mt-8 max-w-2xl">
        <h2 className="mb-4 text-xl font-bold text-ocean">Publicações</h2>
        <FeedList
          initialPosts={posts.items}
          initialCursor={posts.nextCursor}
          authorId={profile.id}
          viewer={user ? { id: user.id, isStaff: isModerator(user.roles) } : null}
        />
      </section>
    </div>
  );
}
