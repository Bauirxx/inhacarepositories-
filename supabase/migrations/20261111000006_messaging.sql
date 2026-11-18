-- ============================================================================
-- INHACA CONNECT · Migration 0006 — Comunidade: conversas, mensagens, grupos
-- e pedidos de ajuda comunitária
-- ============================================================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null default 'direct',
  title text check (title is null or char_length(title) <= 120),
  created_by uuid references public.profiles (id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_type_idx on public.conversations (type);
create index conversations_last_message_idx on public.conversations (last_message_at desc nulls last);
-- Apenas uma conversa geral.
create unique index conversations_single_general_idx on public.conversations (type) where type = 'general';

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text check (content is null or char_length(content) <= 2000),
  image_url text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  check (content is not null or image_url is not null)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_idx on public.messages (sender_id);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  name text not null check (char_length(name) between 3 and 80),
  description text check (description is null or char_length(description) <= 500),
  topic text check (topic is null or char_length(topic) <= 40),
  icon text,
  cover_url text,
  conversation_id uuid unique references public.conversations (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  is_default boolean not null default false,
  members_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  type public.help_request_type not null default 'outro',
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 10 and 2000),
  location text check (location is null or char_length(location) <= 120),
  contact_phone text,
  contact_whatsapp text,
  status public.help_request_status not null default 'open',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index help_requests_status_idx on public.help_requests (status, created_at desc);
create index help_requests_author_idx on public.help_requests (author_id);

create trigger help_requests_set_updated_at
  before update on public.help_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Funções de acesso
-- ---------------------------------------------------------------------------
create or replace function public.can_access_conversation(_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (select 1 from public.profiles p where p.id = auth.uid() and not p.is_banned)
    and (
      exists (select 1 from public.conversations c where c.id = _conversation_id and c.type = 'general')
      or exists (
        select 1 from public.conversation_members m
        where m.conversation_id = _conversation_id and m.user_id = auth.uid()
      )
    );
$$;

create or replace function public.general_conversation_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.conversations where type = 'general' limit 1;
$$;

-- Cria (ou obtém) a conversa privada entre o utilizador atual e outro.
create or replace function public.get_or_create_direct_conversation(_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  conv uuid;
begin
  if me is null then
    raise exception 'Autenticação necessária' using errcode = '42501';
  end if;
  if _other_user_id = me then
    raise exception 'Não pode iniciar uma conversa consigo próprio';
  end if;
  if not exists (select 1 from public.profiles where id = me and not is_banned) then
    raise exception 'Conta suspensa' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = _other_user_id and not is_banned) then
    raise exception 'Utilizador não encontrado';
  end if;
  if public.is_blocked_between(me, _other_user_id) then
    raise exception 'Não é possível contactar este utilizador';
  end if;

  select c.id into conv
    from public.conversations c
   where c.type = 'direct'
     and exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = me)
     and exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = _other_user_id)
   limit 1;

  if conv is null then
    insert into public.conversations (type, created_by) values ('direct', me) returning id into conv;
    insert into public.conversation_members (conversation_id, user_id)
    values (conv, me), (conv, _other_user_id);
  end if;
  return conv;
end;
$$;

