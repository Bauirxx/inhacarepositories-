-- ============================================================================
-- INHACA CONNECT · Migration 0005 — Agenda (eventos) e Mercado local (produtos)
-- ============================================================================

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  slug text not null unique,
  description text check (description is null or char_length(description) <= 5000),
  category public.event_category not null default 'comunidade',
  cover_url text,
  starts_at timestamptz not null,
  ends_at timestamptz check (ends_at is null or ends_at >= starts_at),
  location_name text check (location_name is null or char_length(location_name) <= 200),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  location extensions.geography(point, 4326),
  business_id uuid references public.businesses (id) on delete set null,
  contact_phone text,
  contact_whatsapp text,
  price_info text,
  status public.content_status not null default 'pending',
  rejection_reason text,
  is_featured boolean not null default false,
  attendees_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_organizer_idx on public.events (organizer_id);
create index events_starts_idx on public.events (starts_at);
create index events_status_idx on public.events (status, starts_at);
create index events_title_trgm_idx on public.events using gin (title extensions.gin_trgm_ops);

alter table public.posts
  add constraint posts_event_id_fkey foreign key (event_id) references public.events (id) on delete set null;

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create trigger events_set_location
  before insert or update of latitude, longitude on public.events
  for each row execute function public.set_geo_location();

create or replace function public.protect_event_fields()
returns trigger
language plpgsql
as $$
declare
  privileged boolean := public.is_privileged_context();
begin
  if tg_op = 'INSERT' then
    if not privileged then
      new.status := 'pending';
      new.is_featured := false;
      new.rejection_reason := null;
    end if;
    new.attendees_count := 0;
  elsif not privileged then
    new.organizer_id := old.organizer_id;
    new.status := case when old.status = 'rejected' then 'pending' else old.status end;
    new.is_featured := old.is_featured;
    new.rejection_reason := old.rejection_reason;
    new.attendees_count := old.attendees_count;
  elsif new.status = 'approved' and old.status is distinct from 'approved' then
    new.rejection_reason := null;
  end if;
  return new;
end;
$$;

create trigger events_protect_fields
  before insert or update on public.events
  for each row execute function public.protect_event_fields();

create or replace function public.grant_role_on_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role) values (new.organizer_id, 'event_organizer')
  on conflict do nothing;
  return new;
end;
$$;

create trigger events_grant_role
  after insert on public.events
  for each row execute function public.grant_role_on_event();

create table public.event_attendees (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.attendee_status not null default 'going',
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_attendees_user_idx on public.event_attendees (user_id);

create or replace function public.refresh_event_attendees()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.event_id, old.event_id);
begin
  perform set_config('app.bypass_protect', 'on', true);
  update public.events
     set attendees_count = (select count(*) from public.event_attendees a where a.event_id = target and a.status = 'going')
   where id = target;
  return null;
end;
$$;

create trigger event_attendees_counter
  after insert or update or delete on public.event_attendees
  for each row execute function public.refresh_event_attendees();

-- ---------------------------------------------------------------------------
-- Mercado local
-- ---------------------------------------------------------------------------
create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.product_categories (id) on delete restrict,
  title text not null check (char_length(title) between 2 and 120),
  description text check (description is null or char_length(description) <= 3000),
  price numeric(12, 2) check (price is null or price >= 0),
  currency text not null default 'MZN',
  unit text check (unit is null or char_length(unit) <= 30),
  is_negotiable boolean not null default false,
  images text[] not null default '{}',
  location text check (location is null or char_length(location) <= 120),
  contact_phone text,
  contact_whatsapp text,
  status public.product_status not null default 'active',
  is_featured boolean not null default false,
  views_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_seller_idx on public.products (seller_id);
create index products_category_idx on public.products (category_id);
create index products_status_idx on public.products (status, created_at desc);
create index products_title_trgm_idx on public.products using gin (title extensions.gin_trgm_ops);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create or replace function public.protect_product_fields()
returns trigger
language plpgsql
as $$
declare
  privileged boolean := public.is_privileged_context();
begin
  if tg_op = 'INSERT' then
    if not privileged then
      new.is_featured := false;
      if new.status = 'suspended' then
        new.status := 'active';
      end if;
    end if;
    new.views_count := 0;
  elsif not privileged then
    new.seller_id := old.seller_id;
    new.is_featured := old.is_featured;
    new.views_count := old.views_count;
    -- Vendedores não podem suspender nem levantar suspensões.
    if old.status = 'suspended' or new.status = 'suspended' then
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

create trigger products_protect_fields
  before insert or update on public.products
  for each row execute function public.protect_product_fields();

create or replace function public.grant_role_on_product()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role) values (new.seller_id, 'seller')
  on conflict do nothing;
  return new;
end;
$$;

create trigger products_grant_role
  after insert on public.products
  for each row execute function public.grant_role_on_product();

create or replace function public.increment_product_views(_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.bypass_protect', 'on', true);
  update public.products set views_count = views_count + 1
   where id = _product_id and status in ('active', 'sold_out');
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;

create policy "events: aprovados são públicos; organizador e staff veem tudo"
  on public.events for select
  using (status = 'approved' or organizer_id = auth.uid() or public.is_moderator());
create policy "events: utilizador ativo submete"
  on public.events for insert
  with check (organizer_id = auth.uid() and public.is_active_user());
create policy "events: organizador ou staff edita"
  on public.events for update
  using (organizer_id = auth.uid() or public.is_moderator())
  with check (organizer_id = auth.uid() or public.is_moderator());
create policy "events: organizador ou admin elimina"
  on public.events for delete
  using (organizer_id = auth.uid() or public.is_admin());

create policy "event_attendees: leitura pública"
  on public.event_attendees for select using (true);
create policy "event_attendees: o próprio gere"
  on public.event_attendees for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.is_active_user()
    and exists (select 1 from public.events e where e.id = event_id and e.status = 'approved')
  );

create policy "product_categories: leitura pública"
  on public.product_categories for select using (true);
create policy "product_categories: admin gere"
  on public.product_categories for all
  using (public.is_admin()) with check (public.is_admin());

create policy "products: ativos são públicos; vendedor e staff veem tudo"
  on public.products for select
  using (status in ('active', 'sold_out') or seller_id = auth.uid() or public.is_moderator());
create policy "products: utilizador ativo publica"
  on public.products for insert
  with check (seller_id = auth.uid() and public.is_active_user());
create policy "products: vendedor ou staff edita"
  on public.products for update
  using (seller_id = auth.uid() or public.is_moderator())
  with check (seller_id = auth.uid() or public.is_moderator());
create policy "products: vendedor ou staff elimina"
  on public.products for delete
  using (seller_id = auth.uid() or public.is_moderator());
