-- ============================================================================
-- INHACA CONNECT · Migration 0003 — Estabelecimentos, categorias, serviços,
-- media, verificações e avaliações
-- ============================================================================

create table public.business_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.business_categories (id) on delete restrict,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique,
  short_description text check (short_description is null or char_length(short_description) <= 200),
  description text check (description is null or char_length(description) <= 5000),
  logo_url text,
  cover_url text,
  phone text,
  whatsapp text,
  email text,
  website text,
  address text check (address is null or char_length(address) <= 200),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  location extensions.geography(point, 4326),
  opening_hours jsonb not null default '{}'::jsonb,
  price_info text,
  amenities text[] not null default '{}',
  status public.content_status not null default 'pending',
  rejection_reason text,
  is_verified boolean not null default false,
  is_featured boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  views_count integer not null default 0,
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index businesses_owner_idx on public.businesses (owner_id);
create index businesses_category_idx on public.businesses (category_id);
create index businesses_status_idx on public.businesses (status);
create index businesses_featured_idx on public.businesses (is_featured) where is_featured;
create index businesses_location_idx on public.businesses using gist (location);
create index businesses_name_trgm_idx on public.businesses using gin (name extensions.gin_trgm_ops);

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- Mantém a coluna geográfica sincronizada com latitude/longitude.
create or replace function public.set_geo_location()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.latitude is null or new.longitude is null then
    new.location := null;
  else
    new.location := extensions.ST_SetSRID(extensions.ST_MakePoint(new.longitude, new.latitude), 4326)::extensions.geography;
  end if;
  return new;
end;
$$;

create trigger businesses_set_location
  before insert or update of latitude, longitude on public.businesses
  for each row execute function public.set_geo_location();

-- Protege campos administrativos contra alterações pelos proprietários.
create or replace function public.protect_business_fields()
returns trigger
language plpgsql
as $$
declare
  privileged boolean := public.is_privileged_context();
begin
  if tg_op = 'INSERT' then
    if not privileged then
      new.status := 'pending';
      new.is_verified := false;
      new.is_featured := false;
      new.approved_at := null;
      new.approved_by := null;
      new.rejection_reason := null;
      new.views_count := 0;
      new.rating_avg := 0;
      new.rating_count := 0;
    end if;
  else
    if not privileged then
      new.owner_id := old.owner_id;
      new.status := case when old.status = 'rejected' then 'pending' else old.status end;
      new.is_verified := old.is_verified;
      new.is_featured := old.is_featured;
      new.approved_at := old.approved_at;
      new.approved_by := old.approved_by;
      new.rejection_reason := old.rejection_reason;
      new.views_count := old.views_count;
      new.rating_avg := old.rating_avg;
      new.rating_count := old.rating_count;
    elsif new.status = 'approved' and old.status is distinct from 'approved' then
      new.approved_at := now();
      new.approved_by := coalesce(auth.uid(), new.approved_by);
      new.rejection_reason := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger businesses_protect_fields
  before insert or update on public.businesses
  for each row execute function public.protect_business_fields();

-- Atribui automaticamente o papel "business_owner" ao submeter um estabelecimento.
create or replace function public.grant_role_on_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role) values (new.owner_id, 'business_owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger businesses_grant_role
  after insert on public.businesses
  for each row execute function public.grant_role_on_business();

create table public.business_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text check (description is null or char_length(description) <= 300),
  price text check (price is null or char_length(price) <= 60),
  sort_order int not null default 0
);
create index business_services_business_idx on public.business_services (business_id);

