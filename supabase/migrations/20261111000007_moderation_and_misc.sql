-- ============================================================================
-- INHACA CONNECT · Migration 0007 — Denúncias, notificações, publicidade,
-- auditoria, guia editorial, configurações e rate limiting
-- ============================================================================

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target not null,
  target_id uuid not null,
  reason text not null check (char_length(reason) between 2 and 60),
  details text check (details is null or char_length(details) <= 1000),
  status public.report_status not null default 'open',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  resolution_notes text check (resolution_notes is null or char_length(resolution_notes) <= 1000),
  created_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at desc);
create index reports_target_idx on public.reports (target_type, target_id);
create unique index reports_unique_open_idx on public.reports (reporter_id, target_type, target_id) where status in ('open', 'reviewing');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null default 'system',
  title text not null check (char_length(title) <= 160),
  body text check (body is null or char_length(body) <= 500),
  link text check (link is null or char_length(link) <= 300),
  actor_id uuid references public.profiles (id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

create table public.advertisements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  image_url text,
  link_url text,
  placement public.ad_placement not null default 'home',
  advertiser_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  clicks_count integer not null default 0,
  impressions_count integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index advertisements_active_idx on public.advertisements (placement, is_active);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (char_length(action) <= 80),
  target_type text check (target_type is null or char_length(target_type) <= 40),
  target_id text check (target_id is null or char_length(target_id) <= 80),
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id);

create table public.guide_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  title text not null check (char_length(title) between 2 and 120),
  excerpt text check (excerpt is null or char_length(excerpt) <= 300),
  content text not null default '',
  cover_url text,
  icon text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger guide_pages_set_updated_at
  before update on public.guide_pages
  for each row execute function public.set_updated_at();

create table public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_]{2,60}$'),
  value jsonb not null default 'null'::jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------------