-- Lista de conversas do utilizador com última mensagem e contagem de não lidas.
create or replace function public.my_conversations()
returns table (
  id uuid,
  type public.conversation_type,
  title text,
  group_slug text,
  group_icon text,
  other_user jsonb,
  last_message jsonb,
  unread_count bigint,
  last_message_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (select auth.uid() as uid),
  convs as (
    select c.*
      from public.conversations c
     where (select uid from me) is not null
       and (
         c.type = 'general'
         or exists (
           select 1 from public.conversation_members m
            where m.conversation_id = c.id and m.user_id = (select uid from me)
         )
       )
  )
  select
    c.id,
    c.type,
    coalesce(g.name, c.title, case when c.type = 'general' then 'Chat geral' end) as title,
    g.slug as group_slug,
    g.icon as group_icon,
    case when c.type = 'direct' then (
      select jsonb_build_object('id', p.id, 'username', p.username, 'full_name', p.full_name, 'avatar_url', p.avatar_url)
        from public.conversation_members m
        join public.profiles p on p.id = m.user_id
       where m.conversation_id = c.id and m.user_id <> (select uid from me)
       limit 1
    ) end as other_user,
    (
      select jsonb_build_object(
        'id', msg.id,
        'content', case when msg.is_deleted then null else msg.content end,
        'image_url', case when msg.is_deleted then null else msg.image_url end,
        'sender_id', msg.sender_id,
        'created_at', msg.created_at
      )
        from public.messages msg
       where msg.conversation_id = c.id
       order by msg.created_at desc
       limit 1
    ) as last_message,
    (
      select count(*)
        from public.messages msg
       where msg.conversation_id = c.id
         and msg.sender_id <> (select uid from me)
         and msg.created_at > coalesce(
           (select m.last_read_at from public.conversation_members m
             where m.conversation_id = c.id and m.user_id = (select uid from me)),
           case when c.type = 'general' then now() else 'epoch'::timestamptz end
         )
    ) as unread_count,
    c.last_message_at
  from convs c
  left join public.groups g on g.conversation_id = c.id
  order by c.last_message_at desc nulls last, c.created_at desc;
$$;

create or replace function public.mark_conversation_read(_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_access_conversation(_conversation_id) then
    return;
  end if;
  insert into public.conversation_members (conversation_id, user_id, last_read_at)
  values (_conversation_id, auth.uid(), now())
  on conflict (conversation_id, user_id) do update set last_read_at = now();
end;
$$;

create or replace function public.my_unread_messages_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(unread_count), 0)::bigint from public.my_conversations();
$$;

-- ---------------------------------------------------------------------------
-- Triggers de mensagens
-- ---------------------------------------------------------------------------
create or replace function public.before_insert_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_type public.conversation_type;
  blocked boolean;
begin
  if auth.uid() is not null and new.sender_id <> auth.uid() then
    raise exception 'Remetente inválido' using errcode = '42501';
  end if;
  if auth.uid() is not null and not public.can_access_conversation(new.conversation_id) then
    raise exception 'Sem acesso a esta conversa' using errcode = '42501';
  end if;
  select type into conv_type from public.conversations where id = new.conversation_id;
  if conv_type = 'direct' then
    select bool_or(public.is_blocked_between(new.sender_id, m.user_id)) into blocked
      from public.conversation_members m
     where m.conversation_id = new.conversation_id and m.user_id <> new.sender_id;
    if coalesce(blocked, false) then
      raise exception 'Não é possível enviar mensagens a este utilizador' using errcode = '42501';
    end if;
  end if;
  new.is_deleted := false;
  return new;
end;
$$;

create trigger messages_before_insert
  before insert on public.messages
  for each row execute function public.before_insert_message();

create or replace function public.after_insert_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_type public.conversation_type;
  sender_name text;
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  -- O remetente fica automaticamente "lido" até à sua própria mensagem.
  insert into public.conversation_members (conversation_id, user_id, last_read_at)
  values (new.conversation_id, new.sender_id, new.created_at)
  on conflict (conversation_id, user_id) do update set last_read_at = excluded.last_read_at;

  select type into conv_type from public.conversations where id = new.conversation_id;
  if conv_type = 'direct' then
    select full_name into sender_name from public.profiles where id = new.sender_id;
    insert into public.notifications (user_id, type, title, body, link, actor_id)
    select m.user_id, 'message', 'Nova mensagem de ' || coalesce(sender_name, 'um utilizador'),
           left(coalesce(new.content, 'Enviou uma fotografia'), 120),
           '/comunidade/mensagens/' || new.conversation_id, new.sender_id
      from public.conversation_members m
     where m.conversation_id = new.conversation_id and m.user_id <> new.sender_id;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers de grupos
-- ---------------------------------------------------------------------------
create or replace function public.before_insert_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.conversation_id is null then
    insert into public.conversations (type, title, created_by)
    values ('group', new.name, coalesce(new.created_by, auth.uid()))
    returning id into new.conversation_id;
  end if;
  return new;
end;
$$;

create trigger groups_before_insert
  before insert on public.groups
  for each row execute function public.before_insert_group();

create or replace function public.sync_group_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conv uuid;
begin
  if tg_op = 'INSERT' then
    select conversation_id into conv from public.groups where id = new.group_id;
    insert into public.conversation_members (conversation_id, user_id)
    values (conv, new.user_id)
    on conflict do nothing;
    update public.groups set members_count = members_count + 1 where id = new.group_id;
    return new;
  else
    select conversation_id into conv from public.groups where id = old.group_id;
    delete from public.conversation_members where conversation_id = conv and user_id = old.user_id;
    update public.groups set members_count = greatest(members_count - 1, 0) where id = old.group_id;
    return old;
  end if;
end;
$$;

create trigger group_members_sync
  after insert or delete on public.group_members
  for each row execute function public.sync_group_membership();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.help_requests enable row level security;

create policy "conversations: participantes veem"
  on public.conversations for select
  using (public.can_access_conversation(id) or public.is_moderator());
create policy "conversations: admin cria"
  on public.conversations for insert
  with check (public.is_admin());
create policy "conversations: admin edita"
  on public.conversations for update
  using (public.is_admin()) with check (public.is_admin());
create policy "conversations: admin elimina"
  on public.conversations for delete
  using (public.is_admin());

create policy "conversation_members: participantes veem"
  on public.conversation_members for select
  using (public.can_access_conversation(conversation_id) or public.is_moderator());
create policy "conversation_members: o próprio atualiza leitura"
  on public.conversation_members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "conversation_members: admin gere"
  on public.conversation_members for insert
  with check (public.is_admin());
create policy "conversation_members: sair ou admin"
  on public.conversation_members for delete
  using (user_id = auth.uid() or public.is_admin());

create policy "messages: participantes leem (exceto bloqueados)"
  on public.messages for select
  using (
    (public.can_access_conversation(conversation_id) and not public.is_blocked_between(auth.uid(), sender_id))
    or public.is_moderator()
  );
create policy "messages: participantes enviam"
  on public.messages for insert
  with check (sender_id = auth.uid() and public.can_access_conversation(conversation_id));
create policy "messages: autor apaga (soft) ou staff"
  on public.messages for update
  using (sender_id = auth.uid() or public.is_moderator())
  with check (sender_id = auth.uid() or public.is_moderator());
create policy "messages: staff elimina"
  on public.messages for delete
  using (public.is_moderator());

create policy "groups: leitura pública"
  on public.groups for select using (true);
create policy "groups: admin gere"
  on public.groups for all
  using (public.is_admin()) with check (public.is_admin());

create policy "group_members: leitura pública"
  on public.group_members for select using (true);
create policy "group_members: utilizador adere"
  on public.group_members for insert
  with check (user_id = auth.uid() and public.is_active_user());
create policy "group_members: utilizador sai ou admin remove"
  on public.group_members for delete
  using (user_id = auth.uid() or public.is_admin());

create policy "help_requests: leitura pública"
  on public.help_requests for select using (true);
create policy "help_requests: utilizador ativo cria"
  on public.help_requests for insert
  with check (author_id = auth.uid() and public.is_active_user());
create policy "help_requests: autor ou staff edita"
  on public.help_requests for update
  using (author_id = auth.uid() or public.is_moderator())
  with check (author_id = auth.uid() or public.is_moderator());
create policy "help_requests: autor ou staff elimina"
  on public.help_requests for delete
  using (author_id = auth.uid() or public.is_moderator());