create table public.business_media (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  url text not null,
  type public.media_type not null default 'image',
  caption text check (caption is null or char_length(caption) <= 200),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index business_media_business_idx on public.business_media (business_id);

create table public.business_verifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  status public.content_status not null default 'pending',
  notes text check (notes is null or char_length(notes) <= 1000),
  document_url text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index business_verifications_business_idx on public.business_verifications (business_id);
create index business_verifications_status_idx on public.business_verifications (status);

-- Ao aprovar uma verificação, marca o estabelecimento como verificado.
create or replace function public.apply_business_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    perform set_config('app.bypass_protect', 'on', true);
    update public.businesses set is_verified = true where id = new.business_id;
    new.reviewed_at := now();
    new.reviewed_by := coalesce(auth.uid(), new.reviewed_by);
  elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
    new.reviewed_at := now();
    new.reviewed_by := coalesce(auth.uid(), new.reviewed_by);
  end if;
  return new;
end;
$$;

create trigger business_verifications_apply
  before update on public.business_verifications
  for each row execute function public.apply_business_verification();

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, author_id)
);
create index reviews_business_idx on public.reviews (business_id);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- Recalcula a média de avaliações do estabelecimento.
create or replace function public.refresh_business_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.business_id, old.business_id);
begin
  perform set_config('app.bypass_protect', 'on', true);
  update public.businesses b
     set rating_avg = coalesce((select round(avg(r.rating)::numeric, 2) from public.reviews r where r.business_id = target), 0),
         rating_count = (select count(*) from public.reviews r where r.business_id = target)
   where b.id = target;
  return null;
end;
$$;

create trigger reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_business_rating();

-- Contador de visualizações (chamado pelo servidor ao abrir a página pública).
create or replace function public.increment_business_views(_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.bypass_protect', 'on', true);
  update public.businesses set views_count = views_count + 1
   where id = _business_id and status = 'approved';
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.business_categories enable row level security;
alter table public.businesses enable row level security;
alter table public.business_services enable row level security;
alter table public.business_media enable row level security;
alter table public.business_verifications enable row level security;
alter table public.reviews enable row level security;

create policy "business_categories: leitura pública"
  on public.business_categories for select using (true);
create policy "business_categories: admin gere"
  on public.business_categories for all
  using (public.is_admin()) with check (public.is_admin());

create policy "businesses: aprovados são públicos; dono e staff veem tudo"
  on public.businesses for select
  using (status = 'approved' or owner_id = auth.uid() or public.is_moderator());

create policy "businesses: utilizador ativo submete o seu"
  on public.businesses for insert
  with check (owner_id = auth.uid() and public.is_active_user());

create policy "businesses: dono ou staff atualiza"
  on public.businesses for update
  using (owner_id = auth.uid() or public.is_moderator())
  with check (owner_id = auth.uid() or public.is_moderator());

create policy "businesses: dono ou admin elimina"
  on public.businesses for delete
  using (owner_id = auth.uid() or public.is_admin());

-- Serviços e media seguem a visibilidade do estabelecimento.
create policy "business_services: leitura segue o estabelecimento"
  on public.business_services for select
  using (exists (select 1 from public.businesses b where b.id = business_id));
create policy "business_services: dono gere"
  on public.business_services for all
  using (exists (select 1 from public.businesses b where b.id = business_id and (b.owner_id = auth.uid() or public.is_moderator())))
  with check (exists (select 1 from public.businesses b where b.id = business_id and (b.owner_id = auth.uid() or public.is_moderator())));

create policy "business_media: leitura segue o estabelecimento"
  on public.business_media for select
  using (exists (select 1 from public.businesses b where b.id = business_id));
create policy "business_media: dono gere"
  on public.business_media for all
  using (exists (select 1 from public.businesses b where b.id = business_id and (b.owner_id = auth.uid() or public.is_moderator())))
  with check (exists (select 1 from public.businesses b where b.id = business_id and (b.owner_id = auth.uid() or public.is_moderator())));

create policy "business_verifications: dono e staff veem"
  on public.business_verifications for select
  using (requested_by = auth.uid() or public.is_moderator());
create policy "business_verifications: dono pede"
  on public.business_verifications for insert
  with check (
    requested_by = auth.uid()
    and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy "business_verifications: staff decide"
  on public.business_verifications for update
  using (public.is_moderator()) with check (public.is_moderator());

create policy "reviews: leitura pública"
  on public.reviews for select using (true);
create policy "reviews: utilizador avalia estabelecimentos aprovados de terceiros"
  on public.reviews for insert
  with check (
    author_id = auth.uid()
    and public.is_active_user()
    and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'approved' and b.owner_id <> auth.uid())
  );
create policy "reviews: autor edita"
  on public.reviews for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "reviews: autor ou staff elimina"
  on public.reviews for delete
  using (author_id = auth.uid() or public.is_moderator());
