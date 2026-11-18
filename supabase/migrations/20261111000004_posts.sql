-- ============================================================================
-- INHACA CONNECT · Migration 0004 — Feed: publicações, media, comentários,
-- reações e guardados
-- ============================================================================

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  category public.post_category not null default 'comunidade',
  content text not null default '' check (char_length(content) <= 5000),
  location text check (location is null or char_length(location) <= 120),
  business_id uuid references public.businesses (id) on delete set null,
  event_id uuid,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  shares_count integer not null default 0,
  is_pinned boolean not null default false,
  is_hidden boolean not null default false,
  hidden_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_author_idx on public.posts (author_id);
create index posts_created_idx on public.posts (created_at desc);
create index posts_category_idx on public.posts (category);
create index posts_visible_idx on public.posts (is_hidden, is_pinned, created_at desc);
create index posts_content_trgm_idx on public.posts using gin (content extensions.gin_trgm_ops);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

create or replace function public.protect_post_fields()
returns trigger
language plpgsql
as $$
declare
  privileged boolean := public.is_privileged_context();
begin
  if tg_op = 'INSERT' then
    if not privileged then
      new.is_pinned := false;
      new.is_hidden := false;
      new.hidden_reason := null;
    end if;
    new.likes_count := 0;
    new.comments_count := 0;
    new.shares_count := 0;
  elsif not privileged then
    new.author_id := old.author_id;
    new.is_pinned := old.is_pinned;
    new.is_hidden := old.is_hidden;
    new.hidden_reason := old.hidden_reason;
    new.likes_count := old.likes_count;
    new.comments_count := old.comments_count;
    new.shares_count := old.shares_count;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger posts_protect_fields
  before insert or update on public.posts
  for each row execute function public.protect_post_fields();

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  url text not null,
  type public.media_type not null default 'image',
  width integer,
  height integer,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index post_media_post_idx on public.post_media (post_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);
create index comments_parent_idx on public.comments (parent_id);

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

create or replace function public.protect_comment_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_privileged_context() then
      new.is_hidden := false;
    end if;
  elsif not public.is_privileged_context() then
    new.author_id := old.author_id;
    new.post_id := old.post_id;
    new.parent_id := old.parent_id;
    new.is_hidden := old.is_hidden;
  end if;
  return new;
end;
$$;

create trigger comments_protect_fields
  before insert or update on public.comments
  for each row execute function public.protect_comment_fields();

create table public.post_reactions (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reaction text not null default 'like' check (reaction in ('like')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_reactions_user_idx on public.post_reactions (user_id);

create table public.saved_posts (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index saved_posts_user_idx on public.saved_posts (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Contadores desnormalizados
-- ---------------------------------------------------------------------------
create or replace function public.refresh_post_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.post_id, old.post_id);
begin
  perform set_config('app.bypass_protect', 'on', true);
  if tg_table_name = 'post_reactions' then
    update public.posts set likes_count = (select count(*) from public.post_reactions r where r.post_id = target) where id = target;
  elsif tg_table_name = 'comments' then
    update public.posts set comments_count = (select count(*) from public.comments c where c.post_id = target and not c.is_hidden) where id = target;
  end if;
  return null;
end;
$$;

create trigger post_reactions_counter
  after insert or delete on public.post_reactions
  for each row execute function public.refresh_post_counters();

create trigger comments_counter
  after insert or update of is_hidden or delete on public.comments
  for each row execute function public.refresh_post_counters();

create or replace function public.increment_post_shares(_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.bypass_protect', 'on', true);
  update public.posts set shares_count = shares_count + 1 where id = _post_id and not is_hidden;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.saved_posts enable row level security;

create policy "posts: visíveis são públicos; autor e staff veem tudo"
  on public.posts for select
  using (not is_hidden or author_id = auth.uid() or public.is_moderator());

create policy "posts: utilizador ativo publica"
  on public.posts for insert
  with check (author_id = auth.uid() and public.is_active_user());

create policy "posts: autor ou staff edita"
  on public.posts for update
  using (author_id = auth.uid() or public.is_moderator())
  with check (author_id = auth.uid() or public.is_moderator());

create policy "posts: autor ou staff elimina"
  on public.posts for delete
  using (author_id = auth.uid() or public.is_moderator());

create policy "post_media: leitura segue a publicação"
  on public.post_media for select
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy "post_media: autor gere"
  on public.post_media for all
  using (exists (select 1 from public.posts p where p.id = post_id and (p.author_id = auth.uid() or public.is_moderator())))
  with check (exists (select 1 from public.posts p where p.id = post_id and (p.author_id = auth.uid() or public.is_moderator())));

create policy "comments: visíveis são públicos"
  on public.comments for select
  using (
    (not is_hidden or author_id = auth.uid() or public.is_moderator())
    and exists (select 1 from public.posts p where p.id = post_id)
  );
create policy "comments: utilizador ativo comenta"
  on public.comments for insert
  with check (
    author_id = auth.uid()
    and public.is_active_user()
    and exists (select 1 from public.posts p where p.id = post_id and not p.is_hidden)
  );
create policy "comments: autor ou staff edita"
  on public.comments for update
  using (author_id = auth.uid() or public.is_moderator())
  with check (author_id = auth.uid() or public.is_moderator());
create policy "comments: autor ou staff elimina"
  on public.comments for delete
  using (author_id = auth.uid() or public.is_moderator());

create policy "post_reactions: leitura pública"
  on public.post_reactions for select using (true);
create policy "post_reactions: utilizador reage"
  on public.post_reactions for insert
  with check (user_id = auth.uid() and public.is_active_user());
create policy "post_reactions: utilizador remove"
  on public.post_reactions for delete
  using (user_id = auth.uid());

create policy "saved_posts: o próprio"
  on public.saved_posts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