-- Rate limiting persistente (serverless-safe)
-- ---------------------------------------------------------------------------
create or replace function public.check_rate_limit(_key text, _max int, _window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ws timestamptz := to_timestamp(floor(extract(epoch from now()) / _window_seconds) * _window_seconds);
  cnt int;
begin
  insert into public.rate_limits (key, window_start, count)
  values (_key, ws, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into cnt;

  -- Limpeza oportunista de janelas antigas.
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return cnt <= _max;
end;
$$;

revoke all on function public.check_rate_limit(text, int, int) from public;
grant execute on function public.check_rate_limit(text, int, int) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Trigger de mensagens (depende de notifications)
-- ---------------------------------------------------------------------------
create trigger messages_after_insert
  after insert on public.messages
  for each row execute function public.after_insert_message();

-- ---------------------------------------------------------------------------
-- Notificações automáticas
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
  parent_author uuid;
  actor_name text;
begin
  select author_id into post_author from public.posts where id = new.post_id;
  select full_name into actor_name from public.profiles where id = new.author_id;

  if post_author is not null and post_author <> new.author_id then
    insert into public.notifications (user_id, type, title, body, link, actor_id)
    values (post_author, 'comment', coalesce(actor_name, 'Alguém') || ' comentou a sua publicação',
            left(new.content, 120), '/feed/' || new.post_id, new.author_id);
  end if;

  if new.parent_id is not null then
    select author_id into parent_author from public.comments where id = new.parent_id;
    if parent_author is not null and parent_author <> new.author_id and parent_author is distinct from post_author then
      insert into public.notifications (user_id, type, title, body, link, actor_id)
      values (parent_author, 'reply', coalesce(actor_name, 'Alguém') || ' respondeu ao seu comentário',
              left(new.content, 120), '/feed/' || new.post_id, new.author_id);
    end if;
  end if;
  return new;
end;
$$;

create trigger comments_notify
  after insert on public.comments
  for each row execute function public.notify_on_comment();

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles%rowtype;
begin
  select * into actor from public.profiles where id = new.follower_id;
  insert into public.notifications (user_id, type, title, body, link, actor_id)
  values (new.following_id, 'follow', coalesce(actor.full_name, 'Alguém') || ' começou a seguir-te',
          null, '/perfil/' || actor.username, new.follower_id);
  return new;
end;
$$;

create trigger follows_notify
  after insert on public.follows
  for each row execute function public.notify_on_follow();

create or replace function public.notify_on_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  label text;
  link text;
  ntype public.notification_type;
  status_text text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if tg_table_name = 'businesses' then
    owner := new.owner_id; label := 'O estabelecimento "' || new.name || '"'; link := '/dashboard/negocios/' || new.id; ntype := 'business_status';
  elsif tg_table_name = 'events' then
    owner := new.organizer_id; label := 'O evento "' || new.title || '"'; link := '/dashboard/eventos/' || new.id; ntype := 'event_status';
  elsif tg_table_name = 'products' then
    owner := new.seller_id; label := 'O produto "' || new.title || '"'; link := '/dashboard/produtos/' || new.id; ntype := 'product_status';
  else
    return new;
  end if;

  status_text := case new.status::text
    when 'approved' then 'foi aprovado e já está visível.'
    when 'rejected' then 'não foi aprovado.' || coalesce(' Motivo: ' || new.rejection_reason, '')
    when 'suspended' then 'foi suspenso pela moderação.'
    when 'pending' then 'aguarda nova aprovação.'
    when 'active' then 'está novamente disponível.'
    else 'mudou de estado.' end;

  insert into public.notifications (user_id, type, title, body, link, actor_id)
  values (owner, ntype, label || ' ' || status_text, null, link, auth.uid());
  return new;
end;
$$;

create trigger businesses_notify_status
  after update of status on public.businesses
  for each row execute function public.notify_on_status_change();
create trigger events_notify_status
  after update of status on public.events
  for each row execute function public.notify_on_status_change();
create trigger products_notify_status
  after update of status on public.products
  for each row execute function public.notify_on_status_change();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.advertisements enable row level security;
alter table public.audit_logs enable row level security;
alter table public.guide_pages enable row level security;
alter table public.site_settings enable row level security;
alter table public.rate_limits enable row level security;

create policy "reports: autor e staff veem"
  on public.reports for select
  using (reporter_id = auth.uid() or public.is_moderator());
create policy "reports: utilizador ativo denuncia"
  on public.reports for insert
  with check (reporter_id = auth.uid() and public.is_active_user());
create policy "reports: staff decide"
  on public.reports for update
  using (public.is_moderator()) with check (public.is_moderator());

create policy "notifications: o próprio vê"
  on public.notifications for select
  using (user_id = auth.uid());
create policy "notifications: o próprio marca como lida"
  on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: o próprio apaga"
  on public.notifications for delete
  using (user_id = auth.uid());
create policy "notifications: staff cria"
  on public.notifications for insert
  with check (public.is_moderator());

create policy "advertisements: ativas são públicas"
  on public.advertisements for select
  using (
    public.is_moderator()
    or (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()))
  );
create policy "advertisements: admin gere"
  on public.advertisements for all
  using (public.is_admin()) with check (public.is_admin());

create policy "audit_logs: admin consulta"
  on public.audit_logs for select
  using (public.is_admin());
create policy "audit_logs: staff regista"
  on public.audit_logs for insert
  with check (actor_id = auth.uid() and public.is_moderator());

create policy "guide_pages: publicadas são públicas"
  on public.guide_pages for select
  using (is_published or public.is_moderator());
create policy "guide_pages: admin gere"
  on public.guide_pages for all
  using (public.is_admin()) with check (public.is_admin());

create policy "site_settings: leitura pública"
  on public.site_settings for select using (true);
create policy "site_settings: admin gere"
  on public.site_settings for all
  using (public.is_admin()) with check (public.is_admin());

-- rate_limits: sem políticas (apenas acessível via check_rate_limit, security definer).
