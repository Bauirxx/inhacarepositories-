-- ============================================================================
-- INHACA CONNECT · Migration 0002 — Perfis, papéis (RBAC), bloqueios e seguidores
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  full_name text not null check (char_length(full_name) between 2 and 80),
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 500),
  phone text check (phone is null or char_length(phone) <= 20),
  whatsapp text check (whatsapp is null or char_length(whatsapp) <= 20),
  location text check (location is null or char_length(location) <= 80),
  website text check (website is null or char_length(website) <= 200),
  is_resident boolean not null default false,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_username_trgm_idx on public.profiles using gin (username extensions.gin_trgm_ops);
create index profiles_full_name_trgm_idx on public.profiles using gin (full_name extensions.gin_trgm_ops);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index user_roles_user_id_idx on public.user_roles (user_id);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on public.follows (following_id);

-- ---------------------------------------------------------------------------
-- Funções de autorização (SECURITY DEFINER para evitar recursão em RLS)
-- ---------------------------------------------------------------------------
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(auth.uid(), 'admin');
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'moderator');
$$;

-- Utilizador autenticado e não suspenso.
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and exists (select 1 from public.profiles p where p.id = auth.uid() and not p.is_banned);
$$;

-- Contexto privilegiado: service role / migrações (sem JWT) ou staff.
create or replace function public.is_privileged_context()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is null or public.is_moderator() or public.bypass_protection();
$$;

create or replace function public.is_blocked_between(_a uuid, _b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = _a and blocked_id = _b) or (blocker_id = _b and blocked_id = _a)
  );
$$;

-- ---------------------------------------------------------------------------
-- Criação automática de perfil ao registar (trigger em auth.users)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate text;
  n int := 0;
  fname text;
  resident boolean;
begin
  fname := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1));
  if char_length(fname) < 2 then
    fname := 'Utilizador';
  end if;
  fname := substr(fname, 1, 80);

  base_username := regexp_replace(
    lower(coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(coalesce(new.email, ''), '@', 1))),
    '[^a-z0-9_]', '', 'g'
  );
  if char_length(base_username) < 3 then
    base_username := 'user' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  base_username := substr(base_username, 1, 24);
  candidate := base_username;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := base_username || n::text;
  end loop;

  resident := coalesce((new.raw_user_meta_data->>'is_resident')::boolean, false);

  insert into public.profiles (id, username, full_name, is_resident)
  values (new.id, candidate, fname, resident);

  insert into public.user_roles (user_id, role) values (new.id, 'visitor');
  if resident then
    insert into public.user_roles (user_id, role) values (new.id, 'resident')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impede utilizadores comuns de alterarem campos reservados.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
as $$
begin
  if not public.is_privileged_context() then
    new.is_banned := old.is_banned;
    new.id := old.id;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_blocks enable row level security;
alter table public.follows enable row level security;

create policy "profiles: leitura pública"
  on public.profiles for select
  using (true);

create policy "profiles: o próprio atualiza"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

create policy "user_roles: leitura pública"
  on public.user_roles for select
  using (true);

create policy "user_roles: admin gere"
  on public.user_roles for insert
  with check (public.is_admin());

create policy "user_roles: admin remove"
  on public.user_roles for delete
  using (public.is_admin());

create policy "user_blocks: o próprio vê"
  on public.user_blocks for select
  using (auth.uid() = blocker_id);

create policy "user_blocks: o próprio cria"
  on public.user_blocks for insert
  with check (auth.uid() = blocker_id and public.is_active_user());

create policy "user_blocks: o próprio remove"
  on public.user_blocks for delete
  using (auth.uid() = blocker_id);

create policy "follows: leitura pública"
  on public.follows for select
  using (true);

create policy "follows: seguir"
  on public.follows for insert
  with check (auth.uid() = follower_id and public.is_active_user());

create policy "follows: deixar de seguir"
  on public.follows for delete
  using (auth.uid() = follower_id);
